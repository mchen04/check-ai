"""
VerifyAI SDK Types
Pydantic models for the VerifyAI API
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
        description="Minimum confidence threshold"
    )

    model_config = {"extra": "forbid", "populate_by_name": True}


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
    methods: MethodsConfig = Field(
        ...,
        description="Verification methods to use"
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
