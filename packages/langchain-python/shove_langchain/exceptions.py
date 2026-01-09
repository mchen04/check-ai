"""
Shove LangChain Exceptions
Custom exceptions for verification failures
"""

from typing import Any, Dict, Optional


class VerificationError(Exception):
    """Base exception for verification errors."""

    def __init__(
        self,
        message: str,
        *,
        verification_id: Optional[str] = None,
        verdict: Optional[str] = None,
        confidence: Optional[float] = None,
        decision: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.verification_id = verification_id
        self.verdict = verdict
        self.confidence = confidence
        self.decision = decision

    def __str__(self) -> str:
        parts = [self.message]
        if self.verdict:
            parts.append(f"verdict={self.verdict}")
        if self.confidence is not None:
            parts.append(f"confidence={self.confidence:.2%}")
        if self.decision:
            parts.append(f"decision={self.decision}")
        return " ".join(parts)


class VerificationRejectedError(VerificationError):
    """
    Raised when LLM output fails verification with 'reject' decision.

    This indicates the content was determined to be likely false or
    unverifiable with high confidence.
    """

    def __init__(
        self,
        message: str = "LLM output failed verification",
        *,
        verification_id: Optional[str] = None,
        verdict: Optional[str] = None,
        confidence: Optional[float] = None,
        content: Optional[str] = None,
        reasoning: Optional[str] = None,
    ) -> None:
        super().__init__(
            message,
            verification_id=verification_id,
            verdict=verdict,
            confidence=confidence,
            decision="reject",
        )
        self.content = content
        self.reasoning = reasoning
