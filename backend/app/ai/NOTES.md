# A2 model evaluation — 30 October 2026

## Decision and scope

Keep `opencv-nlmeans-unsharp-baseline` as the deployed default. Richardson–Lucy
and RealESRGAN x2plus are evaluation candidates, not validated astronomy models.
No pretrained model is qualified for the service. `RESTORE_BACKEND=model` therefore
returns the baseline with an explicit fallback warning. No weights are bundled,
downloaded by a request, or required for normal backend operation.

This is an engineering evaluation on three processed astronomical display images
and a reproducible synthetic field. It is not a test on calibrated telescope
exposures. Candidate detections, pixel sizes and normalized intensities do not
establish star identities, physical sizes or calibrated brightness. Input images
are preserved byte-for-byte. Resizing for benchmarks happens on derived arrays.

## Candidates and licence research

Sources checked 2026-10-30. Only ONE pretrained checkpoint was downloaded/tested.

| Candidate | Code licence | Weights provenance / licence status | Size and hardware |
| --- | --- | --- | --- |
| OpenCV NLMeans + mild unsharp | Apache-2.0, OpenCV | No weights | CPU; Pillow, NumPy, headless OpenCV only |
| Richardson–Lucy, Gaussian PSF | Local implementation using SciPy (BSD-3-Clause) | No weights; assumed sigma 1 pixel, 10 iterations | CPU; optional SciPy |
| RealESRGAN x2plus | [Real-ESRGAN BSD-3-Clause](https://github.com/xinntao/Real-ESRGAN/blob/master/LICENSE); RRDB architecture from [BasicSR Apache-2.0](https://github.com/XPixelGroup/BasicSR/blob/master/LICENSE.txt) | [Official model zoo](https://github.com/xinntao/Real-ESRGAN/blob/master/docs/model_zoo.md), official v0.2.1 checkpoint. Repository licence is BSD-3-Clause; a separate explicit weights licence was not located. Do not represent this as independently confirmed weights licensing or ship the weights. | 67,061,725 bytes (63.96 MiB); PyTorch CPU supported, optional CUDA hardware; 23 RRDB blocks, 64 feature channels |
| SwinIR colour denoising sigma15 (researched, not run) | [Apache-2.0](https://github.com/JingyunLiang/SwinIR/blob/main/LICENSE) | [Official release](https://github.com/JingyunLiang/SwinIR/releases/tag/v0.0); repository Apache-2.0, separate checkpoint-specific terms not located | 122,905,743 bytes (117.21 MiB); PyTorch plus timm architecture dependency; CPU/GPU. Excluded from this time-boxed run; no latency/quality claim |

RealESRGAN download URL:
https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth

SHA256: `49fafd45f8fd7aa8d31ab2a22d14d91b536c34494a5cfe31eb5d89c2fa266abb`.
Stored locally in `backend/app/ai/weights/RealESRGAN_x2plus.pth` (ignored).

SwinIR reference URL (NOT downloaded):
https://github.com/JingyunLiang/SwinIR/releases/download/v0.0/005_colorDN_DFWB_s128w8_SwinIR-M_noise15.pth

`model_eval.py` is an adapted, compact RRDB architecture implementation matching
the official x2plus checkpoint keys, loaded with `strict=True` and
`torch.load(..., weights_only=True)`. It avoids importing BasicSR/torchvision and
does not patch installed packages. Upstream architecture:
https://github.com/XPixelGroup/BasicSR/blob/master/basicsr/archs/rrdbnet_arch.py
The Apache licence is retained in `THIRD_PARTY_LICENSES.txt`. Architecture
adaptations remove the registry/training initialization and add bounded tiles.

## Approved local samples

All three are ESA/Hubble observation images released under
[CC BY 4.0 with attribution](https://esahubble.org/copyright/).
Identifiers below refer to the publishers' images, not identities inferred by our
detector. These are screensize JPEG derivatives, not raw observations.

| Local filename | Source page | Exact download URL | Bytes | Unaltered publisher credit |
| --- | --- | --- | ---: | --- |
| heic1509a.jpg | [Westerlund 2](https://esahubble.org/images/heic1509a/) | https://cdn.esahubble.org/archives/images/screen/heic1509a.jpg | 327770 | NASA, ESA, the Hubble Heritage Team (STScI/AURA), A. Nota (ESA/STScI), and the Westerlund 2 Science Team |
| heic2007a.jpg | [Tapestry of Blazing Starbirth](https://esahubble.org/images/heic2007a/) | https://cdn.esahubble.org/archives/images/screen/heic2007a.jpg | 273025 | NASA, ESA, and STScI |
| heic0910e.jpg | [Carina visible image](https://esahubble.org/images/heic0910e/) | https://cdn.esahubble.org/archives/images/screen/heic0910e.jpg | 212257 | NASA, ESA and the Hubble SM4 ERO Team |

Input SHA256 hashes:

```text
heic1509a 89c271d9683794f9aa3f256ae718a1b036928a634cd846e81855a6b64dc462df
heic2007a a1e2d374967945a77aabe89e9b4d2f4c1de72bcd31c3b9060bf8ef1a5ea2724c
heic0910e 5ae5970b1ad8b13f1cc5422925aeb805f642e139716ea737c134844b993eb699
```

Any shared preview must display the corresponding credit above and state:
"Original image resized and algorithmically enhanced for evaluation by Tsukuyomi
Watch; candidate features may be artefacts." Local comparisons are not a
publication or a scientific measurement. Samples and outputs remain ignored.

## Reproduction

Run from repository root using Python 3.11/3.12. Actual environment: Python
3.12.10, Pillow 13.0.0, NumPy 2.5.4, OpenCV 5.0.0, SciPy 1.18.1,
torch 2.15.0+cpu, torchvision 0.29.2+cpu, pytest 9.2.0.

Only install/download after human approval. Optional CPU installation command
(kept here, deliberately NOT in requirements-ai.txt):

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-ai.txt
.\.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
.\.venv\Scripts\python.exe -m pytest backend/app/ai
.\.venv\Scripts\python.exe -m backend.app.ai.benchmark --methods baseline rl realesrgan --size 1024 --repeats 2 --timeout 120 --output backend/app/ai/outputs/my-new-run
```

Place the three approved samples under `ai/samples/` and the approved checkpoint
at the path above. Alternatively pass `--samples <file1> <file2> <file3>` and
`--weights <local-path>`. The script never downloads. Each output directory must
be new, under `backend/app/ai/outputs/`; existing files are not overwritten.
The original bytes are hashed, read-only, and never rewritten. Each method/case
runs in a fresh subprocess; the parent terminates a case exceeding the timeout
and records it as a timeout, never as a valid timing. Errors are recorded too.
Default methods require only baseline plus optional SciPy; `--methods baseline`
works without either SciPy or torch. Each run adds a seeded synthetic field.

JSON includes input hash, image dimensions, import/load duration, individual
inference times, OS peak process RSS, candidate changes and synthetic-only PSNR.
PNG comparison panels and JSON are saved only under ignored outputs. Actual final
run: `backend/app/ai/outputs/a2-final-1024/results.json`. Earlier exploratory runs
are not used for final latency conclusions (some overlapped on the CPU).

## Method and hardware

Windows 11, AMD Ryzen 7 7840HS (8 cores/16 logical processors), about 15.29 GiB
physical RAM. Four OpenCV and PyTorch CPU threads. Laptop thermals/power and other
programs can affect results. Final cases run sequentially, two calls per case.
The first includes first-use initialization; the second reuses the loaded model.
No benchmark was run concurrently with another final benchmark case.

An NVIDIA RTX 4050 Laptop GPU with 6141 MiB was detected, but the approved
installation is CPU-only PyTorch (`torch.cuda.is_available()` is false).
GPU timings are NOT measured. No additional CUDA install was requested because
the model already fails qualification on candidate stability and unresolved
weights terms; faster GPU inference would not resolve those issues. A demo-day
GPU is not assumed or guaranteed.

Images retain aspect ratio, with longest side capped at 1024 (no upsampling).
The synthetic case is exactly 1024x1024. Source images are 1024x591, 1024x767,
1024x703 respectively for heic0910e, heic1509a, heic2007a in the benchmark.
RL uses reflect boundary conditions and processes colour channels independently.
RealESRGAN runs FP32, 128-pixel tiles with 16-pixel context, even-dimension padding,
then area-downsamples the 2x prediction to the input dimensions. This is the
evaluated wrapper, not a claim about untiled upstream performance. Tiling may
introduce seams and the context is not its complete receptive field.

Runtime excludes PNG decode/encode and detection scoring; model load is separate.
Peak memory is OS high-water resident memory for each fresh worker, including
libraries, inputs and model; it is NOT isolated tensor memory or Python-only
tracemalloc. The final memory reading is before scoring/PNG encoding. SciPy is
imported within the first RL call, included in that first inference timing.

## Scientific and service safeguards

`restore_image(data: bytes) -> dict`, `detect_sources(data: bytes) -> dict`, and
`ImageValidationError` retain the PLAYBOOK interface. The original warning strings
remain exact:

> Restored image is an algorithmic enhancement, not new data. Features may be artefacts.

> Detections are candidates, not confirmed astronomical objects.

`RESTORE_BACKEND` defaults to `baseline`. `model` calls the lazy, locked singleton;
load failures are cached until process restart. Inference errors, wrong shape or
dtype trigger baseline fallback. Input copies prevent failed models mutating the
baseline's pixels. Unknown backend names also fall back with a warning. No service
request writes files or downloads anything. `MODEL_QUALIFIED=False` deliberately
blocks experimental checkpoint use in the service. Future qualification would
also require local `RESTORE_MODEL_PATH`, with no network fetch.

The benchmark matches candidates one-to-one within 2 pixels. Counts are capped at
200 by the fixed detector; when this cap is reached, membership can change merely
because ranking changed. Even uncapped changes can be caused by adaptive threshold
changes, centroids, contrast or noise, not actual new stars. These measurements
cannot certify that a model invents no astronomical features. No ground-truth
star catalogue exists for these display-image tests.

An important observed limitation: the restored synthetic baseline field can
produce many extra detections because denoising changes the residual MAD and hence
the detector threshold. Do not run the detector on enhanced output as if it were
new evidence. Continue submitting the original upload to `detect_sources`.
Real-image PSNR is not reported: no clean reference exists.

## Results

Final sequential run completed successfully: all 12 cases, no timeout or error.
Times below are first / second inference call in seconds, not HTTP latency.

| Sample (dimensions) | Method | First / second (s) | Load/import (s) | Peak process RSS (MiB) | Input / output candidates | Unmatched input / output |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| heic0910e (1024x591) | baseline | 0.178 / 0.074 | 0.0005 | 55.91 | 200 / 200 | 15 / 15 |
| heic0910e | RL | 1.144 / 0.792 | 0.0005 | 113.63 | 200 / 200 | 129 / 129 |
| heic0910e | RealESRGAN | 24.206 / 23.930 | 1.627 | 455.32 | 200 / 200 | 46 / 46 |
| heic1509a (1024x767) | baseline | 0.177 / 0.092 | 0.0003 | 59.80 | 200 / 200 | 25 / 25 |
| heic1509a | RL | 1.378 / 1.050 | 0.0004 | 127.63 | 200 / 200 | 163 / 163 |
| heic1509a | RealESRGAN | 31.670 / 31.290 | 1.699 | 448.06 | 200 / 200 | 52 / 52 |
| heic2007a (1024x703) | baseline | 0.192 / 0.088 | 0.0006 | 59.03 | 200 / 200 | 28 / 28 |
| heic2007a | RL | 1.394 / 0.974 | 0.0012 | 122.69 | 200 / 200 | 73 / 73 |
| heic2007a | RealESRGAN | 28.469 / 29.229 | 1.739 | 458.32 | 200 / 200 | 62 / 62 |
| synthetic (1024x1024) | baseline | 0.049 / 0.049 | 0.0003 | 82.09 | 3 / 200 | 0 / 197 |
| synthetic | RL | 0.723 / 0.445 | 0.0004 | 94.04 | 3 / 3 | 0 / 0 |
| synthetic | RealESRGAN | 43.229 / 42.629 | 1.640 | 450.16 | 3 / 200 | 0 / 197 |

All real-image candidate counts hit the 200 cap. Unmatched counts are NOT numbers
of physical stars added/removed. To check uncapped behaviour, exploratory 256px
RealESRGAN cases produced input/output counts of 116/122, 125/132, 77/66 for the
three images respectively, with unmatched input/output 19/25, 20/27, 24/13.
Those small-image results also do not establish invariant candidate structure.

Synthetic PSNR against the known clean image: noisy/blurred input 36.401 dB;
baseline 41.659 dB; RL 32.555 dB; RealESRGAN 55.164 dB. This is one deliberately
simple synthetic case, dominated by a flat background. The high model PSNR does
not cancel the extra detections or prove astronomical fidelity. RL amplifies the
noise here despite recovering the three prominent candidate positions.

### Visual assessment

Reviewed side-by-side input/candidate panels for all nine real-image cases.
These observations are qualitative, not a scientific validation:

| Sample | Baseline | RL | RealESRGAN |
| --- | --- | --- | --- |
| heic0910e | Mild smoothing; faint texture reduced; broad structure retained visually | Stronger grain/speckling and sharp dark outlines around bright points | Substantial background smoothing and rounded/flattened small-scale nebular texture; faint points change prominence |
| heic1509a | Smoother diffuse structure, modest bright-core contrast change | Dense bright speckling becomes more pronounced; outlines and texture sharpen strongly | Cluster cores/coloured points become more compact and prominent; diffuse texture is smoothed |
| heic2007a | Fine texture softened slightly; broad arcs remain visible | Pronounced speckling and fine-edge contrast, especially in red nebulosity | Red and blue diffuse texture is smoothed; small-point profiles change |

No claim that any method preserves every source, invents zero stars, or recovers
true missing data is justified. No obvious large tile seam was seen in the
overview panels, but this does not exclude small boundary artefacts.

### Release gates and validation

Final verification: `python -m pytest backend/app/ai` — **42 passed**;
`python -m pip check` — no broken requirements; `git diff --check` — clean.
Sample SHA256 hashes were rechecked after evaluation and are unchanged.

RealESRGAN is NOT promoted: the 1024-square run exceeds 30 seconds on CPU;
candidate stability is not established; checkpoint-specific licensing remains
unconfirmed. GPU acceleration could only address speed. RL is also not promoted
because the assumed PSF, noise amplification and visual changes do not justify
replacing the baseline. Keep both methods available only in the local benchmark.

## A4 input and runtime hardening

The request path accepts only `bytes`, JPEG/PNG data up to 10 MiB, and decoded
images with both sides between 32 and 2048 pixels (at most 4,194,304 pixels).
Format and dimensions are checked from the image header before verification,
full decode, or creation of pixel arrays. This bounds decoded input arrays to
12 MiB for RGB (plus bounded processing intermediates); malformed data,
decompression bombs, and allocation failures are rejected as
`ImageValidationError` without writing uploaded data or temporary files.

The service has a 30-second processing deadline checked after decode and after
the image-processing/encoding stages. OpenCV and other native calls cannot be
interrupted safely in-process, so this is a response deadline, not a hard kill
of a running native operation. The fixed input bounds constrain their work;
hard cancellation would require isolated worker processes.

OpenCV processing and PNG encoding failures surface as clear `RuntimeError`
messages for the API layer to log and map to its standard internal-error
response. An optional model failure still falls back to the baseline and adds
the exact warning below. Original validation errors retain their stable
`ImageValidationError.code` values.

Normal baseline restore and detection need only
`backend/requirements.txt`; SciPy, Astropy, Photutils, torch, and torchvision
are optional. The AI tests exercise both operations in a fresh interpreter
where all of those optional imports are blocked. To reproduce the environment:

```powershell
python -m pip install -r backend/requirements.txt
python -m pytest -p no:cacheprovider backend/app/ai
```

The request services operate in memory. `benchmark.py` is a separate
evaluation tool and writes comparison artifacts only to a new directory under
the ignored `backend/app/ai/outputs/` tree.

Exact service warning strings:

- `Restored image is an algorithmic enhancement, not new data. Features may be artefacts.`
- `Detections are candidates, not confirmed astronomical objects.`
- `16-bit PNG converted to 8-bit for baseline processing; precision is reduced. Original bytes are unchanged.`
- `Transparency composited on black for baseline processing.`
- `Optional model unavailable or not qualified; used the OpenCV baseline.`
- `Unknown RESTORE_BACKEND; used the OpenCV baseline.`
- `Optional Photutils detector unavailable or failed; used the OpenCV detector.`
- `Unknown DETECT_BACKEND; used the OpenCV detector.`

## A3 source-detection comparison

The optional `photutils-daostarfinder` backend uses sigma-clipped background
statistics and maps candidates to the existing response schema. Set
`DETECT_BACKEND=photutils` to opt in; the default remains
`opencv-threshold-centroid`. Photutils and its Astropy/SciPy dependencies are
imported lazily. If the optional detector is unavailable or fails, the service
returns OpenCV candidates with a warning.

The benchmark compared the supplied display-image samples and two synthetic
fields. Coordinates were matched one-to-one within 2 pixels. Runtime is the
median of calls 2 and 3 in each fresh worker; the first Photutils call includes
library import overhead (about 1.1–1.2 seconds). These are local engineering
measurements, not calibrated accuracy or live request latency.

| Sample (dimensions) | OpenCV count | Photutils count | Matched within 2 px | Warm median runtime (OpenCV / Photutils, ms) |
| --- | ---: | ---: | ---: | ---: |
| heic0910e (1280x739) | 200 | 200 | 176 | 47.9 / 281.4 |
| heic1509a (1280x959) | 200 | 200 | 129 | 45.2 / 335.5 |
| heic2007a (1280x879) | 200 | 200 | 161 | 47.6 / 309.2 |
| synthetic (1024x1024) | 3 | 3 | 3 | 36.5 / 194.5 |
| synthetic-restored (1024x1024) | 200 | 51 | 51 | 33.2 / 308.2 |

Both detectors recovered the three known synthetic source positions within
0.11 px. The real-image runs all hit the 200-candidate cap, and no ground-truth
catalogue is available; their matched counts cannot establish which detector is
more accurate. The restored synthetic field is diagnostic only: it shows that
enhancement changes detection counts and must not be treated as new evidence.
Keep OpenCV as the default because it is substantially faster in these runs and
the results do not establish an accuracy benefit for Photutils. The API schema
and original-image input behavior are unchanged.

Tests cover the original service contract, synthetic detection positions,
validation, dimensions, optional-detector fallback and missing dependencies,
candidate limits, singleton initialization under 20 concurrent calls, cached
load failure, inference failure, invalid model output, input preservation,
metadata on success, unknown mode fallback, blocked optional imports in baseline
and unqualified model modes, one-to-one matching, and constant-channel RL behaviour.
Model loader tests use test-only predictors; they do not require downloaded
weights or pretend that a model has passed qualification. The separate benchmark
loaded the actual checkpoint and exercised colour and grayscale images.

No routes, frontend, or shared documentation were edited. The OpenCV detector
remains the default; SciPy, Astropy and Photutils are optional, while core
operation requires only Pillow/NumPy/OpenCV. No samples, weights or output images
belong in the commit.

## A5 demo plan

Use the three approved ESA/Hubble screen-size JPEG derivatives below. Each is
published under CC BY 4.0; show the credit alongside the image and link its
source page. These are display images, not raw observations.

| File | Publisher image | Credit to show |
| --- | --- | --- |
| `heic0910e.jpg` | [Carina visible image](https://esahubble.org/images/heic0910e/) | NASA, ESA and the Hubble SM4 ERO Team |
| `heic1509a.jpg` | [Westerlund 2](https://esahubble.org/images/heic1509a/) | NASA, ESA, the Hubble Heritage Team (STScI/AURA), A. Nota (ESA/STScI), and the Westerlund 2 Science Team |
| `heic2007a.jpg` | [Tapestry of Blazing Starbirth](https://esahubble.org/images/heic2007a/) | NASA, ESA, and STScI |

Suggested flow: start with Carina, upload it, compare the original and the
baseline-restored candidate with the before/after slider, then request source
detection on the original upload and show the candidate overlay. Repeat with
Westerlund 2 if time permits; use Tapestry of Blazing Starbirth as the final
example. Keep the original unchanged. Expect same-size output with a subtle
algorithmic denoise/sharpen change, not new resolution or recovered scientific
detail. Detections are visual candidates only; run detection against the
original, never treat enhanced pixels as new evidence.

Local service timings below were measured on the demo laptop described above
(Windows 11, Ryzen 7 7840HS, CPU-only), using the actual AI service on each
1280-pixel-wide sample, after a warm-up. Values are medians of the next two
calls, end-to-end including decode and PNG encoding for restore. They do not
include browser upload, network, or rendering time; hosted timings will vary.

| Step | heic0910e | heic1509a | heic2007a |
| --- | ---: | ---: | ---: |
| Restore original-size image | 155 ms | 204 ms | 179 ms |
| Detect candidates on original | 48 ms | 63 ms | 58 ms |
| Expected detector result (`opencv-threshold-centroid`) | 200 candidates (cap reached) | 200 candidates (cap reached) | 200 candidates (cap reached) |

The first restore call in a fresh process measured 275 ms, 199 ms and 177 ms,
respectively. These measurements are for planning, not latency guarantees. All
three detections reach the API's 200-candidate cap; counts do not represent
confirmed astronomical objects. On the synthetic known-truth field the baseline
restorer produced 200 candidates, so do not promise a fixed detection count on
restored images.

### Local fallback if the hosted backend is slow or unavailable

From a fresh clone, install only the baseline backend dependencies, start the
API locally with the explicit baseline detector settings, and point the
frontend at `http://127.0.0.1:8000`:

```powershell
python -m pip install -r backend/requirements.txt
$env:RESTORE_BACKEND = "baseline"
$env:DETECT_BACKEND = "opencv"
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In another terminal, install and run the frontend with its API base URL set to
the local backend:

```powershell
cd frontend
npm ci
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
$env:VITE_USE_MOCK = "false"
npm run dev -- --host 127.0.0.1
```

Keep the sample images on the demo machine; do not commit them or generated
outputs. If the hosted API is merely slow, switch to the local API rather than
waiting on it. If local startup or upload also fails, show the original and use
the pre-recorded measured timings above only as clearly labelled local
evaluation results, not as live output.

### Fresh-clone baseline verification

Verified from a fresh local clone using a new Python 3.12 virtual environment
with only `backend/requirements.txt` installed. A generated 96x96 synthetic
star field restored to a 96x96 PNG with
`opencv-nlmeans-unsharp-baseline`; original-image detection returned three
candidate sources with `opencv-threshold-centroid`. No Photutils, Astropy,
SciPy, torch, or torchvision package was installed or imported. The approved
sample JPEGs remain ignored and are not needed to exercise baseline operation.
