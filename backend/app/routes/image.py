from fastapi import APIRouter, File, UploadFile
from backend.app.errors import APIError
from backend.app.schemas import (
    DetectSourcesResponse,
    ErrorResponse,
    RestoreResponse,
)

router = APIRouter(tags=["image"])


@router.post(
    "/api/restore",
    response_model=RestoreResponse,
    responses={501: {"model": ErrorResponse}},
)
async def restore_image_stub(file: UploadFile = File(None)) -> RestoreResponse:
    raise APIError(
        status_code=501,
        code="not_implemented",
        message="Endpoint /api/restore is not implemented yet.",
    )


@router.post(
    "/api/detect-objects",
    response_model=DetectSourcesResponse,
    responses={501: {"model": ErrorResponse}},
)
async def detect_objects_stub(file: UploadFile = File(None)) -> DetectSourcesResponse:
    raise APIError(
        status_code=501,
        code="not_implemented",
        message="Endpoint /api/detect-objects is not implemented yet.",
    )
