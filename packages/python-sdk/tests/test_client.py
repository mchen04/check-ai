"""Tests for Check client."""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock

from check import Check, AsyncCheck
from check.errors import (
    CheckError,
    AuthenticationError,
    RateLimitError,
    TimeoutError,
    ValidationError,
    NotFoundError,
)


class TestCheckInit:
    """Test Check client initialization."""

    def test_init_requires_api_key(self):
        """Should raise error when API key is missing."""
        with pytest.raises(CheckError) as exc_info:
            Check(api_key="")
        assert exc_info.value.code == "MISSING_API_KEY"

    def test_init_with_valid_api_key(self, api_key):
        """Should create client with valid API key."""
        with patch("httpx.Client"):
            client = Check(api_key=api_key)
            assert client is not None

    def test_init_with_custom_base_url(self, api_key):
        """Should accept custom base URL."""
        with patch("httpx.Client"):
            client = Check(api_key=api_key, base_url="https://custom.api.com/")
            assert client._base_url == "https://custom.api.com"

    def test_init_strips_trailing_slash(self, api_key):
        """Should strip trailing slash from base URL."""
        with patch("httpx.Client"):
            client = Check(api_key=api_key, base_url="https://api.check.ai/")
            assert client._base_url == "https://api.check.ai"

    def test_init_with_retry_disabled(self, api_key):
        """Should disable retry when retry=False."""
        with patch("httpx.Client"):
            client = Check(api_key=api_key, retry=False)
            assert client._retry_config is None

    def test_init_with_retry_enabled(self, api_key):
        """Should use default retry config when retry=True."""
        with patch("httpx.Client"):
            client = Check(api_key=api_key, retry=True)
            assert client._retry_config is not None


class TestCheckVerify:
    """Test verify method."""

    def test_verify_sends_correct_request(self, api_key, mock_response):
        """Should send POST request to /v1/verify."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response({
                "id": "ver_123",
                "status": "pending",
            })
            MockClient.return_value = mock_client

            client = Check(api_key=api_key)
            result = client.verify(
                content="Test content",
                methods={"reasoning": 1.0},
            )

            mock_client.request.assert_called_once()
            args, kwargs = mock_client.request.call_args
            assert args[0] == "POST"
            assert args[1] == "/v1/verify"
            assert result.id == "ver_123"

    def test_verify_includes_context(self, api_key, mock_response):
        """Should include context in request."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response({
                "id": "ver_123",
                "status": "pending",
            })
            MockClient.return_value = mock_client

            client = Check(api_key=api_key)
            client.verify(
                content="Test content",
                methods={"reasoning": 1.0},
                context={"source": "test"},
            )

            _, kwargs = mock_client.request.call_args
            body = kwargs["json"]
            assert body["context"] == {"source": "test"}

    def test_verify_includes_idempotency_key(self, api_key, mock_response):
        """Should include idempotency key in request."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response({
                "id": "ver_123",
                "status": "pending",
            })
            MockClient.return_value = mock_client

            client = Check(api_key=api_key)
            client.verify(
                content="Test content",
                methods={"reasoning": 1.0},
                idempotency_key="key123",
            )

            _, kwargs = mock_client.request.call_args
            body = kwargs["json"]
            assert body["idempotencyKey"] == "key123"


class TestCheckGetVerification:
    """Test get_verification method."""

    def test_get_verification_requires_id(self, api_key):
        """Should raise error when ID is missing."""
        with patch("httpx.Client"):
            client = Check(api_key=api_key)
            with pytest.raises(CheckError) as exc_info:
                client.get_verification("")
            assert exc_info.value.code == "MISSING_ID"

    def test_get_verification_returns_result(self, api_key, mock_response):
        """Should return verification result."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response({
                "id": "ver_123",
                "status": "completed",
                "verdict": "true",
                "confidence": 0.95,
            })
            MockClient.return_value = mock_client

            client = Check(api_key=api_key)
            result = client.get_verification("ver_123")

            assert result.status == "completed"
            assert result.verdict == "true"
            assert result.confidence == 0.95


class TestCheckVerifyAndWait:
    """Test verify_and_wait method."""

    def test_verify_and_wait_polls_until_complete(self, api_key, mock_response):
        """Should poll until verification completes."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            responses = [
                mock_response({"id": "ver_123", "status": "pending"}),
                mock_response({"id": "ver_123", "status": "processing"}),
                mock_response({
                    "id": "ver_123",
                    "status": "completed",
                    "verdict": "true",
                    "confidence": 0.95,
                }),
            ]
            mock_client.request.side_effect = responses
            MockClient.return_value = mock_client

            client = Check(api_key=api_key)
            result = client.verify_and_wait(
                content="Test",
                methods={"reasoning": 1.0},
                poll_interval=0.01,
                timeout=5.0,
            )

            assert result.status == "completed"
            assert result.verdict == "true"
            assert mock_client.request.call_count == 3

    def test_verify_and_wait_timeout(self, api_key, mock_response):
        """Should raise TimeoutError when timeout exceeded."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response({
                "id": "ver_123",
                "status": "processing",
            })
            MockClient.return_value = mock_client

            client = Check(api_key=api_key)
            with pytest.raises(TimeoutError):
                client.verify_and_wait(
                    content="Test",
                    methods={"reasoning": 1.0},
                    poll_interval=0.01,
                    timeout=0.05,
                )


class TestCheckBatchOperations:
    """Test batch verification operations."""

    def test_create_batch(self, api_key, mock_response):
        """Should create batch job."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response({
                "id": "batch_123",
                "status": "pending",
                "totalItems": 3,
                "message": "Batch created",
            })
            MockClient.return_value = mock_client

            client = Check(api_key=api_key)
            result = client.create_batch(
                methods={"reasoning": 1.0},
                items=[
                    {"content": "Item 1"},
                    {"content": "Item 2"},
                    {"content": "Item 3"},
                ],
            )

            assert result.id == "batch_123"
            assert result.total_items == 3

    def test_get_batch_requires_id(self, api_key):
        """Should raise error when batch ID is missing."""
        with patch("httpx.Client"):
            client = Check(api_key=api_key)
            with pytest.raises(CheckError):
                client.get_batch("")

    def test_get_batch(self, api_key, mock_response):
        """Should return batch details."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response({
                "id": "batch_123",
                "status": "processing",
                "totalItems": 10,
                "completedItems": 5,
                "failedItems": 0,
                "progress": 50,
                "methods": {"reasoning": 1.0},
                "createdAt": "2024-01-01T00:00:00Z",
            })
            MockClient.return_value = mock_client

            client = Check(api_key=api_key)
            result = client.get_batch("batch_123")

            assert result.progress == 50
            assert result.completed_items == 5


class TestCheckErrorHandling:
    """Test error handling."""

    def test_authentication_error_on_401(self, api_key, mock_response):
        """Should raise AuthenticationError on 401."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response(
                {"error": "Invalid API key", "code": "AUTHENTICATION_ERROR"},
                status_code=401,
            )
            MockClient.return_value = mock_client

            client = Check(api_key=api_key, retry=False)
            with pytest.raises(AuthenticationError):
                client.verify(content="Test", methods={"reasoning": 1.0})

    def test_validation_error_on_400(self, api_key, mock_response):
        """Should raise ValidationError on 400."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response(
                {"error": "Invalid request", "code": "VALIDATION_ERROR"},
                status_code=400,
            )
            MockClient.return_value = mock_client

            client = Check(api_key=api_key, retry=False)
            with pytest.raises(ValidationError):
                # Use valid local input that server rejects
                client.verify(content="Test content", methods={"reasoning": 1.0})

    def test_not_found_error_on_404(self, api_key, mock_response):
        """Should raise NotFoundError on 404."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response(
                {"error": "Not found", "code": "NOT_FOUND"},
                status_code=404,
            )
            MockClient.return_value = mock_client

            client = Check(api_key=api_key, retry=False)
            with pytest.raises(NotFoundError):
                client.get_verification("ver_notexist")

    def test_rate_limit_error_on_429(self, api_key, mock_response):
        """Should raise RateLimitError on 429 with retry_after."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            mock_client.request.return_value = mock_response(
                {"error": "Rate limit exceeded", "code": "RATE_LIMIT"},
                status_code=429,
                headers={"Retry-After": "30"},
            )
            MockClient.return_value = mock_client

            client = Check(api_key=api_key, retry=False)
            with pytest.raises(RateLimitError) as exc_info:
                client.verify(content="Test", methods={"reasoning": 1.0})
            assert exc_info.value.retry_after == 30


class TestCheckContextManager:
    """Test context manager support."""

    def test_context_manager(self, api_key):
        """Should work as context manager."""
        with patch("httpx.Client") as MockClient:
            mock_client = MagicMock()
            MockClient.return_value = mock_client

            with Check(api_key=api_key) as client:
                assert client is not None

            mock_client.close.assert_called_once()


class TestAsyncCheck:
    """Test async Check client."""

    def test_init_requires_api_key(self):
        """Should raise error when API key is missing."""
        with pytest.raises(CheckError):
            AsyncCheck(api_key="")

    @pytest.mark.asyncio
    async def test_verify_async(self, api_key, mock_response):
        """Should send async request."""
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = MagicMock()
            mock_client.request = AsyncMock(return_value=mock_response({
                "id": "ver_123",
                "status": "pending",
            }))
            mock_client.aclose = AsyncMock()
            MockClient.return_value = mock_client

            client = AsyncCheck(api_key=api_key)
            result = await client.verify(
                content="Test",
                methods={"reasoning": 1.0},
            )

            assert result.id == "ver_123"
            await client.close()

    @pytest.mark.asyncio
    async def test_async_context_manager(self, api_key, mock_response):
        """Should work as async context manager."""
        with patch("httpx.AsyncClient") as MockClient:
            mock_client = MagicMock()
            mock_client.request = AsyncMock(return_value=mock_response({
                "id": "ver_123",
                "status": "pending",
            }))
            mock_client.aclose = AsyncMock()
            MockClient.return_value = mock_client

            async with AsyncCheck(api_key=api_key) as client:
                result = await client.verify(
                    content="Test",
                    methods={"reasoning": 1.0},
                )
                assert result.id == "ver_123"

            mock_client.aclose.assert_called_once()
