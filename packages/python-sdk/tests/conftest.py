"""Test fixtures for VerifyAI SDK tests."""

import pytest
from unittest.mock import MagicMock
import httpx


@pytest.fixture
def api_key() -> str:
    """Return a test API key."""
    return "vfy_test123"


@pytest.fixture
def mock_response():
    """Factory fixture to create mock httpx responses."""

    def _mock_response(
        data: dict,
        status_code: int = 200,
        headers: dict | None = None,
    ) -> MagicMock:
        response = MagicMock(spec=httpx.Response)
        response.status_code = status_code
        response.is_success = 200 <= status_code < 300
        response.json.return_value = data
        response.headers = headers or {}
        return response

    return _mock_response
