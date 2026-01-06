"""
VerifyAI SDK
Official Python SDK for VerifyAI - The Stripe for LLM Verification

Example:
    >>> from verifyai import VerifyAI
    >>> client = VerifyAI(api_key="vfy_...")
    >>> result = client.verify_and_wait(
    ...     content="The speed of light is approximately 299,792 km/s.",
    ...     methods={"reasoning": 1.0}
    ... )
    >>> print(result.verdict)  # 'true'
    >>> print(result.confidence)  # 0.95
"""

from verifyai.client import VerifyAI, AsyncVerifyAI
from verifyai.types import (
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
from verifyai.errors import (
    VerifyAIError,
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
    "VerifyAI",
    "AsyncVerifyAI",
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
    "VerifyAIError",
    "AuthenticationError",
    "AuthorizationError",
    "ValidationError",
    "NotFoundError",
    "RateLimitError",
    "QuotaExceededError",
    "TimeoutError",
    "ServerError",
]
