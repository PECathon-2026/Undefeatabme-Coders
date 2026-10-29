"""Compare candidate detectors on ORIGINAL image coordinates, without downloads."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import textwrap
from time import perf_counter

import cv2
import numpy as np
from PIL import Image, ImageDraw

from .benchmark import ROOT, SAMPLE_CREDITS, candidate_changes, peak_memory_mib, synthetic
from .validation import validate_image


def worker(sample, detector, output):
    cv2.setNumThreads(4)
    truth = None
    if sample.startswith("synthetic"):
        pixels, _ = synthetic(1024)
        truth = [{"x": x*1024, "y": y*1024} for x, y in [(0.2, 0.3), (0.55, 0.5), (0.8, 0.75)]]
        if sample == "synthetic-restored":
            from .restore_baseline import restore
            pixels = restore(pixels)
        digest = hashlib.sha256(pixels.tobytes()).hexdigest()
    else:
        data = Path(sample).read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        pixels, _ = validate_image(data)
    # Import of actual optional dependencies occurs on its first call.
    if detector == "photutils":
        from .detect_photutils import detect
    else:
        from .detect import detect
    timings = []
    for _ in range(3):
        start = perf_counter()
        sources = detect(pixels)
        timings.append(round((perf_counter()-start)*1000, 3))
    record = {"sample": Path(sample).stem, "sha256": digest, "detector": detector,
              "width": pixels.shape[1], "height": pixels.shape[0], "runtime_ms": timings,
              "peak_process_rss_mib": peak_memory_mib(), "count": len(sources),
              "sources": sources, "cap_reached": len(sources) == 200}
    if truth is not None:
        record["against_synthetic_truth"] = candidate_changes(truth, sources)
        record["truth_nearest_error_px"] = [
            round(min(np.hypot(t["x"]-s["x"], t["y"]-s["y"]) for s in sources), 5)
            if sources else None for t in truth
        ]
    output.mkdir(parents=True, exist_ok=False)
    (output / "result.json").write_text(json.dumps(record, indent=2, allow_nan=False), encoding="utf-8")
    # Overlay is only a review artefact. Source bytes are never rewritten.
    width, height = pixels.shape[1], pixels.shape[0]
    credit = ("Synthetic test field; not an observation." if sample.startswith("synthetic") else
              SAMPLE_CREDITS.get(Path(sample).stem, "User-supplied image; consult original source for attribution and licence."))
    lines = textwrap.wrap(credit, max(20, (width-16)//6))
    overlay = Image.new("RGB", (width, height+30+16*len(lines)), "#171717")
    overlay.paste(Image.fromarray(pixels).convert("RGB"), (0, 24))
    draw = ImageDraw.Draw(overlay)
    draw.text((8, 6), f"{detector}: {len(sources)} candidates, not confirmed objects", fill="white")
    for source in sources:
        x, y = source["x"], source["y"]+24
        draw.ellipse((x-5, y-5, x+5, y+5), outline="#ffe54f", width=1)
    for index, line in enumerate(lines):
        draw.text((8, height+28+16*index), line, fill="white")
    overlay.save(output / "candidates.png")
    print(json.dumps({key: value for key, value in record.items() if key != "sources"}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--samples", nargs="*")
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--sample", help=argparse.SUPPRESS)
    parser.add_argument("--detector", choices=["opencv", "photutils"], help=argparse.SUPPRESS)
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to(ROOT / "outputs") or output == ROOT / "outputs" or output.exists():
        parser.error("Choose a NEW subdirectory under backend/app/ai/outputs")
    if args.worker:
        worker(args.sample, args.detector, output)
        return
    samples = args.samples or [str(path) for path in sorted((ROOT / "samples").glob("*.jpg"))]
    if not samples:
        parser.error("Approved local samples are required")
    output.mkdir(parents=True)
    records, comparisons = [], []
    for index, sample in enumerate([*samples, "synthetic", "synthetic-restored"]):
        pair = []
        for detector in ("opencv", "photutils"):
            case = output / f"{index:02d}_{Path(sample).stem}_{detector}"
            print(f"Running {Path(sample).stem}: {detector}", flush=True)
            process = subprocess.run([sys.executable, "-m", "backend.app.ai.detection_benchmark", "--worker",
                                      "--sample", sample, "--detector", detector, "--output", str(case)],
                                     text=True, capture_output=True, timeout=120)
            if process.returncode:
                raise RuntimeError(process.stderr)
            print(process.stdout, end="", flush=True)
            record = json.loads((case / "result.json").read_text(encoding="utf-8"))
            pair.append(record)
            records.append(record)
        comparison = {"sample": Path(sample).stem, "opencv_vs_photutils": candidate_changes(pair[0]["sources"], pair[1]["sources"])}
        comparisons.append(comparison)
        print(json.dumps(comparison), flush=True)
        (output / "results.json").write_text(json.dumps({"runs": records, "comparisons": comparisons}, indent=2, allow_nan=False), encoding="utf-8")


if __name__ == "__main__":
    main()
