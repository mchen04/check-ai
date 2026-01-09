"""
Shove SDK
Official Python SDK for Shove - The Stripe for LLM Verification

Example:
    >>> from shove import Shove
    >>> client = Shove(api_key="vfy_...")
    >>> result = client.verify_and_wait(
    ...     content="The speed of light is approximately 299,792 km/s.",
    ...     methods={"reasoning": 1.0}
    ... )
    >>> print(result.verdict)  # 'true'
    >>> print(result.confidence)  # 0.95
"""

from shove.client import Shove, AsyncShove
from shove.types import (
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
from shove.errors import (
    ShoveError,
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
    "Shove",
    "AsyncShove",
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
    "ShoveError",
    "AuthenticationError",
    "AuthorizationError",
    "ValidationError",
    "NotFoundError",
    "RateLimitError",
    "QuotaExceededError",
    "TimeoutError",
    "ServerError",
]
