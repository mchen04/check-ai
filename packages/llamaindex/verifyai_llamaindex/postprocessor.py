"""
VerifyAI LlamaIndex Postprocessor
Verify retrieved nodes before synthesis
"""

from typing import Any, Dict, List, Optional, Union

from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore, QueryBundle

from verifyai import VerifyAI, AsyncVerifyAI, MethodsConfig


class VerifyAIPostprocessor(BaseNodePostprocessor):
    """
    LlamaIndex node postprocessor that verifies retrieved nodes.

    This postprocessor verifies the content of retrieved nodes using VerifyAI
    before they are passed to the response synthesizer. Nodes that fail
    verification can be filtered out or have verification metadata attached.

    Example:
        >>> from llama_index.core import VectorStoreIndex
        >>> from verifyai import VerifyAI
        >>> from verifyai_llamaindex import VerifyAIPostprocessor
        >>>
        >>> client = VerifyAI(api_key="vfy_...")
        >>> postprocessor = VerifyAIPostprocessor(
        ...     client,
        ...     methods={"reasoning": 1.0, "tool": 0.5},
        ...     min_confidence=0.7,
        ...     filter_unverified=True,
        ... )
        >>>
        >>> query_engine = index.as_query_engine(
        ...     node_postprocessors=[postprocessor]
        ... )
        >>> response = query_engine.query("What is the capital of France?")

    Attributes:
        client: VerifyAI client instance
        methods: Verification methods to use
        min_confidence: Minimum confidence threshold to keep node
        filter_unverified: Whether to filter out unverified nodes
        include_query_context: Include query in verification context
    """

    client: VerifyAI
    methods: Union[MethodsConfig, Dict[str, float]]
    min_confidence: float
    filter_unverified: bool
    include_query_context: bool
    poll_interval: float
    timeout: float

    def __init__(
        self,
        client: VerifyAI,
        *,
        methods: Optional[Union[MethodsConfig, Dict[str, float]]] = None,
        min_confidence: float = 0.7,
        filter_unverified: bool = True,
        include_query_context: bool = True,
        poll_interval: float = 1.0,
        timeout: float = 60.0,
    ) -> None:
        """
        Initialize the postprocessor.

        Args:
            client: VerifyAI client instance
            methods: Verification methods to use (default: reasoning=1.0)
            min_confidence: Minimum confidence threshold to keep node
            filter_unverified: Whether to filter out nodes below threshold
            include_query_context: Include query text in verification context
            poll_interval: Polling interval in seconds
            timeout: Maximum time to wait for verification
        """
        super().__init__()
        self.client = client
        self.methods = methods or {"reasoning": 1.0}
        self.min_confidence = min_confidence
        self.filter_unverified = filter_unverified
        self.include_query_context = include_query_context
        self.poll_interval = poll_interval
        self.timeout = timeout

    @classmethod
    def class_name(cls) -> str:
        return "VerifyAIPostprocessor"

    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> List[NodeWithScore]:
        """
        Verify and optionally filter nodes.

        Args:
            nodes: List of nodes with scores from retriever
            query_bundle: Optional query bundle with query text

        Returns:
            List of verified nodes (filtered if filter_unverified=True)
        """
        verified_nodes: List[NodeWithScore] = []

        for node_with_score in nodes:
            # Get node content
            content = node_with_score.node.get_content()
            if not content or not content.strip():
                # Keep empty nodes as-is
                verified_nodes.append(node_with_score)
                continue

            # Build context
            context: Dict[str, Any] = {}
            if self.include_query_context and query_bundle:
                context["query"] = query_bundle.query_str

            # Add existing metadata as context
            if node_with_score.node.metadata:
                context["metadata"] = node_with_score.node.metadata

            try:
                # Verify the content
                result = self.client.verify_and_wait(
                    content=content,
                    methods=self.methods,
                    context=context if context else None,
                    poll_interval=self.poll_interval,
                    timeout=self.timeout,
                )

                # Add verification metadata to node
                node_with_score.node.metadata = node_with_score.node.metadata or {}
                node_with_score.node.metadata["verification"] = {
                    "id": result.id,
                    "verdict": result.verdict,
                    "confidence": result.confidence,
                    "decision": result.decision,
                    "reasoning": result.reasoning,
                    "cached": result.cached,
                }

                # Filter or include based on confidence
                confidence = result.confidence or 0.0
                if self.filter_unverified:
                    if confidence >= self.min_confidence:
                        verified_nodes.append(node_with_score)
                    # else: node is filtered out
                else:
                    # Keep all nodes but mark with verification result
                    verified_nodes.append(node_with_score)

            except Exception as e:
                # On error, add error metadata and keep node
                node_with_score.node.metadata = node_with_score.node.metadata or {}
                node_with_score.node.metadata["verification"] = {
                    "error": str(e),
                }
                # Keep node on error (fail open)
                verified_nodes.append(node_with_score)

        return verified_nodes


class AsyncVerifyAIPostprocessor(BaseNodePostprocessor):
    """
    Async LlamaIndex node postprocessor that verifies retrieved nodes.

    This is the async version of VerifyAIPostprocessor for use with
    async LlamaIndex pipelines.

    Example:
        >>> import asyncio
        >>> from llama_index.core import VectorStoreIndex
        >>> from verifyai import AsyncVerifyAI
        >>> from verifyai_llamaindex import AsyncVerifyAIPostprocessor
        >>>
        >>> async def main():
        ...     client = AsyncVerifyAI(api_key="vfy_...")
        ...     postprocessor = AsyncVerifyAIPostprocessor(client)
        ...     query_engine = index.as_query_engine(
        ...         node_postprocessors=[postprocessor]
        ...     )
        ...     response = await query_engine.aquery("What is...?")
        ...     await client.close()
        >>>
        >>> asyncio.run(main())
    """

    client: AsyncVerifyAI
    methods: Union[MethodsConfig, Dict[str, float]]
    min_confidence: float
    filter_unverified: bool
    include_query_context: bool
    poll_interval: float
    timeout: float

    def __init__(
        self,
        client: AsyncVerifyAI,
        *,
        methods: Optional[Union[MethodsConfig, Dict[str, float]]] = None,
        min_confidence: float = 0.7,
        filter_unverified: bool = True,
        include_query_context: bool = True,
        poll_interval: float = 1.0,
        timeout: float = 60.0,
    ) -> None:
        """
        Initialize the async postprocessor.

        Args:
            client: AsyncVerifyAI client instance
            methods: Verification methods to use (default: reasoning=1.0)
            min_confidence: Minimum confidence threshold to keep node
            filter_unverified: Whether to filter out nodes below threshold
            include_query_context: Include query text in verification context
            poll_interval: Polling interval in seconds
            timeout: Maximum time to wait for verification
        """
        super().__init__()
        self.client = client
        self.methods = methods or {"reasoning": 1.0}
        self.min_confidence = min_confidence
        self.filter_unverified = filter_unverified
        self.include_query_context = include_query_context
        self.poll_interval = poll_interval
        self.timeout = timeout

    @classmethod
    def class_name(cls) -> str:
        return "AsyncVerifyAIPostprocessor"

    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> List[NodeWithScore]:
        """
        Synchronous fallback - just returns nodes as-is.
        Use async query methods for actual verification.
        """
        # Note: For sync usage, nodes pass through unverified
        # Use aquery() or async methods for verification
        return nodes

    async def apostprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> List[NodeWithScore]:
        """
        Async verify and optionally filter nodes.

        Args:
            nodes: List of nodes with scores from retriever
            query_bundle: Optional query bundle with query text

        Returns:
            List of verified nodes (filtered if filter_unverified=True)
        """
        verified_nodes: List[NodeWithScore] = []

        for node_with_score in nodes:
            # Get node content
            content = node_with_score.node.get_content()
            if not content or not content.strip():
                verified_nodes.append(node_with_score)
                continue

            # Build context
            context: Dict[str, Any] = {}
            if self.include_query_context and query_bundle:
                context["query"] = query_bundle.query_str

            if node_with_score.node.metadata:
                context["metadata"] = node_with_score.node.metadata

            try:
                # Verify the content
                result = await self.client.verify_and_wait(
                    content=content,
                    methods=self.methods,
                    context=context if context else None,
                    poll_interval=self.poll_interval,
                    timeout=self.timeout,
                )

                # Add verification metadata
                node_with_score.node.metadata = node_with_score.node.metadata or {}
                node_with_score.node.metadata["verification"] = {
                    "id": result.id,
                    "verdict": result.verdict,
                    "confidence": result.confidence,
                    "decision": result.decision,
                    "reasoning": result.reasoning,
                    "cached": result.cached,
                }

                # Filter or include based on confidence
                confidence = result.confidence or 0.0
                if self.filter_unverified:
                    if confidence >= self.min_confidence:
                        verified_nodes.append(node_with_score)
                else:
                    verified_nodes.append(node_with_score)

            except Exception as e:
                node_with_score.node.metadata = node_with_score.node.metadata or {}
                node_with_score.node.metadata["verification"] = {
                    "error": str(e),
                }
                verified_nodes.append(node_with_score)

        return verified_nodes
