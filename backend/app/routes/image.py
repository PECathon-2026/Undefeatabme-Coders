import base64
import logging
import threading
import time
from typing import Any
from fastapi import APIRouter, File, Request, UploadFile
from backend.app.errors import APIError, IMAGE_CODE_TO_STATUS
from backend.app.schemas import (
    CandidateSource,
    DetectSourcesResponse,
    ErrorResponse,
    RestoreResponse,
)

logger = logging.getLogger("tsukuyomi.image")
router = APIRouter(tags=["image"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB hard cap
CHUNK_SIZE = 64 * 1024  # 64 KB chunk size

# In-memory sliding-window rate limiter: 10 requests per minute per client IP
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60.0

_rate_limit_lock = threading.Lock()
_ip_request_timestamps: dict[str, list[float]] = {}


def clear_rate_limiter() -> None:
    """Clear in-memory rate limiter state (used in tests)."""
    with _rate_limit_lock:
        _ip_request_timestamps.clear()


def check_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client and request.client.host else "127.0.0.1"
    now = time.monotonic()
    with _rate_limit_lock:
        timestamps = _ip_request_timestamps.get(client_ip, [])
        valid_timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW_SECONDS]
        if len(valid_timestamps) >= RATE_LIMIT_MAX_REQUESTS:
            _ip_request_timestamps[client_ip] = valid_timestamps
            raise APIError(
                status_code=429,
                code="rate_limited",
                message="Rate limit exceeded. Maximum 10 image requests per minute allowed.",
            )
        valid_timestamps.append(now)
        _ip_request_timestamps[client_ip] = valid_timestamps


def read_upload_capped(file: UploadFile) -> bytes:
    """Read upload into memory with a hard 10 MB cap; stops immediately if exceeded."""
    if not file or not file.file:
        raise APIError(
            status_code=422,
            code="invalid_parameter",
            message="No file uploaded or file field missing.",
        )

    buffer = bytearray()
    while True:
        chunk = file.file.read(CHUNK_SIZE)
        if not chunk:
            break
        buffer.extend(chunk)
        if len(buffer) > MAX_UPLOAD_SIZE:
            raise APIError(
                status_code=413,
                code="file_too_large",
                message="Uploaded file exceeds maximum allowed size of 10 MB.",
            )

    if len(buffer) == 0:
        raise APIError(
            status_code=422,
            code="invalid_image",
            message="Uploaded file is empty.",
        )

    return bytes(buffer)


@router.post(
    "/api/restore",
    response_model=RestoreResponse,
    responses={
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        501: {"model": ErrorResponse},
    },
)
def restore_image_endpoint(
    request: Request,
    file: UploadFile = File(..., description="JPEG or PNG image file up to 10 MB"),
) -> RestoreResponse:
    check_rate_limit(request)

    # 1. Check AI service availability
    try:
        from backend.app.ai.service import ImageValidationError, restore_image
    except ImportError:
        raise APIError(
            status_code=501,
            code="not_implemented",
            message="AI restoration service is not available.",
        )

    # 2. Read with hard 10 MB cap
    data = read_upload_capped(file)

    # 3. Call CPU processing (runs in threadpool)
    try:
        result = restore_image(data)
    except ImageValidationError as exc:
        status_code = IMAGE_CODE_TO_STATUS.get(exc.code, 422)
        raise APIError(status_code=status_code, code=exc.code, message=str(exc))
    except Exception as exc:
        logger.exception("Image restoration failed: %s", exc)
        raise APIError(
            status_code=500,
            code="internal_error",
            message="An unexpected error occurred during image restoration.",
        )

    # 4. Format Data URL and response
    b64_str = base64.b64encode(result["png_bytes"]).decode("ascii")
    data_url = f"data:image/png;base64,{b64_str}"

    return RestoreResponse(
        restored_image=data_url,
        width=result["width"],
        height=result["height"],
        model_name=result["model_name"],
        model_license=result["model_license"],
        runtime_ms=result["runtime_ms"],
        data_kind="computed",
        warnings=result["warnings"],
    )


@router.post(
    "/api/detect-objects",
    response_model=DetectSourcesResponse,
    responses={
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        501: {"model": ErrorResponse},
    },
)
def detect_objects_endpoint(
    request: Request,
    file: UploadFile = File(..., description="JPEG or PNG image file up to 10 MB"),
) -> DetectSourcesResponse:
    check_rate_limit(request)

    # 1. Check AI service availability
    try:
        from backend.app.ai.service import ImageValidationError, detect_sources
    except ImportError:
        raise APIError(
            status_code=501,
            code="not_implemented",
            message="AI candidate source detection service is not available.",
        )

    # 2. Read with hard 10 MB cap
    data = read_upload_capped(file)

    # 3. Call CPU processing (runs in threadpool)
    try:
        result = detect_sources(data)
    except ImageValidationError as exc:
        status_code = IMAGE_CODE_TO_STATUS.get(exc.code, 422)
        raise APIError(status_code=status_code, code=exc.code, message=str(exc))
    except Exception as exc:
        logger.exception("Source detection failed: %s", exc)
        raise APIError(
            status_code=500,
            code="internal_error",
            message="An unexpected error occurred during source detection.",
        )

    # 4. Return DetectSourcesResponse
    candidate_sources = [
        CandidateSource(**s) if isinstance(s, dict) else s for s in result["sources"]
    ]

    return DetectSourcesResponse(
        image_width=result["image_width"],
        image_height=result["image_height"],
        method=result["method"],
        count=result["count"],
        sources=candidate_sources,
        data_kind="computed",
        warnings=result["warnings"],
    )
