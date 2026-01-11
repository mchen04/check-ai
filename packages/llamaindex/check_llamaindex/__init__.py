"""
Check LlamaIndex Integration
Verify retrieved nodes before synthesis with Check

Example:
    >>> from llama_index.core import VectorStoreIndex
    >>> from check import Check
    >>> from check_llamaindex import CheckPostprocessor
    >>>
    >>> client = Check(api_key="vfy_...")
    >>> postprocessor = CheckPostprocessor(client)
    >>>
    >>> query_engine = index.as_query_engine(
    ...     node_postprocessors=[postprocessor]
    ... )
    >>> response = query_engine.query("What is...?")  # Nodes auto-verified!
"""

from check_llamaindex.postprocessor import (
    CheckPostprocessor,
    AsyncCheckPostprocessor,
)

__version__ = "0.1.0"

__all__ = [
    "CheckPostprocessor",
    "AsyncCheckPostprocessor",
]
