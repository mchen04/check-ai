"""Test fixtures for Shove LangChain tests."""

import pytest
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4


@dataclass
class MockVerifyResponse:
    """Mock Shove response object."""

    id: str
    status: str = "completed"
    verdict: Optional[str] = "true"
    confidence: Optional[float] = 0.95
    decision: Optional[str] = "accept"
    reasoning: Optional[str] = "Content verified as accurate"
    cached: bool = False


@dataclass
class MockGeneration:
    """Mock LangChain generation object."""

    text: str
    generation_info: Optional[Dict[str, Any]] = None


@dataclass
class MockLLMResult:
    """Mock LangChain LLMResult object."""

    generations: List[List[MockGeneration]]
    llm_output: Optional[Dict[str, Any]] = None


@pytest.fixture
def mock_verify_response():
    """Factory fixture to create mock Shove responses."""

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
def mock_llm_result():
    """Factory fixture to create mock LLMResult objects."""

    def _mock_result(
        texts: List[str],
        with_generation_info: bool = True,
    ) -> MockLLMResult:
        generations = []
        for text in texts:
            gen = MockGeneration(
                text=text,
                generation_info={} if with_generation_info else None,
            )
            generations.append(gen)
        return MockLLMResult(generations=[[g] for g in generations])

    return _mock_result


@pytest.fixture
def mock_sync_client(mock_verify_response):
    """Create a mock sync Shove client."""
    client = MagicMock()
    client.verify_and_wait.return_value = mock_verify_response()
    return client


@pytest.fixture
def mock_async_client(mock_verify_response):
    """Create a mock async Shove client."""
    client = MagicMock()
    client.verify_and_wait = AsyncMock(return_value=mock_verify_response())
    return client


@pytest.fixture
def run_id():
    """Generate a test run ID."""
    return uuid4()
