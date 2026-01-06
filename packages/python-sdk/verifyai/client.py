"""
VerifyAI Client
Main client classes for interacting with the VerifyAI API
"""

import asyncio
import time
from typing import Any, Dict, Optional, Union

import httpx

from verifyai.types import (
    MethodsConfig,
    VerifyRequest,
    VerifyResponse,
    WaitOptions,
)
from verifyai.errors import (
    VerifyAIError,
    RateLimitError,
    TimeoutError,
    get_error_class,
)


DEFAULT_BASE_URL = "https://api.verifyai.dev"
DEFAULT_TIMEOUT = 30.0
DEFAULT_POLL_INTERVAL = 1.0
DEFAULT_WAIT_TIMEOUT = 60.0


class VerifyAI:
    """
    Synchronous VerifyAI client.

    Example:
        >>> from verifyai import VerifyAI
        >>> client = VerifyAI(api_key="vfy_...")
        >>> result = client.verify_and_wait(
        ...     content="The Earth orbits the Sun.",
        ...     methods={"reasoning": 1.0}
        ... )
        >>> print(result.verdict)  # 'true'
        >>> print(result.confidence)  # 0.95
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        """
        Initialize the VerifyAI client.

        Args:
            api_key: Your VerifyAI API key (starts with vfy_)
            base_url: Base URL for the API (defaults to https://api.verifyai.dev)
            timeout: Request timeout in seconds
        """
        if not api_key:
            raise VerifyAIError("API key is required", code="MISSING_API_KEY")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "verifyai-python/0.1.0",
            },
        )

    def __enter__(self) -> "VerifyAI":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def verify(
        self,
        content: str,
        methods: Union[MethodsConfig, Dict[str, float]],
        *,
        context: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> VerifyResponse:
        """
        Start a verification request.

        This initiates a verification and returns immediately. Use `get_verification`
        to poll for results, or use `verify_and_wait` for automatic polling.

        Args:
            content: Content to verify (1-50000 characters)
            methods: Verification methods to use with their weights
            context: Optional context for verification
            idempotency_key: Optional key for deduplication

        Returns:
            Verification response with status 'pending' or 'processing'

        Example:
            >>> response = client.verify(
            ...     content="Paris is the capital of France.",
            ...     methods={"reasoning": 1.0, "tool": 0.5}
            ... )
            >>> print(response.id)  # Use this to poll for results
        """
        # Convert dict to MethodsConfig if needed
        if isinstance(methods, dict):
            methods = MethodsConfig(**methods)

        request = VerifyRequest(
            content=content,
            methods=methods,
            context=context,
            idempotency_key=idempotency_key,
        )

        return self._request(
            "POST",
            "/v1/verify",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

    def get_verification(self, verification_id: str) -> VerifyResponse:
        """
        Get verification status and results.

        Args:
            verification_id: Verification ID

        Returns:
            Current verification status and results

        Example:
            >>> result = client.get_verification("ver_abc123")
            >>> if result.status == "completed":
            ...     print(result.verdict)
        """
        if not verification_id:
            raise VerifyAIError("Verification ID is required", code="MISSING_ID")

        return self._request("GET", f"/v1/verify/{verification_id}")

    def verify_and_wait(
        self,
        content: str,
        methods: Union[MethodsConfig, Dict[str, float]],
        *,
        context: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        timeout: float = DEFAULT_WAIT_TIMEOUT,
    ) -> VerifyResponse:
        """
        Start verification and wait for completion.

        This is the recommended method for most use cases. It starts a verification
        and automatically polls until completion or timeout.

        Args:
            content: Content to verify (1-50000 characters)
            methods: Verification methods to use with their weights
            context: Optional context for verification
            idempotency_key: Optional key for deduplication
            poll_interval: Polling interval in seconds (default: 1.0)
            timeout: Maximum time to wait in seconds (default: 60.0)

        Returns:
            Completed verification result

        Example:
            >>> result = client.verify_and_wait(
            ...     content="Water boils at 100°C at sea level.",
            ...     methods={"reasoning": 1.0, "tool": 1.0}
            ... )
            >>> print(result.verdict)  # 'true'
            >>> print(result.decision)  # 'accept'
        """
        start_time = time.monotonic()

        # Start the verification
        response = self.verify(
            content=content,
            methods=methods,
            context=context,
            idempotency_key=idempotency_key,
        )

        # Poll until complete or timeout
        while response.status in ("pending", "processing"):
            # Check timeout
            elapsed = time.monotonic() - start_time
            if elapsed > timeout:
                raise TimeoutError(
                    f"Verification timed out after {timeout}s. Last status: {response.status}",
                    details={"verification_id": response.id, "last_status": response.status},
                )

            # Wait before polling
            time.sleep(poll_interval)

            # Poll for status
            response = self.get_verification(response.id)

        return response

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
    ) -> VerifyResponse:
        """Make an authenticated request to the API."""
        try:
            response = self._client.request(method, path, json=json)
            data = response.json()

            # Handle errors
            if not response.is_success:
                self._handle_error(response, data)

            return VerifyResponse.model_validate(data)

        except httpx.TimeoutException as e:
            raise TimeoutError(f"Request timed out: {e}") from e
        except httpx.RequestError as e:
            raise VerifyAIError(f"Network error: {e}", code="NETWORK_ERROR") from e

    def _handle_error(
        self,
        response: httpx.Response,
        data: Dict[str, Any],
    ) -> None:
        """Handle error response from API."""
        error_msg = data.get("error", "Unknown error")
        code = data.get("code")
        request_id = data.get("requestId")
        details = data.get("details")

        # Special handling for rate limit
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            raise RateLimitError(
                error_msg,
                code=code,
                status=response.status_code,
                request_id=request_id,
                details=details,
                retry_after=int(retry_after) if retry_after else None,
            )

        # Get appropriate error class
        error_class = get_error_class(code, response.status_code)
        raise error_class(
            error_msg,
            code=code,
            status=response.status_code,
            request_id=request_id,
            details=details,
        )


class AsyncVerifyAI:
    """
    Asynchronous VerifyAI client.

    Example:
        >>> import asyncio
        >>> from verifyai import AsyncVerifyAI
        >>>
        >>> async def main():
        ...     client = AsyncVerifyAI(api_key="vfy_...")
        ...     result = await client.verify_and_wait(
        ...         content="The Earth orbits the Sun.",
        ...         methods={"reasoning": 1.0}
        ...     )
        ...     print(result.verdict)
        ...     await client.close()
        >>>
        >>> asyncio.run(main())
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        """
        Initialize the async VerifyAI client.

        Args:
            api_key: Your VerifyAI API key (starts with vfy_)
            base_url: Base URL for the API (defaults to https://api.verifyai.dev)
            timeout: Request timeout in seconds
        """
        if not api_key:
            raise VerifyAIError("API key is required", code="MISSING_API_KEY")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "verifyai-python/0.1.0",
            },
        )

    async def __aenter__(self) -> "AsyncVerifyAI":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def verify(
        self,
        content: str,
        methods: Union[MethodsConfig, Dict[str, float]],
        *,
        context: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> VerifyResponse:
        """
        Start a verification request.

        Args:
            content: Content to verify (1-50000 characters)
            methods: Verification methods to use with their weights
            context: Optional context for verification
            idempotency_key: Optional key for deduplication

        Returns:
            Verification response with status 'pending' or 'processing'
        """
        # Convert dict to MethodsConfig if needed
        if isinstance(methods, dict):
            methods = MethodsConfig(**methods)

        request = VerifyRequest(
            content=content,
            methods=methods,
            context=context,
            idempotency_key=idempotency_key,
        )

        return await self._request(
            "POST",
            "/v1/verify",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )

    async def get_verification(self, verification_id: str) -> VerifyResponse:
        """
        Get verification status and results.

        Args:
            verification_id: Verification ID

        Returns:
            Current verification status and results
        """
        if not verification_id:
            raise VerifyAIError("Verification ID is required", code="MISSING_ID")

        return await self._request("GET", f"/v1/verify/{verification_id}")

    async def verify_and_wait(
        self,
        content: str,
        methods: Union[MethodsConfig, Dict[str, float]],
        *,
        context: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        timeout: float = DEFAULT_WAIT_TIMEOUT,
    ) -> VerifyResponse:
        """
        Start verification and wait for completion.

        Args:
            content: Content to verify (1-50000 characters)
            methods: Verification methods to use with their weights
            context: Optional context for verification
            idempotency_key: Optional key for deduplication
            poll_interval: Polling interval in seconds (default: 1.0)
            timeout: Maximum time to wait in seconds (default: 60.0)

        Returns:
            Completed verification result
        """
        start_time = time.monotonic()

        # Start the verification
        response = await self.verify(
            content=content,
            methods=methods,
            context=context,
            idempotency_key=idempotency_key,
        )

        # Poll until complete or timeout
        while response.status in ("pending", "processing"):
            # Check timeout
            elapsed = time.monotonic() - start_time
            if elapsed > timeout:
                raise TimeoutError(
                    f"Verification timed out after {timeout}s. Last status: {response.status}",
                    details={"verification_id": response.id, "last_status": response.status},
                )

            # Wait before polling
            await asyncio.sleep(poll_interval)

            # Poll for status
            response = await self.get_verification(response.id)

        return response

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
    ) -> VerifyResponse:
        """Make an authenticated request to the API."""
        try:
            response = await self._client.request(method, path, json=json)
            data = response.json()

            # Handle errors
            if not response.is_success:
                self._handle_error(response, data)

            return VerifyResponse.model_validate(data)

        except httpx.TimeoutException as e:
            raise TimeoutError(f"Request timed out: {e}") from e
        except httpx.RequestError as e:
            raise VerifyAIError(f"Network error: {e}", code="NETWORK_ERROR") from e

    def _handle_error(
        self,
        response: httpx.Response,
        data: Dict[str, Any],
    ) -> None:
        """Handle error response from API."""
        error_msg = data.get("error", "Unknown error")
        code = data.get("code")
        request_id = data.get("requestId")
        details = data.get("details")

        # Special handling for rate limit
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            raise RateLimitError(
                error_msg,
                code=code,
                status=response.status_code,
                request_id=request_id,
                details=details,
                retry_after=int(retry_after) if retry_after else None,
            )

        # Get appropriate error class
        error_class = get_error_class(code, response.status_code)
        raise error_class(
            error_msg,
            code=code,
            status=response.status_code,
            request_id=request_id,
            details=details,
        )
