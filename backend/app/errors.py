import logging
from typing import Any
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("tsukuyomi.errors")


class APIError(Exception):
    """Base exception for application-specific API errors."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


STATUS_CODE_TO_CODE = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    413: "file_too_large",
    415: "unsupported_type",
    422: "invalid_parameter",
    429: "rate_limited",
    500: "internal_error",
    501: "not_implemented",
    502: "upstream_unavailable",
}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = exc.errors()
        messages: list[str] = []
        for err in errors:
            loc = " -> ".join(str(part) for part in err.get("loc", []))
            msg = err.get("msg", "Invalid value")
            messages.append(f"{loc}: {msg}" if loc else msg)
        error_message = "; ".join(messages) if messages else "Invalid parameter"
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "invalid_parameter", "message": error_message}},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        if isinstance(exc.detail, dict):
            if "code" in exc.detail and "message" in exc.detail:
                return JSONResponse(
                    status_code=exc.status_code,
                    content={"error": exc.detail},
                )
            if "error" in exc.detail and isinstance(exc.detail["error"], dict):
                return JSONResponse(
                    status_code=exc.status_code,
                    content=exc.detail,
                )
        code = STATUS_CODE_TO_CODE.get(exc.status_code, "http_error")
        message = str(exc.detail) if exc.detail else "An HTTP error occurred."
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": code, "message": message}},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled server exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "An unexpected internal server error occurred.",
                }
            },
        )

