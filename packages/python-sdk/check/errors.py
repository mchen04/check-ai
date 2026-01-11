"""
Check SDK Errors
Custom exception classes for the Check API
"""

from typing import Any, Dict, Optional, Type


class CheckError(Exception):
    """Base error class for all Check errors."""

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code or "UNKNOWN_ERROR"
        self.status = status
        self.request_id = request_id
        self.details = details or {}

    def __str__(self) -> str:
        parts = [self.message]
        if self.code:
            parts.append(f"[{self.code}]")
        if self.request_id:
            parts.append(f"(request_id: {self.request_id})")
        return " ".join(parts)

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"message={self.message!r}, "
            f"code={self.code!r}, "
            f"status={self.status!r}, "
            f"request_id={self.request_id!r})"
        )


class AuthenticationError(CheckError):
    """
    Authentication error (401).
    Thrown when API key is missing, invalid, or expired.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code=code or "AUTHENTICATION_ERROR",
            status=status or 401,
            request_id=request_id,
            details=details,
        )


class AuthorizationError(CheckError):
    """
    Authorization error (403).
    Thrown when API key lacks permission for the requested operation.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code=code or "AUTHORIZATION_ERROR",
            status=status or 403,
            request_id=request_id,
            details=details,
        )


class ValidationError(CheckError):
    """
    Validation error (400).
    Thrown when request parameters are invalid.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code=code or "VALIDATION_ERROR",
            status=status or 400,
            request_id=request_id,
            details=details,
        )


class NotFoundError(CheckError):
    """
    Not found error (404).
    Thrown when requested resource doesn't exist.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code=code or "NOT_FOUND",
            status=status or 404,
            request_id=request_id,
            details=details,
        )


class RateLimitError(CheckError):
    """
    Rate limit error (429).
    Thrown when rate limit is exceeded.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None,
    ) -> None:
        super().__init__(
            message,
            code=code or "RATE_LIMIT",
            status=status or 429,
            request_id=request_id,
            details=details,
        )
        self.retry_after = retry_after


class QuotaExceededError(CheckError):
    """
    Quota exceeded error (402).
    Thrown when monthly verification quota is exceeded.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code=code or "QUOTA_EXCEEDED",
            status=status or 402,
            request_id=request_id,
            details=details,
        )


class TimeoutError(CheckError):
    """
    Timeout error.
    Thrown when request or polling times out.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code=code or "TIMEOUT",
            status=status,
            request_id=request_id,
            details=details,
        )


class ServerError(CheckError):
    """
    Server error (5xx).
    Thrown when the API experiences an internal error.
    """

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        request_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            message,
            code=code or "SERVER_ERROR",
            status=status or 500,
            request_id=request_id,
            details=details,
        )


def get_error_class(code: Optional[str], status: Optional[int]) -> Type[CheckError]:
    """Get the appropriate error class based on error code or status."""

    # Check by code first
    code_mapping: Dict[str, Type[CheckError]] = {
        "AUTHENTICATION_ERROR": AuthenticationError,
        "AUTHORIZATION_ERROR": AuthorizationError,
        "VALIDATION_ERROR": ValidationError,
        "NOT_FOUND": NotFoundError,
        "RATE_LIMIT": RateLimitError,
        "QUOTA_EXCEEDED": QuotaExceededError,
        "TIMEOUT": TimeoutError,
    }

    if code and code in code_mapping:
        return code_mapping[code]

    # Fall back to status code
    status_mapping: Dict[int, Type[CheckError]] = {
        400: ValidationError,
        401: AuthenticationError,
        402: QuotaExceededError,
        403: AuthorizationError,
        404: NotFoundError,
        429: RateLimitError,
        500: ServerError,
        502: ServerError,
        503: ServerError,
        504: ServerError,
    }

    if status and status in status_mapping:
        return status_mapping[status]

    return CheckError
