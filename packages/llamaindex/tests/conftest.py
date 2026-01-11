"""Test fixtures for Check LlamaIndex tests."""

import pytest
from dataclasses import dataclass
from typing import Any, Dict, Optional
from unittest.mock import MagicMock, patch, AsyncMock

from check import Check, AsyncCheck


@dataclass
class MockVerifyResponse:
    """Mock Check response object."""

    id: str
    status: str = "completed"
    verdict: Optional[str] = "true"
    confidence: Optional[float] = 0.95
    decision: Optional[str] = "accept"
    reasoning: Optional[str] = "Content verified as accurate"
    cached: bool = False


class MockNode:
    """Mock LlamaIndex node object."""

    def __init__(self, content: str, metadata: Optional[Dict[str, Any]] = None):
        self._content = content
        self.metadata = metadata

    def get_content(self) -> str:
        return self._content


@dataclass
class MockNodeWithScore:
    """Mock LlamaIndex NodeWithScore object."""

    node: MockNode
    score: float = 0.9


@dataclass
class MockQueryBundle:
    """Mock LlamaIndex QueryBundle object."""

    query_str: str


@pytest.fixture
def mock_verify_response():
    """Factory fixture to create mock Check responses."""

    def _mock_response(
        verdict: str = "true",
        confidence: float = 0.95,
        decision: str = "accept",
        reasoning: str = "Content verified",
        cached: bool = False,
        verification_id: str = "ver_test123",
    ) -> MockVerifyResponse:
        return MockVerifyResponse(
            id=verification_id,
            verdict=verdict,
            confidence=confidence,
            decision=decision,
            reasoning=reasoning,
            cached=cached,
        )

    return _mock_response


@pytest.fixture
def mock_node():
    """Factory fixture to create mock nodes."""

    def _mock_node(
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        score: float = 0.9,
    ) -> MockNodeWithScore:
        return MockNodeWithScore(
            node=MockNode(content=content, metadata=metadata),
            score=score,
        )

    return _mock_node


@pytest.fixture
def mock_query_bundle():
    """Factory fixture to create mock query bundles."""

    def _mock_bundle(query: str) -> MockQueryBundle:
        return MockQueryBundle(query_str=query)

    return _mock_bundle


@pytest.fixture
def mock_sync_client(mock_verify_response):
    """Create a real Check client with mocked HTTP internals."""
    with patch("httpx.Client") as MockHttpClient:
        mock_http = MagicMock()
        MockHttpClient.return_value = mock_http

        client = Check(api_key="test_api_key")
        # Replace verify_and_wait with a mock that returns our response
        client.verify_and_wait = MagicMock(return_value=mock_verify_response())

        yield client


@pytest.fixture
def mock_async_client(mock_verify_response):
    """Create a real AsyncCheck client with mocked HTTP internals."""
    with patch("httpx.AsyncClient") as MockHttpClient:
        mock_http = MagicMock()
        mock_http.aclose = AsyncMock()
        MockHttpClient.return_value = mock_http

        client = AsyncCheck(api_key="test_api_key")
        # Replace verify_and_wait with an async mock that returns our response
        client.verify_and_wait = AsyncMock(return_value=mock_verify_response())

        yield client
