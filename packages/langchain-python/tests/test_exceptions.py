"""Tests for VerifyAI LangChain exceptions."""

import pytest

from verifyai_langchain.exceptions import VerificationError, VerificationRejectedError


class TestVerificationError:
    """Test VerificationError class."""

    def test_create_with_message(self):
        """Should create error with message."""
        error = VerificationError("Test error")
        assert error.message == "Test error"
        assert "Test error" in str(error)

    def test_create_with_all_fields(self):
        """Should include all verification details."""
        error = VerificationError(
            "Verification failed",
            verification_id="ver_123",
            verdict="false",
            confidence=0.1,
            decision="reject",
        )

        assert error.verification_id == "ver_123"
        assert error.verdict == "false"
        assert error.confidence == 0.1
        assert error.decision == "reject"

    def test_default_values(self):
        """Should have None defaults for optional fields."""
        error = VerificationError("Test")

        assert error.verification_id is None
        assert error.verdict is None
        assert error.confidence is None
        assert error.decision is None

    def test_str_includes_verdict(self):
        """Should include verdict in string representation."""
        error = VerificationError("Test", verdict="false")
        assert "verdict=false" in str(error)

    def test_str_includes_confidence_as_percentage(self):
        """Should include confidence as percentage."""
        error = VerificationError("Test", confidence=0.95)
        assert "confidence=95.00%" in str(error)

    def test_str_includes_decision(self):
        """Should include decision in string representation."""
        error = VerificationError("Test", decision="reject")
        assert "decision=reject" in str(error)

    def test_str_full_format(self):
        """Should format full error string correctly."""
        error = VerificationError(
            "Verification failed",
            verdict="false",
            confidence=0.1,
            decision="reject",
        )
        error_str = str(error)

        assert "Verification failed" in error_str
        assert "verdict=false" in error_str
        assert "confidence=10.00%" in error_str
        assert "decision=reject" in error_str

    def test_is_exception(self):
        """Should be an Exception subclass."""
        error = VerificationError("Test")
        assert isinstance(error, Exception)


class TestVerificationRejectedError:
    """Test VerificationRejectedError class."""

    def test_extends_verification_error(self):
        """Should extend VerificationError."""
        error = VerificationRejectedError("Rejected")
        assert isinstance(error, VerificationError)
        assert isinstance(error, Exception)

    def test_default_message(self):
        """Should have default message."""
        error = VerificationRejectedError()
        assert error.message == "LLM output failed verification"

    def test_decision_is_reject(self):
        """Should always have decision set to reject."""
        error = VerificationRejectedError("Test")
        assert error.decision == "reject"

    def test_includes_content(self):
        """Should include content field."""
        error = VerificationRejectedError("Test", content="The problematic content")
        assert error.content == "The problematic content"

    def test_includes_reasoning(self):
        """Should include reasoning field."""
        error = VerificationRejectedError("Test", reasoning="Content is inaccurate")
        assert error.reasoning == "Content is inaccurate"

    def test_full_constructor(self):
        """Should accept all fields."""
        error = VerificationRejectedError(
            "LLM output failed verification",
            verification_id="ver_456",
            verdict="false",
            confidence=0.05,
            content="The Earth is flat.",
            reasoning="This is factually incorrect",
        )

        assert error.verification_id == "ver_456"
        assert error.verdict == "false"
        assert error.confidence == 0.05
        assert error.decision == "reject"
        assert error.content == "The Earth is flat."
        assert error.reasoning == "This is factually incorrect"

    def test_default_content_and_reasoning(self):
        """Should have None defaults for content and reasoning."""
        error = VerificationRejectedError("Test")
        assert error.content is None
        assert error.reasoning is None

    def test_can_be_raised_and_caught(self):
        """Should be raiseable and catchable."""
        with pytest.raises(VerificationRejectedError) as exc_info:
            raise VerificationRejectedError(
                "Rejected",
                verification_id="ver_123",
                verdict="false",
                confidence=0.1,
            )

        error = exc_info.value
        assert error.verification_id == "ver_123"

    def test_can_be_caught_as_verification_error(self):
        """Should be catchable as VerificationError."""
        with pytest.raises(VerificationError):
            raise VerificationRejectedError("Rejected")

    def test_can_be_caught_as_exception(self):
        """Should be catchable as Exception."""
        with pytest.raises(Exception):
            raise VerificationRejectedError("Rejected")


class TestErrorHierarchy:
    """Test error class hierarchy."""

    def test_verification_error_is_base(self):
        """VerificationError should be base class."""
        error = VerificationError("Test")
        assert type(error).__name__ == "VerificationError"

    def test_rejected_error_inherits(self):
        """VerificationRejectedError should inherit from VerificationError."""
        assert issubclass(VerificationRejectedError, VerificationError)

    def test_both_are_exceptions(self):
        """Both should be Exception subclasses."""
        assert issubclass(VerificationError, Exception)
        assert issubclass(VerificationRejectedError, Exception)
