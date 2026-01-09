"""Tests for Shove LlamaIndex postprocessor."""

import pytest
from unittest.mock import MagicMock, AsyncMock

from shove_llamaindex import ShovePostprocessor, AsyncShovePostprocessor


class TestShovePostprocessorInit:
    """Test postprocessor initialization."""

    def test_init_with_defaults(self, mock_sync_client):
        """Should initialize with default options."""
        postprocessor = ShovePostprocessor(mock_sync_client)

        assert postprocessor.client == mock_sync_client
        assert postprocessor.methods == {"reasoning": 1.0}
        assert postprocessor.min_confidence == 0.7
        assert postprocessor.filter_unverified is True
        assert postprocessor.include_query_context is True
        assert postprocessor.poll_interval == 1.0
        assert postprocessor.timeout == 60.0

    def test_init_with_custom_options(self, mock_sync_client):
        """Should accept custom options."""
        postprocessor = ShovePostprocessor(
            mock_sync_client,
            methods={"reasoning": 1.0, "tool": 0.5},
            min_confidence=0.9,
            filter_unverified=False,
            include_query_context=False,
            poll_interval=2.0,
            timeout=120.0,
        )

        assert postprocessor.methods == {"reasoning": 1.0, "tool": 0.5}
        assert postprocessor.min_confidence == 0.9
        assert postprocessor.filter_unverified is False
        assert postprocessor.include_query_context is False
        assert postprocessor.poll_interval == 2.0
        assert postprocessor.timeout == 120.0

    def test_class_name(self, mock_sync_client):
        """Should return correct class name."""
        postprocessor = ShovePostprocessor(mock_sync_client)
        assert postprocessor.class_name() == "ShovePostprocessor"


class TestPostprocessNodes:
    """Test _postprocess_nodes method."""

    def test_verifies_node_content(
        self, mock_sync_client, mock_node, mock_verify_response
    ):
        """Should verify node content."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            verdict="true",
            confidence=0.95,
            decision="accept",
            reasoning="Content is accurate",
            verification_id="ver_123",
        )

        postprocessor = ShovePostprocessor(mock_sync_client)
        nodes = [mock_node("Paris is the capital of France.")]

        result = postprocessor._postprocess_nodes(nodes)

        mock_sync_client.verify_and_wait.assert_called_once()
        call_kwargs = mock_sync_client.verify_and_wait.call_args[1]
        assert call_kwargs["content"] == "Paris is the capital of France."
        assert call_kwargs["methods"] == {"reasoning": 1.0}

        # Check verification metadata was attached
        assert len(result) == 1
        verification = result[0].node.metadata["verification"]
        assert verification["id"] == "ver_123"
        assert verification["verdict"] == "true"
        assert verification["confidence"] == 0.95

    def test_includes_query_context(
        self, mock_sync_client, mock_node, mock_query_bundle, mock_verify_response
    ):
        """Should include query in verification context."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        postprocessor = ShovePostprocessor(
            mock_sync_client, include_query_context=True
        )
        nodes = [mock_node("Test content")]
        query = mock_query_bundle("What is the capital?")

        postprocessor._postprocess_nodes(nodes, query)

        call_kwargs = mock_sync_client.verify_and_wait.call_args[1]
        assert call_kwargs["context"]["query"] == "What is the capital?"

    def test_excludes_query_context_when_disabled(
        self, mock_sync_client, mock_node, mock_query_bundle, mock_verify_response
    ):
        """Should not include query when include_query_context is False."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        postprocessor = ShovePostprocessor(
            mock_sync_client, include_query_context=False
        )
        nodes = [mock_node("Test content")]
        query = mock_query_bundle("What is the capital?")

        postprocessor._postprocess_nodes(nodes, query)

        call_kwargs = mock_sync_client.verify_and_wait.call_args[1]
        context = call_kwargs.get("context")
        assert context is None or "query" not in context

    def test_includes_node_metadata_in_context(
        self, mock_sync_client, mock_node, mock_verify_response
    ):
        """Should include node metadata in verification context."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        postprocessor = ShovePostprocessor(mock_sync_client)
        nodes = [mock_node("Test content", metadata={"source": "document.pdf"})]

        postprocessor._postprocess_nodes(nodes)

        call_kwargs = mock_sync_client.verify_and_wait.call_args[1]
        assert call_kwargs["context"]["metadata"]["source"] == "document.pdf"

    def test_skips_empty_nodes(self, mock_sync_client, mock_node):
        """Should skip verification for empty nodes."""
        postprocessor = ShovePostprocessor(mock_sync_client)
        nodes = [mock_node("")]

        result = postprocessor._postprocess_nodes(nodes)

        mock_sync_client.verify_and_wait.assert_not_called()
        assert len(result) == 1  # Node is kept as-is

    def test_skips_whitespace_only_nodes(self, mock_sync_client, mock_node):
        """Should skip verification for whitespace-only nodes."""
        postprocessor = ShovePostprocessor(mock_sync_client)
        nodes = [mock_node("   \n\t  ")]

        result = postprocessor._postprocess_nodes(nodes)

        mock_sync_client.verify_and_wait.assert_not_called()
        assert len(result) == 1

    def test_verifies_multiple_nodes(
        self, mock_sync_client, mock_node, mock_verify_response
    ):
        """Should verify each node."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            confidence=0.95
        )

        postprocessor = ShovePostprocessor(mock_sync_client)
        nodes = [
            mock_node("First content"),
            mock_node("Second content"),
            mock_node("Third content"),
        ]

        result = postprocessor._postprocess_nodes(nodes)

        assert mock_sync_client.verify_and_wait.call_count == 3
        assert len(result) == 3


class TestFilteringBehavior:
    """Test node filtering behavior."""

    def test_filters_low_confidence_nodes(
        self, mock_sync_client, mock_node, mock_verify_response
    ):
        """Should filter nodes below confidence threshold."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            confidence=0.5, decision="escalate"
        )

        postprocessor = ShovePostprocessor(
            mock_sync_client, min_confidence=0.7, filter_unverified=True
        )
        nodes = [mock_node("Low confidence content")]

        result = postprocessor._postprocess_nodes(nodes)

        assert len(result) == 0  # Node was filtered out

    def test_keeps_high_confidence_nodes(
        self, mock_sync_client, mock_node, mock_verify_response
    ):
        """Should keep nodes above confidence threshold."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            confidence=0.95, decision="accept"
        )

        postprocessor = ShovePostprocessor(
            mock_sync_client, min_confidence=0.7, filter_unverified=True
        )
        nodes = [mock_node("High confidence content")]

        result = postprocessor._postprocess_nodes(nodes)

        assert len(result) == 1

    def test_keeps_all_nodes_when_filter_disabled(
        self, mock_sync_client, mock_node, mock_verify_response
    ):
        """Should keep all nodes when filter_unverified is False."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            confidence=0.1, decision="reject"
        )

        postprocessor = ShovePostprocessor(
            mock_sync_client, min_confidence=0.7, filter_unverified=False
        )
        nodes = [mock_node("Low confidence content")]

        result = postprocessor._postprocess_nodes(nodes)

        assert len(result) == 1
        # Verification metadata should still be attached
        assert "verification" in result[0].node.metadata

    def test_filters_mix_of_nodes(self, mock_sync_client, mock_node):
        """Should filter only low confidence nodes in a batch."""
        responses = [
            MagicMock(
                id="ver_1",
                verdict="true",
                confidence=0.95,
                decision="accept",
                reasoning="OK",
                cached=False,
            ),
            MagicMock(
                id="ver_2",
                verdict="false",
                confidence=0.3,
                decision="reject",
                reasoning="Bad",
                cached=False,
            ),
            MagicMock(
                id="ver_3",
                verdict="true",
                confidence=0.85,
                decision="accept",
                reasoning="OK",
                cached=False,
            ),
        ]
        mock_sync_client.verify_and_wait.side_effect = responses

        postprocessor = ShovePostprocessor(
            mock_sync_client, min_confidence=0.7, filter_unverified=True
        )
        nodes = [
            mock_node("High confidence 1"),
            mock_node("Low confidence"),
            mock_node("High confidence 2"),
        ]

        result = postprocessor._postprocess_nodes(nodes)

        assert len(result) == 2  # Only 2 kept

    def test_handles_none_confidence(
        self, mock_sync_client, mock_node, mock_verify_response
    ):
        """Should treat None confidence as 0.0."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response(
            confidence=None
        )

        postprocessor = ShovePostprocessor(
            mock_sync_client, min_confidence=0.7, filter_unverified=True
        )
        nodes = [mock_node("Content with None confidence")]

        result = postprocessor._postprocess_nodes(nodes)

        assert len(result) == 0  # None treated as 0.0, filtered out


class TestErrorHandling:
    """Test error handling."""

    def test_catches_verification_errors(self, mock_sync_client, mock_node):
        """Should catch errors and add error metadata."""
        mock_sync_client.verify_and_wait.side_effect = Exception("API Error")

        postprocessor = ShovePostprocessor(mock_sync_client)
        nodes = [mock_node("Test content")]

        result = postprocessor._postprocess_nodes(nodes)

        # Node should be kept (fail open)
        assert len(result) == 1
        assert result[0].node.metadata["verification"]["error"] == "API Error"

    def test_keeps_node_on_error(self, mock_sync_client, mock_node):
        """Should keep nodes even when verification fails."""
        mock_sync_client.verify_and_wait.side_effect = Exception("Network error")

        postprocessor = ShovePostprocessor(
            mock_sync_client, filter_unverified=True
        )
        nodes = [mock_node("Test content")]

        result = postprocessor._postprocess_nodes(nodes)

        # Node should be kept despite error (fail open behavior)
        assert len(result) == 1


class TestCustomPollingOptions:
    """Test custom polling options."""

    def test_uses_custom_poll_interval_and_timeout(
        self, mock_sync_client, mock_node, mock_verify_response
    ):
        """Should pass custom polling options to verify_and_wait."""
        mock_sync_client.verify_and_wait.return_value = mock_verify_response()

        postprocessor = ShovePostprocessor(
            mock_sync_client,
            poll_interval=5.0,
            timeout=300.0,
        )
        nodes = [mock_node("Test content")]

        postprocessor._postprocess_nodes(nodes)

        call_kwargs = mock_sync_client.verify_and_wait.call_args[1]
        assert call_kwargs["poll_interval"] == 5.0
        assert call_kwargs["timeout"] == 300.0


class TestAsyncShovePostprocessor:
    """Test async postprocessor."""

    def test_init_with_defaults(self, mock_async_client):
        """Should initialize with default options."""
        postprocessor = AsyncShovePostprocessor(mock_async_client)

        assert postprocessor.client == mock_async_client
        assert postprocessor.methods == {"reasoning": 1.0}
        assert postprocessor.min_confidence == 0.7
        assert postprocessor.filter_unverified is True

    def test_class_name(self, mock_async_client):
        """Should return correct class name."""
        postprocessor = AsyncShovePostprocessor(mock_async_client)
        assert postprocessor.class_name() == "AsyncShovePostprocessor"

    def test_sync_postprocess_returns_nodes_unverified(
        self, mock_async_client, mock_node
    ):
        """Sync method should return nodes without verification."""
        postprocessor = AsyncShovePostprocessor(mock_async_client)
        nodes = [mock_node("Test content")]

        result = postprocessor._postprocess_nodes(nodes)

        # Nodes returned as-is, no verification called
        mock_async_client.verify_and_wait.assert_not_called()
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_async_verifies_nodes(
        self, mock_async_client, mock_node, mock_verify_response
    ):
        """Should verify nodes asynchronously."""
        mock_async_client.verify_and_wait.return_value = mock_verify_response(
            verification_id="ver_async123",
            verdict="true",
            confidence=0.95,
        )

        postprocessor = AsyncShovePostprocessor(mock_async_client)
        nodes = [mock_node("Async test content")]

        result = await postprocessor.apostprocess_nodes(nodes)

        mock_async_client.verify_and_wait.assert_called_once()
        assert len(result) == 1
        assert result[0].node.metadata["verification"]["id"] == "ver_async123"

    @pytest.mark.asyncio
    async def test_async_filters_low_confidence(
        self, mock_async_client, mock_node, mock_verify_response
    ):
        """Should filter low confidence nodes asynchronously."""
        mock_async_client.verify_and_wait.return_value = mock_verify_response(
            confidence=0.3
        )

        postprocessor = AsyncShovePostprocessor(
            mock_async_client, min_confidence=0.7, filter_unverified=True
        )
        nodes = [mock_node("Low confidence content")]

        result = await postprocessor.apostprocess_nodes(nodes)

        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_async_includes_query_context(
        self, mock_async_client, mock_node, mock_query_bundle, mock_verify_response
    ):
        """Should include query in async verification context."""
        mock_async_client.verify_and_wait.return_value = mock_verify_response()

        postprocessor = AsyncShovePostprocessor(
            mock_async_client, include_query_context=True
        )
        nodes = [mock_node("Test content")]
        query = mock_query_bundle("What is the answer?")

        await postprocessor.apostprocess_nodes(nodes, query)

        call_kwargs = mock_async_client.verify_and_wait.call_args[1]
        assert call_kwargs["context"]["query"] == "What is the answer?"

    @pytest.mark.asyncio
    async def test_async_handles_errors(self, mock_async_client, mock_node):
        """Should handle errors in async verification."""
        mock_async_client.verify_and_wait.side_effect = Exception("Async API Error")

        postprocessor = AsyncShovePostprocessor(mock_async_client)
        nodes = [mock_node("Test content")]

        result = await postprocessor.apostprocess_nodes(nodes)

        # Node should be kept with error metadata
        assert len(result) == 1
        assert result[0].node.metadata["verification"]["error"] == "Async API Error"

    @pytest.mark.asyncio
    async def test_async_skips_empty_nodes(self, mock_async_client, mock_node):
        """Should skip empty nodes asynchronously."""
        postprocessor = AsyncShovePostprocessor(mock_async_client)
        nodes = [mock_node("")]

        result = await postprocessor.apostprocess_nodes(nodes)

        mock_async_client.verify_and_wait.assert_not_called()
        assert len(result) == 1
