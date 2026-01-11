"""Tests for Check errors."""

import pytest
from check.errors import (
    CheckError,
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
    QuotaExceededError,
    TimeoutError,
    ServerError,
    get_error_class,
)


class TestCheckError:
    """Test base error class."""

    def test_error_with_message(self):
        """Should create error with message."""
        error = CheckError("Test error")
        assert str(error).startswith("Test error")
        assert error.message == "Test error"

    def test_error_with_code(self):
        """Should include error code."""
        error = CheckError("Test", code="TEST_CODE")
        assert error.code == "TEST_CODE"
        assert "[TEST_CODE]" in str(error)

    def test_error_with_status(self):
        """Should include HTTP status."""
        error = CheckError("Test", status=400)
        assert error.status == 400

    def test_error_with_request_id(self):
        """Should include request ID."""
        error = CheckError("Test", request_id="req_123")
        assert error.request_id == "req_123"
        assert "req_123" in str(error)

    def test_error_with_details(self):
        """Should include details."""
        error = CheckError("Test", details={"field": "content"})
        assert error.details == {"field": "content"}

    def test_default_code(self):
        """Should have default code UNKNOWN_ERROR."""
        error = CheckError("Test")
        assert error.code == "UNKNOWN_ERROR"

    def test_repr(self):
        """Should have proper repr."""
        error = CheckError("Test", code="TEST", status=400, request_id="req_123")
        repr_str = repr(error)
        assert "CheckError" in repr_str
        assert "Test" in repr_str
        assert "TEST" in repr_str


class TestAuthenticationError:
    """Test authentication error."""

    def test_default_code(self):
        """Should have default code AUTHENTICATION_ERROR."""
        error = AuthenticationError("Invalid key")
        assert error.code == "AUTHENTICATION_ERROR"

    def test_default_status(self):
        """Should have default status 401."""
        error = AuthenticationError("Invalid key")
        assert error.status == 401

    def test_is_check_error(self):
        """Should be instance of CheckError."""
        error = AuthenticationError("Invalid key")
        assert isinstance(error, CheckError)
        assert isinstance(error, Exception)


class TestAuthorizationError:
    """Test authorization error."""

    def test_default_code(self):
        """Should have default code AUTHORIZATION_ERROR."""
        error = AuthorizationError("Permission denied")
        assert error.code == "AUTHORIZATION_ERROR"

    def test_default_status(self):
        """Should have default status 403."""
        error = AuthorizationError("Permission denied")
        assert error.status == 403


class TestValidationError:
    """Test validation error."""

    def test_default_code(self):
        """Should have default code VALIDATION_ERROR."""
        error = ValidationError("Invalid input")
        assert error.code == "VALIDATION_ERROR"

    def test_default_status(self):
        """Should have default status 400."""
        error = ValidationError("Invalid input")
        assert error.status == 400

    def test_with_details(self):
        """Should include validation details."""
        error = ValidationError(
            "Invalid input",
            details={"field": "content", "reason": "required"},
        )
        assert error.details == {"field": "content", "reason": "required"}


class TestNotFoundError:
    """Test not found error."""

    def test_default_code(self):
        """Should have default code NOT_FOUND."""
        error = NotFoundError("Resource not found")
        assert error.code == "NOT_FOUND"

    def test_default_status(self):
        """Should have default status 404."""
        error = NotFoundError("Resource not found")
        assert error.status == 404


class TestRateLimitError:
    """Test rate limit error."""

    def test_default_code(self):
        """Should have default code RATE_LIMIT."""
        error = RateLimitError("Rate limit exceeded")
        assert error.code == "RATE_LIMIT"

    def test_default_status(self):
        """Should have default status 429."""
        error = RateLimitError("Rate limit exceeded")
        assert error.status == 429

    def test_retry_after(self):
        """Should include retry_after."""
        error = RateLimitError("Rate limit exceeded", retry_after=30)
        assert error.retry_after == 30

    def test_retry_after_none_by_default(self):
        """Should have None retry_after by default."""
        error = RateLimitError("Rate limit exceeded")
        assert error.retry_after is None


class TestQuotaExceededError:
    """Test quota exceeded error."""

    def test_default_code(self):
        """Should have default code QUOTA_EXCEEDED."""
        error = QuotaExceededError("Quota exceeded")
        assert error.code == "QUOTA_EXCEEDED"

    def test_default_status(self):
        """Should have default status 402."""
        error = QuotaExceededError("Quota exceeded")
        assert error.status == 402


class TestTimeoutError:
    """Test timeout error."""

    def test_default_code(self):
        """Should have default code TIMEOUT."""
        error = TimeoutError("Request timed out")
        assert error.code == "TIMEOUT"

    def test_no_default_status(self):
        """Should not have default status."""
        error = TimeoutError("Request timed out")
        assert error.status is None

    def test_with_details(self):
        """Should include timeout details."""
        error = TimeoutError(
            "Request timed out",
            details={"verification_id": "ver_123", "last_status": "processing"},
        )
        assert error.details["verification_id"] == "ver_123"


class TestServerError:
    """Test server error."""

    def test_default_code(self):
        """Should have default code SERVER_ERROR."""
        error = ServerError("Internal error")
        assert error.code == "SERVER_ERROR"

    def test_default_status(self):
        """Should have default status 500."""
        error = ServerError("Internal error")
        assert error.status == 500


class TestGetErrorClass:
    """Test error class resolution."""

    def test_by_code_authentication(self):
        """Should resolve AUTHENTICATION_ERROR to AuthenticationError."""
        assert get_error_class("AUTHENTICATION_ERROR", None) == AuthenticationError

    def test_by_code_authorization(self):
        """Should resolve AUTHORIZATION_ERROR to AuthorizationError."""
        assert get_error_class("AUTHORIZATION_ERROR", None) == AuthorizationError

    def test_by_code_validation(self):
        """Should resolve VALIDATION_ERROR to ValidationError."""
        assert get_error_class("VALIDATION_ERROR", None) == ValidationError

    def test_by_code_not_found(self):
        """Should resolve NOT_FOUND to NotFoundError."""
        assert get_error_class("NOT_FOUND", None) == NotFoundError

    def test_by_code_rate_limit(self):
        """Should resolve RATE_LIMIT to RateLimitError."""
        assert get_error_class("RATE_LIMIT", None) == RateLimitError

    def test_by_code_quota_exceeded(self):
        """Should resolve QUOTA_EXCEEDED to QuotaExceededError."""
        assert get_error_class("QUOTA_EXCEEDED", None) == QuotaExceededError

    def test_by_code_timeout(self):
        """Should resolve TIMEOUT to TimeoutError."""
        assert get_error_class("TIMEOUT", None) == TimeoutError

    def test_by_status_401(self):
        """Should resolve 401 to AuthenticationError."""
        assert get_error_class(None, 401) == AuthenticationError

    def test_by_status_403(self):
        """Should resolve 403 to AuthorizationError."""
        assert get_error_class(None, 403) == AuthorizationError

    def test_by_status_400(self):
        """Should resolve 400 to ValidationError."""
        assert get_error_class(None, 400) == ValidationError

    def test_by_status_404(self):
        """Should resolve 404 to NotFoundError."""
        assert get_error_class(None, 404) == NotFoundError

    def test_by_status_429(self):
        """Should resolve 429 to RateLimitError."""
        assert get_error_class(None, 429) == RateLimitError

    def test_by_status_402(self):
        """Should resolve 402 to QuotaExceededError."""
        assert get_error_class(None, 402) == QuotaExceededError

    def test_by_status_500(self):
        """Should resolve 500 to ServerError."""
        assert get_error_class(None, 500) == ServerError

    def test_by_status_502(self):
        """Should resolve 502 to ServerError."""
        assert get_error_class(None, 502) == ServerError

    def test_by_status_503(self):
        """Should resolve 503 to ServerError."""
        assert get_error_class(None, 503) == ServerError

    def test_by_status_504(self):
        """Should resolve 504 to ServerError."""
        assert get_error_class(None, 504) == ServerError

    def test_unknown_code_and_status(self):
        """Should return CheckError for unknown code and status."""
        assert get_error_class("UNKNOWN", 999) == CheckError

    def test_code_takes_precedence(self):
        """Code should take precedence over status."""
        # AUTHENTICATION_ERROR code should return AuthenticationError
        # even with status 400
        assert get_error_class("AUTHENTICATION_ERROR", 400) == AuthenticationError


class TestErrorInheritance:
    """Test error class inheritance."""

    def test_all_errors_are_check_errors(self):
        """All error types should be instances of CheckError."""
        errors = [
            AuthenticationError("test"),
            AuthorizationError("test"),
            ValidationError("test"),
            NotFoundError("test"),
            RateLimitError("test"),
            QuotaExceededError("test"),
            TimeoutError("test"),
            ServerError("test"),
        ]

        for error in errors:
            assert isinstance(error, CheckError)
            assert isinstance(error, Exception)

    def test_all_errors_are_exceptions(self):
        """All error types should be catchable as exceptions."""
        try:
            raise AuthenticationError("test")
        except Exception as e:
            assert isinstance(e, AuthenticationError)
