"""
Shove LangChain Callback Handler
Auto-verify LLM outputs via LangChain callbacks
"""

from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Union
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler, AsyncCallbackHandler
from langchain_core.outputs import LLMResult

from shove import Shove, AsyncShove, MethodsConfig, VerifyResponse
from shove_langchain.exceptions import VerificationRejectedError


@dataclass
class VerificationResult:
    """
    Result of a verification check attached to LLM output.

    Attributes:
        verification_id: Unique ID for the verification
        verdict: 'true', 'false', or 'uncertain'
        confidence: Confidence score (0-1)
        decision: 'accept', 'refine', 'escalate', or 'reject'
        reasoning: Explanation of the verification result
        cached: Whether result came from cache
    """

    verification_id: str
    verdict: Optional[str]
    confidence: Optional[float]
    decision: Optional[str]
    reasoning: Optional[str]
    cached: bool = False

    @classmethod
    def from_response(cls, response: VerifyResponse) -> "VerificationResult":
        """Create from Shove response."""
        return cls(
            verification_id=response.id,
            verdict=response.verdict,
            confidence=response.confidence,
            decision=response.decision,
            reasoning=response.reasoning,
            cached=response.cached or False,
        )


class ShoveCallbackHandler(BaseCallbackHandler):
    """
    LangChain callback handler that auto-verifies LLM outputs.

    This handler intercepts LLM responses and verifies them using Shove.
    Verification results are attached to the generation metadata.

    Example:
        >>> from langchain_openai import ChatOpenAI
        >>> from shove import Shove
        >>> from shove_langchain import ShoveCallbackHandler
        >>>
        >>> client = Shove(api_key="vfy_...")
        >>> handler = ShoveCallbackHandler(
        ...     client,
        ...     methods={"reasoning": 1.0, "tool": 0.5},
        ...     raise_on_reject=True,
        ... )
        >>>
        >>> llm = ChatOpenAI(callbacks=[handler])
        >>> response = llm.invoke("What is the capital of France?")

    Attributes:
        client: Shove client instance
        methods: Verification methods to use
        min_confidence: Minimum confidence threshold
        raise_on_reject: Whether to raise exception on rejection
        on_verification: Optional callback for verification results
    """

    def __init__(
        self,
        client: Shove,
        *,
        methods: Optional[Union[MethodsConfig, Dict[str, float]]] = None,
        min_confidence: float = 0.7,
        raise_on_reject: bool = False,
        on_verification: Optional[Callable[[str, VerificationResult], None]] = None,
        skip_empty: bool = True,
        poll_interval: float = 1.0,
        timeout: float = 60.0,
    ) -> None:
        """
        Initialize the callback handler.

        Args:
            client: Shove client instance
            methods: Verification methods to use (default: reasoning=1.0)
            min_confidence: Minimum confidence threshold for acceptance
            raise_on_reject: Whether to raise VerificationRejectedError on rejection
            on_verification: Optional callback called with (content, result)
            skip_empty: Skip verification for empty responses
            poll_interval: Polling interval in seconds
            timeout: Maximum time to wait for verification
        """
        super().__init__()
        self.client = client
        self.methods = methods or {"reasoning": 1.0}
        self.min_confidence = min_confidence
        self.raise_on_reject = raise_on_reject
        self.on_verification = on_verification
        self.skip_empty = skip_empty
        self.poll_interval = poll_interval
        self.timeout = timeout

    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        """
        Handle LLM completion - verify the output.

        This method is called after the LLM generates a response.
        It verifies each generation and attaches the result to metadata.
        """
        for generations in response.generations:
            for generation in generations:
                # Get the generated text
                text = generation.text
                if not text or (self.skip_empty and not text.strip()):
                    continue

                # Verify the content
                try:
                    verify_response = self.client.verify_and_wait(
                        content=text,
                        methods=self.methods,
                        poll_interval=self.poll_interval,
                        timeout=self.timeout,
                    )

                    # Create result
                    result = VerificationResult.from_response(verify_response)

                    # Attach to generation metadata
                    if generation.generation_info is None:
                        generation.generation_info = {}
                    generation.generation_info["verification"] = {
                        "id": result.verification_id,
                        "verdict": result.verdict,
                        "confidence": result.confidence,
                        "decision": result.decision,
                        "reasoning": result.reasoning,
                        "cached": result.cached,
                    }

                    # Call callback if provided
                    if self.on_verification:
                        self.on_verification(text, result)

                    # Raise if rejected and configured to do so
                    if self.raise_on_reject and result.decision == "reject":
                        raise VerificationRejectedError(
                            f"LLM output failed verification: {result.reasoning}",
                            verification_id=result.verification_id,
                            verdict=result.verdict,
                            confidence=result.confidence,
                            content=text,
                            reasoning=result.reasoning,
                        )

                except VerificationRejectedError:
                    # Re-raise rejection errors
                    raise
                except Exception as e:
                    # Log verification errors but don't block the response
                    if generation.generation_info is None:
                        generation.generation_info = {}
                    generation.generation_info["verification"] = {
                        "error": str(e),
                    }


class AsyncShoveCallbackHandler(AsyncCallbackHandler):
    """
    Async LangChain callback handler that auto-verifies LLM outputs.

    This is the async version of ShoveCallbackHandler for use with
    async LangChain chains and agents.

    Example:
        >>> import asyncio
        >>> from langchain_openai import ChatOpenAI
        >>> from shove import AsyncShove
        >>> from shove_langchain import AsyncShoveCallbackHandler
        >>>
        >>> async def main():
        ...     client = AsyncShove(api_key="vfy_...")
        ...     handler = AsyncShoveCallbackHandler(client)
        ...     llm = ChatOpenAI(callbacks=[handler])
        ...     response = await llm.ainvoke("What is 2+2?")
        ...     await client.close()
        >>>
        >>> asyncio.run(main())
    """

    def __init__(
        self,
        client: AsyncShove,
        *,
        methods: Optional[Union[MethodsConfig, Dict[str, float]]] = None,
        min_confidence: float = 0.7,
        raise_on_reject: bool = False,
        on_verification: Optional[Callable[[str, VerificationResult], None]] = None,
        skip_empty: bool = True,
        poll_interval: float = 1.0,
        timeout: float = 60.0,
    ) -> None:
        """
        Initialize the async callback handler.

        Args:
            client: AsyncShove client instance
            methods: Verification methods to use (default: reasoning=1.0)
            min_confidence: Minimum confidence threshold for acceptance
            raise_on_reject: Whether to raise VerificationRejectedError on rejection
            on_verification: Optional callback called with (content, result)
            skip_empty: Skip verification for empty responses
            poll_interval: Polling interval in seconds
            timeout: Maximum time to wait for verification
        """
        super().__init__()
        self.client = client
        self.methods = methods or {"reasoning": 1.0}
        self.min_confidence = min_confidence
        self.raise_on_reject = raise_on_reject
        self.on_verification = on_verification
        self.skip_empty = skip_empty
        self.poll_interval = poll_interval
        self.timeout = timeout

    async def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> None:
        """
        Handle LLM completion - verify the output asynchronously.
        """
        for generations in response.generations:
            for generation in generations:
                # Get the generated text
                text = generation.text
                if not text or (self.skip_empty and not text.strip()):
                    continue

                # Verify the content
                try:
                    verify_response = await self.client.verify_and_wait(
                        content=text,
                        methods=self.methods,
                        poll_interval=self.poll_interval,
                        timeout=self.timeout,
                    )

                    # Create result
                    result = VerificationResult.from_response(verify_response)

                    # Attach to generation metadata
                    if generation.generation_info is None:
                        generation.generation_info = {}
                    generation.generation_info["verification"] = {
                        "id": result.verification_id,
                        "verdict": result.verdict,
                        "confidence": result.confidence,
                        "decision": result.decision,
                        "reasoning": result.reasoning,
                        "cached": result.cached,
                    }

                    # Call callback if provided
                    if self.on_verification:
                        self.on_verification(text, result)

                    # Raise if rejected and configured to do so
                    if self.raise_on_reject and result.decision == "reject":
                        raise VerificationRejectedError(
                            f"LLM output failed verification: {result.reasoning}",
                            verification_id=result.verification_id,
                            verdict=result.verdict,
                            confidence=result.confidence,
                            content=text,
                            reasoning=result.reasoning,
                        )

                except VerificationRejectedError:
                    # Re-raise rejection errors
                    raise
                except Exception as e:
                    # Log verification errors but don't block the response
                    if generation.generation_info is None:
                        generation.generation_info = {}
                    generation.generation_info["verification"] = {
                        "error": str(e),
                    }
