"""
Check SDK
Official Python SDK for Check - The Stripe for LLM Verification

Example:
    >>> from check import Check
    >>> client = Check(api_key="vfy_...")
    >>> result = client.verify_and_wait(
    ...     content="The speed of light is approximately 299,792 km/s.",
    ...     methods={"reasoning": 1.0}
    ... )
    >>> print(result.verdict)  # 'true'
    >>> print(result.confidence)  # 0.95
"""

from check.client import Check, AsyncCheck
from check.types import (
    # Core types
    ParadigmType,
    Verdict,
    Decision,
    VerificationStatus,
    # Request types
    MethodsConfig,
    VerifyOptions,
    VerifyRequest,
    # Response types
    ParadigmResult,
    VerifyResponse,
    # Client options
    WaitOptions,
    RetryConfig,
    # Batch types
    BatchStatus,
    BatchItem,
    CreateBatchRequest,
    CreateBatchResponse,
    BatchJob,
    BatchItemResult,
    BatchResultsResponse,
    ListBatchesResponse,
    FileUploadResponse,
    BatchWaitOptions,
    PaginationInfo,
)
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
)

__version__ = "0.1.0"

__all__ = [
    # Clients
    "Check",
    "AsyncCheck",
    # Core types
    "ParadigmType",
    "Verdict",
    "Decision",
    "VerificationStatus",
    # Request types
    "MethodsConfig",
    "VerifyOptions",
    "VerifyRequest",
    # Response types
    "ParadigmResult",
    "VerifyResponse",
    # Client options
    "WaitOptions",
    "RetryConfig",
    # Batch types
    "BatchStatus",
    "BatchItem",
    "CreateBatchRequest",
    "CreateBatchResponse",
    "BatchJob",
    "BatchItemResult",
    "BatchResultsResponse",
    "ListBatchesResponse",
    "FileUploadResponse",
    "BatchWaitOptions",
    "PaginationInfo",
    # Errors
    "CheckError",
    "AuthenticationError",
    "AuthorizationError",
    "ValidationError",
    "NotFoundError",
    "RateLimitError",
    "QuotaExceededError",
    "TimeoutError",
    "ServerError",
]
