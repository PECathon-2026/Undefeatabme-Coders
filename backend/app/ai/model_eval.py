"""Evaluation-only RealESRGAN x2plus adapter; no network or automatic downloads.

Architecture compatibility reference: BasicSR rrdbnet_arch.py (Apache-2.0),
https://github.com/XPixelGroup/BasicSR/blob/master/basicsr/archs/rrdbnet_arch.py
Adapted for evaluation: builds named layers directly, removes BasicSR's registry
and training initialization, adds bounded inference tiles and same-size output.
Upstream BasicSR copyright: Xintao Wang and contributors.
Apache-2.0 licence text is retained in THIRD_PARTY_LICENSES.txt.
See NOTES.md for upstream code/weights provenance and qualification decision.
"""

from pathlib import Path

import cv2
import numpy as np


def create_predictor(weights: str, device: str = "cpu", threads: int = 4):
    import torch
    from torch import nn
    from torch.nn import functional as functional

    path = Path(weights)
    if not path.is_file():
        raise FileNotFoundError("Local RealESRGAN checkpoint required")
    torch.set_num_threads(threads)

    class Dense(nn.Module):
        def __init__(self):
            super().__init__()
            for index in range(5):
                self.add_module(f"conv{index + 1}", nn.Conv2d(64 + 32 * index, 64 if index == 4 else 32, 3, padding=1))

        def forward(self, value):
            features = [value]
            for index in range(1, 6):
                output = getattr(self, f"conv{index}")(torch.cat(features, dim=1))
                if index < 5:
                    features.append(functional.leaky_relu(output, 0.2))
            return value + output * 0.2

    class Residual(nn.Module):
        def __init__(self):
            super().__init__()
            for index in range(1, 4):
                self.add_module(f"rdb{index}", Dense())

        def forward(self, value):
            output = value
            for index in range(1, 4):
                output = getattr(self, f"rdb{index}")(output)
            return value + output * 0.2

    class Network(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv_first = nn.Conv2d(12, 64, 3, padding=1)
            self.body = nn.Sequential(*(Residual() for _ in range(23)))
            for name in ("conv_body", "conv_up1", "conv_up2", "conv_hr"):
                self.add_module(name, nn.Conv2d(64, 64, 3, padding=1))
            self.conv_last = nn.Conv2d(64, 3, 3, padding=1)

        def forward(self, value):
            features = self.conv_first(functional.pixel_unshuffle(value, 2))
            features = features + self.conv_body(self.body(features))
            for name in ("conv_up1", "conv_up2"):
                features = functional.interpolate(features, scale_factor=2, mode="nearest")
                features = functional.leaky_relu(getattr(self, name)(features), 0.2)
            return self.conv_last(functional.leaky_relu(self.conv_hr(features), 0.2))

    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    state = checkpoint.get("params_ema", checkpoint.get("params"))
    if state is None:
        raise ValueError("Expected official params_ema or params checkpoint")
    network = Network()
    network.load_state_dict(state, strict=True)
    network.eval().to(device)

    def predict(pixels):
        height, width = pixels.shape[:2]
        rgb = np.repeat(pixels[..., None], 3, axis=2) if pixels.ndim == 2 else pixels
        # Bounded tiles with context reduce memory. The model's 2x result is
        # area-resampled to original size; no resolution gain is claimed.
        result = np.empty_like(rgb)
        with torch.inference_mode():
            for y in range(0, height, 128):
                for x in range(0, width, 128):
                    end_y, end_x = min(y + 128, height), min(x + 128, width)
                    y0, x0 = max(0, y - 16), max(0, x - 16)
                    y1, x1 = min(height, end_y + 16), min(width, end_x + 16)
                    patch = rgb[y0:y1, x0:x1]
                    patch = np.pad(patch, ((0, patch.shape[0] % 2), (0, patch.shape[1] % 2), (0, 0)), mode="edge")
                    tensor = torch.from_numpy(patch.transpose(2, 0, 1).copy()).float().div_(255).unsqueeze(0).to(device)
                    output = network(tensor).clamp_(0, 1)[0].cpu().numpy().transpose(1, 2, 0)
                    output = cv2.resize(output, (patch.shape[1], patch.shape[0]), interpolation=cv2.INTER_AREA)
                    crop = output[y-y0:end_y-y0, x-x0:end_x-x0]
                    result[y:end_y, x:end_x] = np.rint(crop * 255).astype(np.uint8)
        return cv2.cvtColor(result, cv2.COLOR_RGB2GRAY) if pixels.ndim == 2 else result

    predict.model_name = "realesrgan-x2plus-original-size-evaluation"
    predict.model_license = "BSD-3-Clause (upstream repository; weights-specific terms unconfirmed)"
    return predict
