"""Decode bounded JPEG/PNG uploads without modifying or storing originals."""

from io import BytesIO

import numpy as np
from PIL import Image, UnidentifiedImageError

MAX_BYTES = 10 * 1024 * 1024
MAX_SIDE = 2048
MAX_PIXELS = MAX_SIDE * MAX_SIDE
Image.MAX_IMAGE_PIXELS = MAX_PIXELS * 2


class ImageValidationError(ValueError):
    """Validation failure with a stable code consumed by backend routes."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def validate_image(data: bytes) -> tuple[np.ndarray, list[str]]:
    if not isinstance(data, bytes):
        raise ImageValidationError("invalid_image", "Image data must be bytes.")
    if len(data) > MAX_BYTES:
        raise ImageValidationError("file_too_large", "Image exceeds the 10 MB limit.")
    if data.startswith(b"SIMPLE  =") or data.startswith(b"XTENSION="):
        raise ImageValidationError("unsupported_type", "FITS is not supported; use JPEG or PNG.")
    notices = []
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in {"JPEG", "PNG"}:
                raise ImageValidationError("unsupported_type", "Only JPEG and PNG are supported.")
            width, height = image.size
            if (
                any(side < 32 or side > MAX_SIDE for side in image.size)
                or width * height > MAX_PIXELS
            ):
                raise ImageValidationError("image_too_large", "Each image side must be 32 to 2048 pixels.")
            image.verify()
        with Image.open(BytesIO(data)) as image:
            image.load()
            # PNG IHDR bit depth also identifies 16-bit RGB, which Pillow
            # decodes to 8-bit channels. Never silently hide that conversion.
            sixteen_bit = image.format == "PNG" and data[24:25] == b"\x10"
            if sixteen_bit:
                notices.append("16-bit PNG converted to 8-bit for baseline processing; precision is reduced. Original bytes are unchanged.")
            if image.mode in {"I", "I;16", "I;16B", "I;16L"}:
                pixels = np.asarray(image, dtype=np.float32)
                pixels = np.rint(np.clip(pixels, 0, 65535) / 257).astype(np.uint8)
            elif image.mode in {"1", "L"}:
                pixels = np.array(image.convert("L"))
            else:
                if "A" in image.getbands() or "transparency" in image.info:
                    notices.append("Transparency composited on black for baseline processing.")
                    rgba = image.convert("RGBA")
                    background = Image.new("RGBA", image.size, (0, 0, 0, 255))
                    image = Image.alpha_composite(background, rgba)
                pixels = np.array(image.convert("RGB"))
    except ImageValidationError:
        raise
    except Image.DecompressionBombError as exc:
        raise ImageValidationError("image_too_large", "Image exceeds the safe pixel limit.") from exc
    except MemoryError as exc:
        raise ImageValidationError("image_too_large", "Image exceeds the safe memory limit.") from exc
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise ImageValidationError("invalid_image", "File is not a valid JPEG or PNG image.") from exc
    return pixels, notices
