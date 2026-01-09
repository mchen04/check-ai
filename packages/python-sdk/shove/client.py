"""
Shove Client
Main client classes for interacting with the Shove API
"""

import asyncio
import random
import time
from typing import Any, BinaryIO, Callable, Dict, List, Optional, Union
from pathlib import Path

import httpx

from shove.types import (
    MethodsConfig,
    VerifyRequest,
    VerifyResponse,
    RetryConfig,
    BatchItem,
    CreateBatchRequest,
    CreateBatchResponse,
    BatchJob,
    BatchResultsResponse,
    ListBatchesResponse,
    FileUploadResponse,
    BatchStatus,
)
from shove.errors import (
    ShoveError,
    RateLimitError,
    TimeoutError,
    get_error_class,
)

DEFAULT_BASE_URL = "https://api.shove.ai"
DEFAULT_TIMEOUT = 30.0
DEFAULT_POLL_INTERVAL = 1.0
DEFAULT_WAIT_TIMEOUT = 60.0
DEFAULT_BATCH_POLL_INTERVAL = 5.0
DEFAULT_BATCH_WAIT_TIMEOUT = 3600.0  # 1 hour

# Default retry configuration
DEFAULT_RETRY_CONFIG = RetryConfig()


class Shove:
    """
    Synchronous Shove client.

    Example:
        >>> from shove import Shove
        >>> client = Shove(api_key="vfy_...")
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
        retry: Optional[Union[RetryConfig, bool]] = None,
    ) -> None:
        """
        Initialize the Shove client.

        Args:
            api_key: Your Shove API key (starts with vfy_)
            base_url: Base URL for the API (defaults to https://api.shove.ai)
            timeout: Request timeout in seconds
            retry: Retry configuration. Pass False to disable, True or None for
                   defaults, or a RetryConfig instance for custom configuration.
        """
        if not api_key:
            raise ShoveError("API key is required", code="MISSING_API_KEY")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "shove-python/0.1.0",
            },
        )

        # Configure retry behavior
        if retry is False:
            self._retry_config: Optional[RetryConfig] = None
        elif retry is True or retry is None:
            self._retry_config = DEFAULT_RETRY_CONFIG
        else:
            self._retry_config = retry

    def __enter__(self) -> "Shove":
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
            raise ShoveError("Verification ID is required", code="MISSING_ID")

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
        """Make an authenticated request to the API with automatic retries."""
        max_attempts = (
            self._retry_config.max_retries + 1 if self._retry_config else 1
        )
        last_error: Optional[Exception] = None

        for attempt in range(max_attempts):
            try:
                return self._execute_request(method, path, json=json)
            except Exception as e:
                last_error = e

                # Check if we should retry
                if not self._should_retry(e, attempt):
                    raise

                # Calculate delay for next retry
                delay = self._calculate_retry_delay(attempt, e)
                time.sleep(delay)

        # Should never reach here, but Python needs this
        raise last_error or ShoveError("Request failed", code="UNKNOWN_ERROR")

    def _execute_request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
    ) -> VerifyResponse:
        """Execute a single request attempt."""
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
            raise ShoveError(f"Network error: {e}", code="NETWORK_ERROR") from e

    def _should_retry(self, error: Exception, attempt: int) -> bool:
        """Determine if a request should be retried."""
        if not self._retry_config:
            return False

        if attempt >= self._retry_config.max_retries:
            return False

        # Retry on rate limit errors
        if isinstance(error, RateLimitError):
            return True

        # Retry on specific status codes
        if isinstance(error, ShoveError) and error.status:
            return error.status in self._retry_config.retryable_statuses

        # Retry on network errors
        if isinstance(error, ShoveError) and error.code == "NETWORK_ERROR":
            return True

        # Retry on timeout
        if isinstance(error, TimeoutError):
            return True

        return False

    def _calculate_retry_delay(self, attempt: int, error: Exception) -> float:
        """Calculate delay before next retry attempt using exponential backoff."""
        if not self._retry_config:
            return 0

        # Use Retry-After header if available
        if isinstance(error, RateLimitError) and error.retry_after:
            return float(error.retry_after)

        # Calculate exponential backoff
        delay = self._retry_config.initial_delay * (
            self._retry_config.multiplier ** attempt
        )

        # Cap at maximum delay
        delay = min(delay, self._retry_config.max_delay)

        # Add jitter to avoid thundering herd
        if self._retry_config.jitter:
            jitter_factor = 0.5 + random.random() * 0.5  # 0.5 to 1.0
            delay = delay * jitter_factor

        return delay

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

    # =========================================================================
    # BATCH PROCESSING METHODS
    # =========================================================================

    def create_batch(
        self,
        methods: Union[MethodsConfig, Dict[str, float]],
        *,
        items: Optional[List[Union[BatchItem, Dict[str, Any]]]] = None,
        file_id: Optional[str] = None,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CreateBatchResponse:
        """
        Create a batch verification job.

        Batch processing allows you to verify multiple pieces of content in a single
        request. Items are processed asynchronously and results can be retrieved later.

        Args:
            methods: Verification methods to use with their weights
            items: List of items to verify (mutually exclusive with file_id)
            file_id: File ID from upload (mutually exclusive with items)
            webhook_url: Optional webhook URL for completion notification
            metadata: Optional metadata to attach to the batch

        Returns:
            Batch creation response with job ID

        Example:
            >>> batch = client.create_batch(
            ...     methods={"reasoning": 1.0},
            ...     items=[
            ...         {"content": "The Earth is round."},
            ...         {"content": "Water freezes at 0°C."},
            ...     ]
            ... )
            >>> print(batch.id)  # Use to poll for results
        """
        # Convert dict to MethodsConfig if needed
        if isinstance(methods, dict):
            methods = MethodsConfig(**methods)

        # Convert item dicts to BatchItem if needed
        batch_items = None
        if items:
            batch_items = [
                BatchItem(**item) if isinstance(item, dict) else item
                for item in items
            ]

        request = CreateBatchRequest(
            items=batch_items,
            file_id=file_id,
            methods=methods,
            webhook_url=webhook_url,
            metadata=metadata,
        )

        return self._batch_request(
            "POST",
            "/v1/batch",
            json=request.model_dump(by_alias=True, exclude_none=True),
            response_model=CreateBatchResponse,
        )

    def get_batch(self, batch_id: str) -> BatchJob:
        """
        Get batch job status and details.

        Args:
            batch_id: Batch job ID

        Returns:
            Batch job details including progress

        Example:
            >>> batch = client.get_batch("batch_abc123")
            >>> print(f"Progress: {batch.progress}%")
            >>> print(f"Status: {batch.status}")
        """
        if not batch_id:
            raise ShoveError("Batch ID is required", code="MISSING_ID")

        return self._batch_request(
            "GET",
            f"/v1/batch/{batch_id}",
            response_model=BatchJob,
        )

    def list_batches(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> ListBatchesResponse:
        """
        List batch jobs.

        Args:
            limit: Maximum number of batches to return (default: 20, max: 100)
            offset: Offset for pagination
            status: Filter by status

        Returns:
            Paginated list of batch jobs

        Example:
            >>> response = client.list_batches(limit=10, status="completed")
            >>> for batch in response.data:
            ...     print(f"{batch.id}: {batch.status}")
        """
        params = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status

        return self._batch_request(
            "GET",
            "/v1/batch",
            params=params,
            response_model=ListBatchesResponse,
        )

    def cancel_batch(self, batch_id: str) -> BatchJob:
        """
        Cancel a batch job.

        Cancels a batch job that is pending or processing. Items that have already
        been processed will retain their results.

        Args:
            batch_id: Batch job ID

        Returns:
            Updated batch job details

        Example:
            >>> batch = client.cancel_batch("batch_abc123")
            >>> print(batch.status)  # 'cancelled'
        """
        if not batch_id:
            raise ShoveError("Batch ID is required", code="MISSING_ID")

        return self._batch_request(
            "POST",
            f"/v1/batch/{batch_id}/cancel",
            response_model=BatchJob,
        )

    def get_batch_results(
        self,
        batch_id: str,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> BatchResultsResponse:
        """
        Get batch results.

        Retrieves verification results for a batch job. For large batches,
        results are paginated.

        Args:
            batch_id: Batch job ID
            limit: Maximum number of results to return
            offset: Offset for pagination

        Returns:
            Batch results with individual item verdicts

        Example:
            >>> results = client.get_batch_results("batch_abc123")
            >>> for result in results.results:
            ...     print(f"Item {result.index}: {result.verdict} ({result.confidence})")
        """
        if not batch_id:
            raise ShoveError("Batch ID is required", code="MISSING_ID")

        return self._batch_request(
            "GET",
            f"/v1/batch/{batch_id}/results",
            params={"limit": limit, "offset": offset},
            response_model=BatchResultsResponse,
        )

    def upload_batch_file(
        self,
        file: Union[str, Path, BinaryIO, bytes],
        filename: Optional[str] = None,
    ) -> FileUploadResponse:
        """
        Upload a file for batch processing.

        Uploads a CSV or JSON file containing items to verify. The returned file_id
        can be used when creating a batch job.

        Args:
            file: File path, file object, or bytes to upload
            filename: Filename with extension (.csv or .json). Required if file is bytes.

        Returns:
            Upload response with file_id

        Example:
            >>> # From a file path
            >>> upload = client.upload_batch_file("items.csv")
            >>>
            >>> # Create batch using uploaded file
            >>> batch = client.create_batch(
            ...     methods={"reasoning": 1.0},
            ...     file_id=upload.file_id
            ... )
        """
        # Determine file content and name
        if isinstance(file, (str, Path)):
            path = Path(file)
            filename = filename or path.name
            content = path.read_bytes()
        elif isinstance(file, bytes):
            if not filename:
                raise ShoveError(
                    "filename is required when uploading bytes",
                    code="MISSING_FILENAME"
                )
            content = file
        else:
            # File-like object
            content = file.read()
            if hasattr(file, 'name') and not filename:
                filename = Path(file.name).name

        if not filename:
            raise ShoveError(
                "Could not determine filename. Please provide filename parameter.",
                code="MISSING_FILENAME"
            )

        try:
            response = self._client.post(
                "/v1/batch/upload",
                files={"file": (filename, content)},
            )
            data = response.json()

            if not response.is_success:
                self._handle_error(response, data)

            return FileUploadResponse.model_validate(data)

        except httpx.TimeoutException as e:
            raise TimeoutError(f"Upload timed out: {e}") from e
        except httpx.RequestError as e:
            raise ShoveError(f"Upload error: {e}", code="UPLOAD_ERROR") from e

    def create_batch_and_wait(
        self,
        methods: Union[MethodsConfig, Dict[str, float]],
        *,
        items: Optional[List[Union[BatchItem, Dict[str, Any]]]] = None,
        file_id: Optional[str] = None,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        poll_interval: float = DEFAULT_BATCH_POLL_INTERVAL,
        timeout: float = DEFAULT_BATCH_WAIT_TIMEOUT,
        on_progress: Optional[Callable[[BatchJob], None]] = None,
    ) -> BatchJob:
        """
        Create a batch and wait for completion.

        This is the recommended method for batch processing when you want to wait
        for all results. It creates a batch and polls until completion.

        Args:
            methods: Verification methods to use with their weights
            items: List of items to verify (mutually exclusive with file_id)
            file_id: File ID from upload (mutually exclusive with items)
            webhook_url: Optional webhook URL for completion notification
            metadata: Optional metadata to attach to the batch
            poll_interval: Polling interval in seconds (default: 5.0)
            timeout: Maximum time to wait in seconds (default: 3600.0)
            on_progress: Optional callback called with batch status on each poll

        Returns:
            Completed batch job

        Example:
            >>> batch = client.create_batch_and_wait(
            ...     methods={"reasoning": 1.0},
            ...     items=items,
            ...     on_progress=lambda b: print(f"Progress: {b.progress}%")
            ... )
            >>> results = client.get_batch_results(batch.id)
        """
        start_time = time.monotonic()

        # Create the batch
        create_response = self.create_batch(
            methods=methods,
            items=items,
            file_id=file_id,
            webhook_url=webhook_url,
            metadata=metadata,
        )

        # If there were validation errors, the batch failed immediately
        if create_response.status == "failed":
            return self.get_batch(create_response.id)

        # Poll until complete or timeout
        batch = self.get_batch(create_response.id)

        while batch.status in ("pending", "validating", "processing"):
            # Check timeout
            elapsed = time.monotonic() - start_time
            if elapsed > timeout:
                raise TimeoutError(
                    f"Batch timed out after {timeout}s. Status: {batch.status}, Progress: {batch.progress}%",
                    details={"batch_id": batch.id, "progress": batch.progress},
                )

            # Call progress callback if provided
            if on_progress:
                on_progress(batch)

            # Wait before polling
            time.sleep(poll_interval)

            # Poll for status
            batch = self.get_batch(batch.id)

        # Final progress callback
        if on_progress:
            on_progress(batch)

        return batch

    def _batch_request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        response_model: type,
    ) -> Any:
        """Make an authenticated request for batch operations with automatic retries."""
        max_attempts = (
            self._retry_config.max_retries + 1 if self._retry_config else 1
        )
        last_error: Optional[Exception] = None

        for attempt in range(max_attempts):
            try:
                return self._execute_batch_request(
                    method, path, json=json, params=params, response_model=response_model
                )
            except Exception as e:
                last_error = e

                # Check if we should retry
                if not self._should_retry(e, attempt):
                    raise

                # Calculate delay for next retry
                delay = self._calculate_retry_delay(attempt, e)
                time.sleep(delay)

        # Should never reach here, but Python needs this
        raise last_error or ShoveError("Request failed", code="UNKNOWN_ERROR")

    def _execute_batch_request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        response_model: type,
    ) -> Any:
        """Execute a single batch request attempt."""
        try:
            response = self._client.request(
                method,
                path,
                json=json,
                params=params,
            )
            data = response.json()

            if not response.is_success:
                self._handle_error(response, data)

            return response_model.model_validate(data)

        except httpx.TimeoutException as e:
            raise TimeoutError(f"Request timed out: {e}") from e
        except httpx.RequestError as e:
            raise ShoveError(f"Network error: {e}", code="NETWORK_ERROR") from e


class AsyncShove:
    """
    Asynchronous Shove client.

    Example:
        >>> import asyncio
        >>> from shove import AsyncShove
        >>>
        >>> async def main():
        ...     client = AsyncShove(api_key="vfy_...")
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
        retry: Optional[Union[RetryConfig, bool]] = None,
    ) -> None:
        """
        Initialize the async Shove client.

        Args:
            api_key: Your Shove API key (starts with vfy_)
            base_url: Base URL for the API (defaults to https://api.shove.ai)
            timeout: Request timeout in seconds
            retry: Retry configuration. Pass False to disable, True or None for
                   defaults, or a RetryConfig instance for custom configuration.
        """
        if not api_key:
            raise ShoveError("API key is required", code="MISSING_API_KEY")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "shove-python/0.1.0",
            },
        )

        # Configure retry behavior
        if retry is False:
            self._retry_config: Optional[RetryConfig] = None
        elif retry is True or retry is None:
            self._retry_config = DEFAULT_RETRY_CONFIG
        else:
            self._retry_config = retry

    async def __aenter__(self) -> "AsyncShove":
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
            raise ShoveError("Verification ID is required", code="MISSING_ID")

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
        """Make an authenticated request to the API with automatic retries."""
        max_attempts = (
            self._retry_config.max_retries + 1 if self._retry_config else 1
        )
        last_error: Optional[Exception] = None

        for attempt in range(max_attempts):
            try:
                return await self._execute_request(method, path, json=json)
            except Exception as e:
                last_error = e

                # Check if we should retry
                if not self._should_retry(e, attempt):
                    raise

                # Calculate delay for next retry
                delay = self._calculate_retry_delay(attempt, e)
                await asyncio.sleep(delay)

        # Should never reach here, but Python needs this
        raise last_error or ShoveError("Request failed", code="UNKNOWN_ERROR")

    async def _execute_request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
    ) -> VerifyResponse:
        """Execute a single request attempt."""
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
            raise ShoveError(f"Network error: {e}", code="NETWORK_ERROR") from e

    def _should_retry(self, error: Exception, attempt: int) -> bool:
        """Determine if a request should be retried."""
        if not self._retry_config:
            return False

        if attempt >= self._retry_config.max_retries:
            return False

        # Retry on rate limit errors
        if isinstance(error, RateLimitError):
            return True

        # Retry on specific status codes
        if isinstance(error, ShoveError) and error.status:
            return error.status in self._retry_config.retryable_statuses

        # Retry on network errors
        if isinstance(error, ShoveError) and error.code == "NETWORK_ERROR":
            return True

        # Retry on timeout
        if isinstance(error, TimeoutError):
            return True

        return False

    def _calculate_retry_delay(self, attempt: int, error: Exception) -> float:
        """Calculate delay before next retry attempt using exponential backoff."""
        if not self._retry_config:
            return 0

        # Use Retry-After header if available
        if isinstance(error, RateLimitError) and error.retry_after:
            return float(error.retry_after)

        # Calculate exponential backoff
        delay = self._retry_config.initial_delay * (
            self._retry_config.multiplier ** attempt
        )

        # Cap at maximum delay
        delay = min(delay, self._retry_config.max_delay)

        # Add jitter to avoid thundering herd
        if self._retry_config.jitter:
            jitter_factor = 0.5 + random.random() * 0.5  # 0.5 to 1.0
            delay = delay * jitter_factor

        return delay

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

    # =========================================================================
    # BATCH PROCESSING METHODS
    # =========================================================================

    async def create_batch(
        self,
        methods: Union[MethodsConfig, Dict[str, float]],
        *,
        items: Optional[List[Union[BatchItem, Dict[str, Any]]]] = None,
        file_id: Optional[str] = None,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CreateBatchResponse:
        """
        Create a batch verification job.

        Batch processing allows you to verify multiple pieces of content in a
        single request. Items are processed asynchronously.

        Args:
            methods: Verification methods to use with their weights
            items: List of items to verify (mutually exclusive with file_id)
            file_id: File ID from upload (mutually exclusive with items)
            webhook_url: Optional webhook URL for completion notification
            metadata: Optional metadata to attach to the batch

        Returns:
            Batch creation response with job ID

        Example:
            batch = await client.create_batch(
                methods={"reasoning": 1.0},
                items=[
                    {"content": "The Earth is round."},
                    {"content": "Water freezes at 0°C."},
                ]
            )
            print(batch.id)  # Use to poll for results
        """
        # Convert dict to MethodsConfig if needed
        if isinstance(methods, dict):
            methods = MethodsConfig(**methods)

        # Convert item dicts to BatchItem if needed
        batch_items = None
        if items:
            batch_items = [
                BatchItem(**item) if isinstance(item, dict) else item
                for item in items
            ]

        request = CreateBatchRequest(
            items=batch_items,
            file_id=file_id,
            methods=methods,
            webhook_url=webhook_url,
            metadata=metadata,
        )

        response = await self._batch_request(
            "POST",
            "/v1/batch",
            json=request.model_dump(by_alias=True, exclude_none=True),
        )
        return CreateBatchResponse.model_validate(response)

    async def get_batch(self, batch_id: str) -> BatchJob:
        """
        Get batch job status and details.

        Args:
            batch_id: Batch job ID

        Returns:
            Batch job details including progress

        Example:
            batch = await client.get_batch("batch_abc123")
            print(f"Progress: {batch.progress}%")
        """
        if not batch_id:
            raise ShoveError("Batch ID is required", code="MISSING_ID")

        response = await self._batch_request("GET", f"/v1/batch/{batch_id}")
        return BatchJob.model_validate(response)

    async def list_batches(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> ListBatchesResponse:
        """
        List batch jobs.

        Args:
            limit: Maximum number of batches to return (default: 20, max: 100)
            offset: Offset for pagination
            status: Filter by status

        Returns:
            Paginated list of batch jobs

        Example:
            response = await client.list_batches(limit=10, status="completed")
            for batch in response.data:
                print(f"{batch.id}: {batch.status}")
        """
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status

        response = await self._batch_request("GET", "/v1/batch", params=params)
        return ListBatchesResponse.model_validate(response)

    async def cancel_batch(self, batch_id: str) -> BatchJob:
        """
        Cancel a batch job.

        Cancels a batch job that is pending or processing.

        Args:
            batch_id: Batch job ID

        Returns:
            Updated batch job details
        """
        if not batch_id:
            raise ShoveError("Batch ID is required", code="MISSING_ID")

        response = await self._batch_request("POST", f"/v1/batch/{batch_id}/cancel")
        return BatchJob.model_validate(response)

    async def get_batch_results(
        self,
        batch_id: str,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> BatchResultsResponse:
        """
        Get batch results.

        Retrieves verification results for a batch job. For large batches,
        results are paginated.

        Args:
            batch_id: Batch job ID
            limit: Maximum number of results to return
            offset: Offset for pagination

        Returns:
            Batch results with individual item verdicts

        Example:
            results = await client.get_batch_results("batch_abc123")
            for result in results.results:
                print(f"Item {result.index}: {result.verdict} ({result.confidence})")
        """
        if not batch_id:
            raise ShoveError("Batch ID is required", code="MISSING_ID")

        response = await self._batch_request(
            "GET",
            f"/v1/batch/{batch_id}/results",
            params={"limit": limit, "offset": offset},
        )
        return BatchResultsResponse.model_validate(response)

    async def upload_batch_file(
        self,
        file: Union[str, Path, BinaryIO, bytes],
        filename: Optional[str] = None,
    ) -> FileUploadResponse:
        """
        Upload a file for batch processing.

        Uploads a CSV or JSON file containing items to verify. The returned file_id
        can be used when creating a batch job.

        Args:
            file: File path, file object, or bytes to upload
            filename: Filename with extension (.csv or .json). Required if file is bytes.

        Returns:
            Upload response with file_id

        Example:
            # From a file path
            upload = await client.upload_batch_file("items.csv")

            # Create batch using uploaded file
            batch = await client.create_batch(
                methods={"reasoning": 1.0},
                file_id=upload.file_id
            )
        """
        # Determine file content and name
        if isinstance(file, (str, Path)):
            path = Path(file)
            filename = filename or path.name
            content = path.read_bytes()
        elif isinstance(file, bytes):
            if not filename:
                raise ShoveError(
                    "filename is required when uploading bytes",
                    code="MISSING_FILENAME"
                )
            content = file
        else:
            # File-like object
            content = file.read()
            if hasattr(file, 'name') and not filename:
                filename = Path(file.name).name

        if not filename:
            raise ShoveError(
                "Could not determine filename. Please provide filename parameter.",
                code="MISSING_FILENAME"
            )

        try:
            response = await self._client.post(
                "/v1/batch/upload",
                files={"file": (filename, content)},
            )
            data = response.json()

            if not response.is_success:
                self._handle_error(response, data)

            return FileUploadResponse.model_validate(data)

        except httpx.TimeoutException as e:
            raise TimeoutError(f"Upload timed out: {e}") from e
        except httpx.RequestError as e:
            raise ShoveError(f"Upload error: {e}", code="UPLOAD_ERROR") from e

    async def create_batch_and_wait(
        self,
        methods: Union[MethodsConfig, Dict[str, float]],
        *,
        items: Optional[List[Union[BatchItem, Dict[str, Any]]]] = None,
        file_id: Optional[str] = None,
        webhook_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        poll_interval: float = DEFAULT_BATCH_POLL_INTERVAL,
        timeout: float = DEFAULT_BATCH_WAIT_TIMEOUT,
        on_progress: Optional[Callable[[BatchJob], None]] = None,
    ) -> BatchJob:
        """
        Create a batch and wait for completion.

        This is the recommended method for batch processing when you want to wait
        for all results. It creates a batch and polls until completion.

        Args:
            methods: Verification methods to use with their weights
            items: List of items to verify (mutually exclusive with file_id)
            file_id: File ID from upload (mutually exclusive with items)
            webhook_url: Optional webhook URL for completion notification
            metadata: Optional metadata to attach to the batch
            poll_interval: Polling interval in seconds (default: 5.0)
            timeout: Maximum time to wait in seconds (default: 3600.0)
            on_progress: Optional callback called with batch status on each poll

        Returns:
            Completed batch job

        Example:
            batch = await client.create_batch_and_wait(
                methods={"reasoning": 1.0},
                items=items,
                on_progress=lambda b: print(f"Progress: {b.progress}%")
            )
            results = await client.get_batch_results(batch.id)
        """
        start_time = time.monotonic()

        # Create the batch
        create_response = await self.create_batch(
            methods=methods,
            items=items,
            file_id=file_id,
            webhook_url=webhook_url,
            metadata=metadata,
        )

        # If there were validation errors, the batch failed immediately
        if create_response.status == "failed":
            return await self.get_batch(create_response.id)

        # Poll until complete or timeout
        batch = await self.get_batch(create_response.id)

        while batch.status in ("pending", "validating", "processing"):
            elapsed = time.monotonic() - start_time
            if elapsed > timeout:
                raise TimeoutError(
                    f"Batch timed out after {timeout}s. Status: {batch.status}, Progress: {batch.progress}%",
                    details={"batch_id": batch.id, "progress": batch.progress},
                )

            # Call progress callback if provided
            if on_progress:
                on_progress(batch)

            # Wait before polling
            await asyncio.sleep(poll_interval)

            # Poll for status
            batch = await self.get_batch(batch.id)

        # Final progress callback
        if on_progress:
            on_progress(batch)

        return batch

    async def _batch_request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make a batch API request with automatic retries."""
        max_attempts = (
            self._retry_config.max_retries + 1 if self._retry_config else 1
        )
        last_error: Optional[Exception] = None

        for attempt in range(max_attempts):
            try:
                return await self._execute_batch_request(
                    method, path, json=json, params=params
                )
            except Exception as e:
                last_error = e

                # Check if we should retry
                if not self._should_retry(e, attempt):
                    raise

                # Calculate delay for next retry
                delay = self._calculate_retry_delay(attempt, e)
                await asyncio.sleep(delay)

        # Should never reach here, but Python needs this
        raise last_error or ShoveError("Request failed", code="UNKNOWN_ERROR")

    async def _execute_batch_request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Execute a single batch request attempt."""
        try:
            response = await self._client.request(
                method, path, json=json, params=params
            )
            data = response.json()

            if not response.is_success:
                self._handle_error(response, data)

            return data

        except httpx.TimeoutException as e:
            raise TimeoutError(f"Request timed out: {e}") from e
        except httpx.RequestError as e:
            raise ShoveError(f"Network error: {e}", code="NETWORK_ERROR") from e
