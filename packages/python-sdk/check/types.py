"""
Check SDK Types
Pydantic models for the Check API
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# =============================================================================
# TYPE ALIASES
# =============================================================================

ParadigmType = Literal[
    "semantic",
    "reasoning",
    "tool",
    "biprm",
    "ensemble",
    "entropy",
    "formal",
]

Verdict = Literal["true", "false", "uncertain"]

Decision = Literal["accept", "refine", "escalate", "reject"]

VerificationStatus = Literal[
    "pending",
    "processing",
    "completed",
    "failed",
    "escalated",
]


# =============================================================================
# REQUEST MODELS
# =============================================================================

class MethodsConfig(BaseModel):
    """
    Configuration for which verification methods to use and their weights.
    At least one method must be specified with a weight between 0 and 1.
    """

    semantic: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Embedding similarity (50-100% FPR)"
    )
    reasoning: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="LLM judge (~7% FPR)"
    )
    tool: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Fact-grounded with web search (~2% FPR)"
    )
    biprm: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Bidirectional reasoning (~10% FPR)"
    )
    ensemble: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Multi-model voting (~30% FPR)"
    )
    entropy: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Consistency checking (~15% FPR)"
    )
    formal: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Mathematical certainty (0% FPR for formalizable claims)"
    )

    model_config = {"extra": "forbid"}


class VerifyOptions(BaseModel):
    """Options for verification request."""

    timeout: Optional[int] = Field(
        default=None,
        ge=1000,
        le=300000,
        description="Timeout in milliseconds"
    )
    min_confidence: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        alias="minConfidence",
        description="Minimum confidence threshold - used with retry_on_low_confidence"
    )
    accept_threshold: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        alias="acceptThreshold",
        description="Override default accept threshold (0.95) - auto-approve if confidence >= this"
    )
    escalate_threshold: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        alias="escalateThreshold",
        description="Override default escalate threshold (0.5) - human review if confidence < this with disagreement"
    )
    max_retries: Optional[int] = Field(
        default=None,
        ge=0,
        le=5,
        alias="maxRetries",
        description="Per-paradigm retry count (0-5) - retries failed paradigm executions"
    )
    retry_on_low_confidence: Optional[bool] = Field(
        default=None,
        alias="retryOnLowConfidence",
        description="Retry all paradigms once if final confidence < min_confidence"
    )

    model_config = {"extra": "forbid", "populate_by_name": True}


class MethodOverride(BaseModel):
    """Override config for a method in a single request."""

    weight: float = Field(ge=0, le=1, description="Weight for this method")
    model: Optional[str] = Field(default=None, description="Override model for this request")

    model_config = {"extra": "forbid"}


class VerifyRequest(BaseModel):
    """Verification request payload."""

    content: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        description="Content to verify"
    )
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional context for verification"
    )
    methods: Optional[MethodsConfig] = Field(
        default=None,
        description="Verification methods to use. Optional if API key has paradigm config."
    )
    options: Optional[VerifyOptions] = Field(
        default=None,
        description="Optional request options"
    )
    idempotency_key: Optional[str] = Field(
        default=None,
        max_length=255,
        alias="idempotencyKey",
        description="Idempotency key for deduplication"
    )

    model_config = {"extra": "forbid", "populate_by_name": True}


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class TokenUsage(BaseModel):
    """Token usage for a paradigm."""

    input_tokens: int = Field(alias="inputTokens")
    output_tokens: int = Field(alias="outputTokens")

    model_config = {"populate_by_name": True}


class ParadigmResult(BaseModel):
    """Result from a single verification paradigm."""

    paradigm: ParadigmType = Field(description="Which paradigm was used")
    weight: float = Field(description="Weight assigned to this paradigm")
    provider: str = Field(description="LLM provider used")
    model: str = Field(description="Model used")
    verdict: Optional[Verdict] = Field(description="Verdict from this paradigm")
    confidence: float = Field(ge=0, le=1, description="Confidence score")
    reasoning: Optional[str] = Field(description="Reasoning explanation")
    processing_time_ms: int = Field(alias="processingTimeMs", description="Time taken in ms")
    cost_cents: float = Field(alias="costCents", description="Cost in cents")
    token_usage: Optional[TokenUsage] = Field(default=None, alias="tokenUsage")
    error: Optional[str] = Field(default=None, description="Error if paradigm failed")

    model_config = {"populate_by_name": True}


class VerifyResponse(BaseModel):
    """Verification response."""

    id: str = Field(description="Unique verification ID")
    status: VerificationStatus = Field(description="Current status")
    content: Optional[str] = Field(
        default=None,
        description="Original content that was verified (only in GET response)"
    )
    verdict: Optional[Verdict] = Field(default=None, description="Overall verdict")
    confidence: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Overall confidence score"
    )
    decision: Optional[Decision] = Field(default=None, description="Decision recommendation")
    reasoning: Optional[str] = Field(default=None, description="Summary reasoning")
    paradigm_results: Optional[List[ParadigmResult]] = Field(
        default=None,
        alias="paradigmResults",
        description="Results from each paradigm"
    )
    processing_time_ms: Optional[int] = Field(
        default=None,
        alias="processingTimeMs",
        description="Total processing time in ms"
    )
    cost_cents: Optional[float] = Field(
        default=None,
        alias="costCents",
        description="Total cost in cents"
    )
    cached: Optional[bool] = Field(
        default=None,
        description="Whether result was from cache"
    )
    escalated: Optional[bool] = Field(
        default=None,
        description="Whether verification was escalated for human review"
    )
    created_at: Optional[str] = Field(
        default=None,
        alias="createdAt",
        description="ISO 8601 timestamp when created (only in GET response)"
    )
    completed_at: Optional[str] = Field(
        default=None,
        alias="completedAt",
        description="ISO 8601 timestamp when completed"
    )

    model_config = {"populate_by_name": True}


# =============================================================================
# CLIENT OPTIONS
# =============================================================================

class RetryConfig(BaseModel):
    """Retry configuration for automatic retries with exponential backoff."""

    max_retries: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum number of retry attempts"
    )
    initial_delay: float = Field(
        default=1.0,
        ge=0.1,
        le=60.0,
        description="Initial delay between retries in seconds"
    )
    max_delay: float = Field(
        default=30.0,
        ge=1.0,
        le=300.0,
        description="Maximum delay between retries in seconds"
    )
    multiplier: float = Field(
        default=2.0,
        ge=1.0,
        le=10.0,
        description="Multiplier for exponential backoff"
    )
    jitter: bool = Field(
        default=True,
        description="Add randomization to delay to avoid thundering herd"
    )
    retryable_statuses: List[int] = Field(
        default=[429, 500, 502, 503, 504],
        description="HTTP status codes that should trigger a retry"
    )

    model_config = {"extra": "forbid"}


class WaitOptions(BaseModel):
    """Options for verify_and_wait method."""

    poll_interval: float = Field(
        default=1.0,
        ge=0.1,
        le=60.0,
        description="Polling interval in seconds"
    )
    timeout: float = Field(
        default=60.0,
        ge=1.0,
        le=600.0,
        description="Maximum time to wait in seconds"
    )

    model_config = {"extra": "forbid"}


# =============================================================================
# BATCH TYPES
# =============================================================================

BatchStatus = Literal[
    "pending",
    "validating",
    "processing",
    "completed",
    "failed",
    "cancelled",
]


class BatchItem(BaseModel):
    """Individual item in a batch request."""

    content: str = Field(
        ...,
        min_length=1,
        max_length=50000,
        description="Content to verify"
    )
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional context for verification"
    )
    idempotency_key: Optional[str] = Field(
        default=None,
        max_length=255,
        alias="idempotencyKey",
        description="Optional idempotency key"
    )

    model_config = {"extra": "forbid", "populate_by_name": True}


class CreateBatchRequest(BaseModel):
    """Request to create a batch job."""

    items: Optional[List[BatchItem]] = Field(
        default=None,
        description="Items to verify (mutually exclusive with file_id)"
    )
    file_id: Optional[str] = Field(
        default=None,
        alias="fileId",
        description="File ID from upload (mutually exclusive with items)"
    )
    methods: MethodsConfig = Field(
        ...,
        description="Verification methods to use"
    )
    options: Optional[VerifyOptions] = Field(
        default=None,
        description="Optional verification options (thresholds, retries)"
    )
    webhook_url: Optional[str] = Field(
        default=None,
        alias="webhookUrl",
        description="Optional webhook URL for completion notification"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional metadata"
    )

    model_config = {"extra": "forbid", "populate_by_name": True}


class BatchValidationError(BaseModel):
    """Validation error for a batch item."""

    index: int = Field(description="Item index in batch")
    message: str = Field(description="Error message")


class CreateBatchResponse(BaseModel):
    """Response from creating a batch job."""

    id: str = Field(description="Unique batch ID")
    status: BatchStatus = Field(description="Current status")
    total_items: int = Field(alias="totalItems", description="Total number of items")
    validation_errors: Optional[List[BatchValidationError]] = Field(
        default=None,
        alias="validationErrors",
        description="Validation errors (if any)"
    )
    message: str = Field(description="Status message")

    model_config = {"populate_by_name": True}


class BatchJob(BaseModel):
    """Batch job details."""

    id: str = Field(description="Unique batch ID")
    status: BatchStatus = Field(description="Current status")
    total_items: int = Field(alias="totalItems", description="Total number of items")
    completed_items: int = Field(alias="completedItems", description="Number of completed items")
    failed_items: int = Field(alias="failedItems", description="Number of failed items")
    progress: float = Field(ge=0, le=100, description="Progress percentage (0-100)")
    methods: MethodsConfig = Field(description="Verification methods configuration")
    created_at: str = Field(alias="createdAt", description="ISO 8601 timestamp when created")
    started_at: Optional[str] = Field(
        default=None,
        alias="startedAt",
        description="ISO 8601 timestamp when started processing"
    )
    completed_at: Optional[str] = Field(
        default=None,
        alias="completedAt",
        description="ISO 8601 timestamp when completed"
    )
    error: Optional[str] = Field(default=None, description="Error message if failed")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional metadata")

    model_config = {"populate_by_name": True}


class BatchItemResult(BaseModel):
    """Individual batch item result."""

    index: int = Field(description="Item index in batch")
    verification_id: Optional[str] = Field(
        default=None,
        alias="verificationId",
        description="Verification ID"
    )
    status: VerificationStatus = Field(description="Current status")
    verdict: Optional[Verdict] = Field(default=None, description="Overall verdict")
    confidence: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Overall confidence score"
    )
    decision: Optional[Decision] = Field(default=None, description="Decision recommendation")
    reasoning: Optional[str] = Field(default=None, description="Summary reasoning")
    error: Optional[str] = Field(default=None, description="Error if failed")
    content: Optional[str] = Field(default=None, description="Original content")

    model_config = {"populate_by_name": True}


class PaginationInfo(BaseModel):
    """Pagination information."""

    total: int = Field(description="Total number of items")
    limit: int = Field(description="Number of items per page")
    offset: int = Field(description="Current offset")
    has_more: bool = Field(alias="hasMore", description="Whether there are more items")

    model_config = {"populate_by_name": True}


class BatchResultsResponse(BaseModel):
    """Batch results response."""

    batch_id: str = Field(alias="batchId", description="Batch ID")
    status: BatchStatus = Field(description="Batch status")
    results: List[BatchItemResult] = Field(description="Results for each item")
    pagination: Optional[PaginationInfo] = Field(default=None, description="Pagination info")

    model_config = {"populate_by_name": True}


class ListBatchesResponse(BaseModel):
    """Response from listing batches."""

    data: List[BatchJob] = Field(description="List of batch jobs")
    pagination: PaginationInfo = Field(description="Pagination info")


class FileValidationError(BaseModel):
    """Validation error from file parsing."""

    line: int = Field(description="Line number in file")
    message: str = Field(description="Error message")


class FileUploadResponse(BaseModel):
    """File upload response."""

    file_id: str = Field(alias="fileId", description="File ID to use when creating batch")
    original_file_name: str = Field(
        alias="originalFileName",
        description="Original file name"
    )
    format: Literal["json", "csv"] = Field(description="Detected format")
    item_count: int = Field(alias="itemCount", description="Number of items parsed")
    validation_errors: Optional[List[FileValidationError]] = Field(
        default=None,
        alias="validationErrors",
        description="Validation errors (items were skipped)"
    )
    expires_at: str = Field(alias="expiresAt", description="ISO 8601 timestamp when file expires")
    message: str = Field(description="Status message")

    model_config = {"populate_by_name": True}


class BatchWaitOptions(BaseModel):
    """Options for create_batch_and_wait method."""

    poll_interval: float = Field(
        default=5.0,
        ge=1.0,
        le=300.0,
        description="Polling interval in seconds"
    )
    timeout: float = Field(
        default=3600.0,
        ge=60.0,
        le=86400.0,
        description="Maximum time to wait in seconds"
    )

    model_config = {"extra": "forbid"}
