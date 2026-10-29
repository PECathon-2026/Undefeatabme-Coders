"""Reproducible local A2 evaluation; never downloads or overwrites originals.

Run from repo root: python -m backend.app.ai.benchmark --help
Each case runs in a fresh process with a timeout and separate output directory.
"""

import argparse
import ctypes
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import sys
import textwrap
from time import perf_counter

import cv2
import numpy as np
from PIL import Image, ImageDraw

from .detect import detect
from .validation import validate_image

ROOT = Path(__file__).resolve().parent
SAMPLE_CREDITS = {
    "heic0910e": "NASA, ESA and the Hubble SM4 ERO Team",
    "heic1509a": "NASA, ESA, the Hubble Heritage Team (STScI/AURA), A. Nota (ESA/STScI), and the Westerlund 2 Science Team",
    "heic2007a": "NASA, ESA, and STScI",
    "synthetic": "Synthetic test field generated with NumPy; not an observation.",
}


def comparison_panel(pixels, candidate, sample):
    width, height = pixels.shape[1], pixels.shape[0]
    credit = SAMPLE_CREDITS.get(sample, "User-supplied image; consult original source for attribution and licence.")
    caption = "Original image resized and algorithmically enhanced for evaluation by Tsukuyomi Watch; candidate features may be artefacts."
    lines = textwrap.wrap(credit + " | " + caption, max(20, (width*2-16)//6))
    panel = Image.new("RGB", (width*2, height+30+16*len(lines)), "#171717")
    panel.paste(Image.fromarray(pixels).convert("RGB"), (0, 24))
    panel.paste(Image.fromarray(candidate).convert("RGB"), (width, 24))
    draw = ImageDraw.Draw(panel)
    draw.text((8, 6), "Input", fill="white")
    draw.text((width+8, 6), "Candidate enhancement", fill="white")
    for index, line in enumerate(lines):
        draw.text((8, height+28+16*index), line, fill="white")
    return panel


def peak_memory_mib():
    """OS process high-water resident memory, including native allocations."""
    if sys.platform == "win32":
        from ctypes import wintypes

        class Counters(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("faults", wintypes.DWORD)] + [
                (name, ctypes.c_size_t) for name in
                ("peak_rss", "rss", "peak_paged", "paged", "peak_nonpaged", "nonpaged", "pagefile", "peak_pagefile")]

        counters = Counters()
        counters.cb = ctypes.sizeof(counters)
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        psapi = ctypes.WinDLL("psapi", use_last_error=True)
        kernel.GetCurrentProcess.restype = wintypes.HANDLE
        psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
        if not psapi.GetProcessMemoryInfo(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
            raise ctypes.WinError(ctypes.get_last_error())
        return round(counters.peak_rss / 1024**2, 2)
    import resource
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return round(peak / (1024**2 if sys.platform == "darwin" else 1024), 2)


def candidate_changes(before, after, tolerance=2.0):
    """Greedy one-to-one spatial matches; NOT evidence of real star changes."""
    pairs = sorted((np.hypot(a["x"] - b["x"], a["y"] - b["y"]), i, j)
                   for i, a in enumerate(before) for j, b in enumerate(after))
    used_before, used_after = set(), set()
    for distance, i, j in pairs:
        if distance <= tolerance and i not in used_before and j not in used_after:
            used_before.add(i)
            used_after.add(j)
    return {"before": len(before), "after": len(after), "matched_within_2px": len(used_before),
            "unmatched_input_candidates": len(before) - len(used_before),
            "unmatched_output_candidates": len(after) - len(used_after),
            "detector_cap_reached": len(before) == 200 or len(after) == 200}


def synthetic(size):
    rng = np.random.default_rng(2026)
    y, x = np.mgrid[:size, :size]
    clean = np.full((size, size), 0.08, np.float32)
    for cx, cy, amplitude in [(0.2, 0.3, 0.8), (0.55, 0.5, 0.6), (0.8, 0.75, 0.4)]:
        clean += amplitude * np.exp(-((x-cx*size)**2 + (y-cy*size)**2)/(2*2.0**2))
    noisy = cv2.GaussianBlur(clean, (0, 0), 1.0) + rng.normal(0, 0.015, clean.shape)
    return np.rint(np.clip(noisy, 0, 1)*255).astype(np.uint8), np.rint(clean*255).astype(np.uint8)


def worker(args):
    cv2.setNumThreads(4)
    reference = None
    if args.sample == "synthetic":
        pixels, reference = synthetic(args.size)
        input_hash = hashlib.sha256(pixels.tobytes()).hexdigest()
    else:
        data = Path(args.sample).read_bytes()
        input_hash = hashlib.sha256(data).hexdigest()
        pixels, _ = validate_image(data)
        scale = min(1.0, args.size / max(pixels.shape[:2]))
        if scale < 1:
            pixels = cv2.resize(pixels, (round(pixels.shape[1]*scale), round(pixels.shape[0]*scale)), interpolation=cv2.INTER_AREA)
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=False)
    started = perf_counter()
    if args.method == "baseline":
        from .restore_baseline import restore
    elif args.method == "rl":
        from .restore_rl import restore
    else:
        from .model_eval import create_predictor
        restore = create_predictor(args.weights, args.device)
    load_ms = (perf_counter() - started) * 1000
    times = []
    for _ in range(args.repeats):
        started = perf_counter()
        output = restore(pixels.copy())
        if args.device == "cuda" and args.method == "realesrgan":
            import torch
            torch.cuda.synchronize()
        times.append(round((perf_counter() - started)*1000, 2))
    peak = peak_memory_mib()
    assert output.shape == pixels.shape and output.dtype == np.uint8
    changes = candidate_changes(detect(pixels), detect(output))
    result = {"sample": Path(args.sample).stem, "sha256": input_hash, "method": args.method,
              "device": args.device if args.method == "realesrgan" else "cpu",
              "width": pixels.shape[1], "height": pixels.shape[0], "load_ms": round(load_ms, 2),
              "runtime_ms": times, "peak_process_rss_mib": peak, "candidates": changes,
              "mean_absolute_change_0_1": round(float(np.abs(output.astype(float)-pixels).mean()/255), 6),
              "python": platform.python_version(), "platform": platform.platform(),
              "note": "Candidate changes are detector sensitivity, not confirmed star additions/removals."}
    if reference is not None:
        def psnr(image):
            mse = np.mean((image.astype(float)/255-reference.astype(float)/255)**2)
            return round(float(-10*np.log10(max(mse, 1e-12))), 3)
        result["synthetic_input_psnr_db"] = psnr(pixels)
        result["synthetic_output_psnr_db"] = psnr(output)
    Image.fromarray(pixels).save(output_dir / "input.png")
    Image.fromarray(output).save(output_dir / "candidate.png")
    comparison_panel(pixels, output, Path(args.sample).stem).save(output_dir / "comparison.png")
    (output_dir / "result.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", nargs="*", default=[])
    parser.add_argument("--methods", nargs="+", choices=["baseline", "rl", "realesrgan"], default=["baseline", "rl"])
    parser.add_argument("--size", type=int, default=1024, help="Longest image side, aspect ratio retained; synthetic is square")
    parser.add_argument("--repeats", type=int, default=1)
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--weights", default=str(ROOT / "weights" / "RealESRGAN_x2plus.pth"))
    parser.add_argument("--device", choices=["cpu", "cuda"], default="cpu")
    parser.add_argument("--output", required=True, help="New directory under ai/outputs; never overwritten")
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--sample", help=argparse.SUPPRESS)
    parser.add_argument("--method", choices=["baseline", "rl", "realesrgan"], help=argparse.SUPPRESS)
    args = parser.parse_args()
    if not 32 <= args.size <= 2048 or args.repeats < 1 or args.timeout <= 0:
        parser.error("size must be 32..2048, repeats >=1, timeout >0")
    output = Path(args.output).resolve()
    if not output.is_relative_to(ROOT / "outputs") or output == ROOT / "outputs":
        parser.error("Output must be a new subdirectory of backend/app/ai/outputs")
    if output.exists():
        parser.error("Output already exists; choose a fresh run directory")
    if args.worker:
        worker(args)
        return
    samples = args.samples or [str(p) for p in sorted((ROOT / "samples").glob("*.jpg"))]
    if not samples:
        parser.error("No samples found; obtain approved local samples first")
    output.mkdir(parents=True)
    results = []
    for index, sample in enumerate([*samples, "synthetic"]):
        for method in args.methods:
            case = output / f"{index:02d}_{Path(sample).stem}_{method}"
            command = [sys.executable, "-m", "backend.app.ai.benchmark", "--worker", "--sample", sample,
                       "--method", method, "--size", str(args.size), "--repeats", str(args.repeats),
                       "--weights", args.weights, "--device", args.device, "--output", str(case)]
            print(f"Running {Path(sample).stem}: {method} ({args.size}px cap)", flush=True)
            try:
                process = subprocess.run(command, capture_output=True, text=True, timeout=args.timeout)
                if process.returncode:
                    result = {"sample": sample, "method": method, "status": "error", "error": process.stderr[-3000:]}
                else:
                    result = json.loads((case / "result.json").read_text(encoding="utf-8"))
            except subprocess.TimeoutExpired:
                result = {"sample": sample, "method": method, "status": "timeout", "timeout_s": args.timeout}
            results.append(result)
            print(json.dumps(result), flush=True)
            (output / "results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
