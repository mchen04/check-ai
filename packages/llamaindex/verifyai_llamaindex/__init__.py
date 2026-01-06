"""
VerifyAI LlamaIndex Integration
Verify retrieved nodes before synthesis with VerifyAI

Example:
    >>> from llama_index.core import VectorStoreIndex
    >>> from verifyai import VerifyAI
    >>> from verifyai_llamaindex import VerifyAIPostprocessor
    >>>
    >>> client = VerifyAI(api_key="vfy_...")
    >>> postprocessor = VerifyAIPostprocessor(client)
    >>>
    >>> query_engine = index.as_query_engine(
    ...     node_postprocessors=[postprocessor]
    ... )
    >>> response = query_engine.query("What is...?")  # Nodes auto-verified!
"""

from verifyai_llamaindex.postprocessor import (
    VerifyAIPostprocessor,
    AsyncVerifyAIPostprocessor,
)

__version__ = "0.1.0"

__all__ = [
    "VerifyAIPostprocessor",
    "AsyncVerifyAIPostprocessor",
]
