"""
Shove LlamaIndex Integration
Verify retrieved nodes before synthesis with Shove

Example:
    >>> from llama_index.core import VectorStoreIndex
    >>> from shove import Shove
    >>> from shove_llamaindex import ShovePostprocessor
    >>>
    >>> client = Shove(api_key="vfy_...")
    >>> postprocessor = ShovePostprocessor(client)
    >>>
    >>> query_engine = index.as_query_engine(
    ...     node_postprocessors=[postprocessor]
    ... )
    >>> response = query_engine.query("What is...?")  # Nodes auto-verified!
"""

from shove_llamaindex.postprocessor import (
    ShovePostprocessor,
    AsyncShovePostprocessor,
)

__version__ = "0.1.0"

__all__ = [
    "ShovePostprocessor",
    "AsyncShovePostprocessor",
]
