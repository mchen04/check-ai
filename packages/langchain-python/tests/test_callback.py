"""Tests for Shove LangChain callback handlers."""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4

from shove_langchain import (
    ShoveCallbackHandler,
    AsyncShoveCallbackHandler,
    VerificationResult,
)
from shove_langchain.exceptions import VerificationRejectedError


class TestVerificationResult:
    """Test VerificationResult dataclass."""

    def test_from_response(self, mock_verify_response):
        """Should create result from Shove response."""
        response = mock_verify_response(
            verdict="true",
            confidence=0.95,
            decision="accept",
            reasoning="Verified",
            cached=True,
            verification_id="ver_123",
        )

        result = VerificationResult.from_response(response)

        assert result.verification_id == "ver_123"
        assert result.verdict == "true"
        assert result.confidence == 0.95
        assert result.decision == "accept"
        assert result.reasoning == "Verified"
        assert result.cached is True

    def test_from_response_with_none_values(self):
        """Should handle None values in response."""
        response = MagicMock()
        response.id = "ver_456"
        response.verdict = None
        response.confidence = None
        response.decision = None
        response.reasoning = None
        response.cached = None

        result = VerificationResult.from_response(response)

        assert result.verification_id == "ver_456"
        assert result.verdict is None
        assert result.confidence is None
        assert result.decision is None
        assert result.reasoning is None
        assert result.cached is False


class TestShoveCallbackHandler:
    """Test sync callback handler."""

    def test_init_with_defaults(self, mock_sync_client):
        """Should initialize with default options."""
        handler = ShoveCallbackHandler(mock_sync_client)

        assert handler.client == mock_sync_client
        assert handler.methods == {"reasoning": 1.0}
        assert handler.min_confidence == 0.7
        assert handler.raise_on_reject is False
        assert handler.on_verification is None
        assert handler.skip_empty is True
        assert handler.poll_interval == 1.0
        assert handler.timeout == 60.0

    def test_init_with_custom_options(self, mock_sync_client):
        """Should accept custom options."""
        callback = MagicMock()
        handler = ShoveCallbackHandler(
            mock_sync_client,
            methods={"reasoning": 1.0, "tool": 0.5},
            min_confidence=0.9,
            raise_on_reject=True,
            on_verification=callback,
            skip_empty=False,
            poll_interval=2.0,
            timeout=120.0,
        )

        assert handler.methods == {"reasoning": 1.0, "tool": 0.5}
        assert handler.min_confidence == 0.9
        assert handler.raise_on_reject is True
        assert handler.on_verification == callback
        assert handler.skip_empty is False
        assert handler.poll_interval == 2.0
        assert handler.timeout == 120.0


class TestOnLLMEnd:
    """Test on_llm_end method."""

    def test_verifies_llm_output(
        self, mock_sync_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should verify LLM output and attach result."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            verdict="true",
            confidence=0.95,
            decision="accept",
            reasoning="Content is accurate",
            verification_id="ver_123",
        )

        handler = ShoveCallbackHandler(mock_sync_client)
        result = mock_llm_result(["Paris is the capital of France."])

        handler.on_llm_end(result, run_id=run_id)

        mock_sync_client.verify_and_wait.assert_called_once()
        call_kwargs = mock_sync_client.verify_and_wait.call_args[1]
        assert call_kwargs["content"] == "Paris is the capital of France."
        assert call_kwargs["methods"] == {"reasoning": 1.0}

        # Check verification was attached
        verification = result.generations[0][0].generation_info["verification"]
        assert verification["id"] == "ver_123"
        assert verification["verdict"] == "true"
        assert verification["confidence"] == 0.95
        assert verification["decision"] == "accept"

    def test_uses_custom_methods(
        self, mock_sync_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should use custom verification methods."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        handler = ShoveCallbackHandler(
            mock_sync_client,
            methods={"reasoning": 1.0, "tool": 0.5, "biprm": 0.3},
        )
        result = mock_llm_result(["Test content"])

        handler.on_llm_end(result, run_id=run_id)

        call_kwargs = mock_sync_client.verify_and_wait.call_args[1]
        assert call_kwargs["methods"] == {"reasoning": 1.0, "tool": 0.5, "biprm": 0.3}

    def test_skips_empty_responses_by_default(
        self, mock_sync_client, mock_llm_result, run_id
    ):
        """Should skip verification for empty responses."""
        handler = ShoveCallbackHandler(mock_sync_client)
        result = mock_llm_result([""])

        handler.on_llm_end(result, run_id=run_id)

        mock_sync_client.verify_and_wait.assert_not_called()

    def test_skips_whitespace_only_responses(
        self, mock_sync_client, mock_llm_result, run_id
    ):
        """Should skip verification for whitespace-only responses."""
        handler = ShoveCallbackHandler(mock_sync_client)
        result = mock_llm_result(["   \n\t  "])

        handler.on_llm_end(result, run_id=run_id)

        mock_sync_client.verify_and_wait.assert_not_called()

    def test_verifies_empty_when_skip_empty_false(
        self, mock_sync_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should verify empty responses when skip_empty is False."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        handler = ShoveCallbackHandler(mock_sync_client, skip_empty=False)
        result = mock_llm_result(["   "])

        handler.on_llm_end(result, run_id=run_id)

        mock_sync_client.verify_and_wait.assert_called_once()

    def test_handles_multiple_generations(
        self, mock_sync_client, mock_verify_response, run_id
    ):
        """Should verify each generation."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        handler = ShoveCallbackHandler(mock_sync_client)

        # Create result with multiple generations in same list
        from tests.conftest import MockGeneration, MockLLMResult

        result = MockLLMResult(
            generations=[
                [
                    MockGeneration(text="First response", generation_info={}),
                    MockGeneration(text="Second response", generation_info={}),
                ]
            ]
        )

        handler.on_llm_end(result, run_id=run_id)

        assert mock_sync_client.verify_and_wait.call_count == 2

    def test_handles_null_generation_info(
        self, mock_sync_client, mock_verify_response, run_id
    ):
        """Should handle generations with None generation_info."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        handler = ShoveCallbackHandler(mock_sync_client)

        from tests.conftest import MockGeneration, MockLLMResult

        result = MockLLMResult(
            generations=[[MockGeneration(text="Test content", generation_info=None)]]
        )

        handler.on_llm_end(result, run_id=run_id)

        # Should have created generation_info
        assert result.generations[0][0].generation_info is not None
        assert "verification" in result.generations[0][0].generation_info


class TestOnVerificationCallback:
    """Test on_verification callback."""

    def test_calls_callback_with_content_and_result(
        self, mock_sync_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should call on_verification callback."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            verdict="true",
            confidence=0.95,
            decision="accept",
            reasoning="Content is accurate",
            verification_id="ver_123",
        )

        callback = MagicMock()
        handler = ShoveCallbackHandler(mock_sync_client, on_verification=callback)
        result = mock_llm_result(["Test content"])

        handler.on_llm_end(result, run_id=run_id)

        callback.assert_called_once()
        content, verification_result = callback.call_args[0]
        assert content == "Test content"
        assert verification_result.verification_id == "ver_123"
        assert verification_result.verdict == "true"
        assert verification_result.confidence == 0.95

    def test_calls_callback_for_each_generation(
        self, mock_sync_client, mock_verify_response, run_id
    ):
        """Should call callback for each verified generation."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        callback = MagicMock()
        handler = ShoveCallbackHandler(mock_sync_client, on_verification=callback)

        from tests.conftest import MockGeneration, MockLLMResult

        result = MockLLMResult(
            generations=[
                [
                    MockGeneration(text="First", generation_info={}),
                    MockGeneration(text="Second", generation_info={}),
                ]
            ]
        )

        handler.on_llm_end(result, run_id=run_id)

        assert callback.call_count == 2


class TestRaiseOnReject:
    """Test raise_on_reject behavior."""

    def test_does_not_raise_when_disabled(
        self, mock_sync_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should not raise when raise_on_reject is False."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            verdict="false",
            confidence=0.1,
            decision="reject",
            reasoning="Content is false",
        )

        handler = ShoveCallbackHandler(mock_sync_client, raise_on_reject=False)
        result = mock_llm_result(["False claim"])

        # Should not raise
        handler.on_llm_end(result, run_id=run_id)

    def test_raises_on_rejection(
        self, mock_sync_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should raise VerificationRejectedError when enabled."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            verdict="false",
            confidence=0.1,
            decision="reject",
            reasoning="Content is demonstrably false",
            verification_id="ver_456",
        )

        handler = ShoveCallbackHandler(mock_sync_client, raise_on_reject=True)
        result = mock_llm_result(["The Earth is flat."])

        with pytest.raises(VerificationRejectedError) as exc_info:
            handler.on_llm_end(result, run_id=run_id)

        error = exc_info.value
        assert error.verification_id == "ver_456"
        assert error.verdict == "false"
        assert error.confidence == 0.1
        assert error.content == "The Earth is flat."
        assert error.reasoning == "Content is demonstrably false"

    def test_does_not_raise_for_non_reject_decisions(
        self, mock_sync_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should not raise for escalate or accept decisions."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            verdict="uncertain",
            confidence=0.5,
            decision="escalate",
            reasoning="Needs human review",
        )

        handler = ShoveCallbackHandler(mock_sync_client, raise_on_reject=True)
        result = mock_llm_result(["Uncertain claim"])

        # Should not raise
        handler.on_llm_end(result, run_id=run_id)


class TestErrorHandling:
    """Test error handling."""

    def test_catches_verification_errors(
        self, mock_sync_client, mock_llm_result, run_id
    ):
        """Should catch and attach verification errors."""
        mock_sync_client.verify_and_wait.side_effect = Exception("API Error")

        handler = ShoveCallbackHandler(mock_sync_client)
        result = mock_llm_result(["Test content"])

        handler.on_llm_end(result, run_id=run_id)

        verification = result.generations[0][0].generation_info["verification"]
        assert verification["error"] == "API Error"

    def test_rethrows_verification_rejected_error(
        self, mock_sync_client, mock_llm_result, run_id
    ):
        """Should re-raise VerificationRejectedError."""
        error = VerificationRejectedError(
            "Rejected",
            verification_id="ver_123",
            verdict="false",
            confidence=0.1,
        )
        mock_sync_client.verify_and_wait.side_effect = error

        handler = ShoveCallbackHandler(mock_sync_client, raise_on_reject=True)
        result = mock_llm_result(["Test"])

        with pytest.raises(VerificationRejectedError):
            handler.on_llm_end(result, run_id=run_id)


class TestCustomPollingOptions:
    """Test custom polling options."""

    def test_uses_custom_poll_interval_and_timeout(
        self, mock_sync_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should pass custom polling options to verify_and_wait."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        handler = ShoveCallbackHandler(
            mock_sync_client,
            poll_interval=5.0,
            timeout=300.0,
        )
        result = mock_llm_result(["Test content"])

        handler.on_llm_end(result, run_id=run_id)

        call_kwargs = mock_sync_client.verify_and_wait.call_args[1]
        assert call_kwargs["poll_interval"] == 5.0
        assert call_kwargs["timeout"] == 300.0


class TestAsyncShoveCallbackHandler:
    """Test async callback handler."""

    def test_init_with_defaults(self, mock_async_client):
        """Should initialize with default options."""
        handler = AsyncShoveCallbackHandler(mock_async_client)

        assert handler.client == mock_async_client
        assert handler.methods == {"reasoning": 1.0}
        assert handler.min_confidence == 0.7
        assert handler.raise_on_reject is False

    @pytest.mark.asyncio
    async def test_verifies_llm_output_async(
        self, mock_async_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should verify LLM output asynchronously."""
        mock_async_client.verify_and_wait.return_value = mock_verify_response(
            verdict="true",
            confidence=0.95,
            decision="accept",
            verification_id="ver_123",
        )

        handler = AsyncShoveCallbackHandler(mock_async_client)
        result = mock_llm_result(["Test content"])

        await handler.on_llm_end(result, run_id=run_id)

        mock_async_client.verify_and_wait.assert_called_once()
        verification = result.generations[0][0].generation_info["verification"]
        assert verification["id"] == "ver_123"
        assert verification["verdict"] == "true"

    @pytest.mark.asyncio
    async def test_skips_empty_responses_async(
        self, mock_async_client, mock_llm_result, run_id
    ):
        """Should skip empty responses asynchronously."""
        handler = AsyncShoveCallbackHandler(mock_async_client)
        result = mock_llm_result([""])

        await handler.on_llm_end(result, run_id=run_id)

        mock_async_client.verify_and_wait.assert_not_called()

    @pytest.mark.asyncio
    async def test_raises_on_rejection_async(
        self, mock_async_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should raise VerificationRejectedError when enabled."""
        mock_async_client.verify_and_wait.return_value = mock_verify_response(
            verdict="false",
            confidence=0.1,
            decision="reject",
            reasoning="False content",
            verification_id="ver_456",
        )

        handler = AsyncShoveCallbackHandler(
            mock_async_client, raise_on_reject=True
        )
        result = mock_llm_result(["False claim"])

        with pytest.raises(VerificationRejectedError):
            await handler.on_llm_end(result, run_id=run_id)

    @pytest.mark.asyncio
    async def test_calls_callback_async(
        self, mock_async_client, mock_llm_result, mock_verify_response, run_id
    ):
        """Should call on_verification callback."""
        mock_async_client.verify_and_wait.return_value = mock_verify_response()

        callback = MagicMock()
        handler = AsyncShoveCallbackHandler(
            mock_async_client, on_verification=callback
        )
        result = mock_llm_result(["Test content"])

        await handler.on_llm_end(result, run_id=run_id)

        callback.assert_called_once()

    @pytest.mark.asyncio
    async def test_handles_errors_async(
        self, mock_async_client, mock_llm_result, run_id
    ):
        """Should catch and attach errors asynchronously."""
        mock_async_client.verify_and_wait.side_effect = Exception("Async API Error")

        handler = AsyncShoveCallbackHandler(mock_async_client)
        result = mock_llm_result(["Test content"])

        await handler.on_llm_end(result, run_id=run_id)

        verification = result.generations[0][0].generation_info["verification"]
        assert verification["error"] == "Async API Error"
