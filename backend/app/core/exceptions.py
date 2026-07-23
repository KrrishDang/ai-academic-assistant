"""Application-wide API exception handlers."""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _error_response(status_code: int, detail: Any) -> JSONResponse:
    """Return the standard API error envelope."""
    message = detail if isinstance(detail, str) else "The request could not be processed."
    return JSONResponse(status_code=status_code, content={"detail": message})


async def handle_http_exception(
    _request: Request, exception: StarletteHTTPException
) -> JSONResponse:
    """Serialize expected HTTP errors using one response shape."""
    return _error_response(exception.status_code, exception.detail)


async def handle_validation_error(
    _request: Request, exception: RequestValidationError
) -> JSONResponse:
    """Avoid leaking internal validation structure to API consumers."""
    logger.info("Request validation failed: %s", exception.errors())
    return _error_response(status.HTTP_422_UNPROCESSABLE_ENTITY, "The request data is invalid.")


async def handle_unexpected_error(_request: Request, exception: Exception) -> JSONResponse:
    """Log unexpected failures and return a safe generic response."""
    logger.exception("Unhandled application error", exc_info=exception)
    return _error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "An unexpected server error occurred.",
    )


def register_exception_handlers(application: FastAPI) -> None:
    """Register all shared API exception handlers."""
    application.add_exception_handler(StarletteHTTPException, handle_http_exception)
    application.add_exception_handler(RequestValidationError, handle_validation_error)
    application.add_exception_handler(Exception, handle_unexpected_error)
