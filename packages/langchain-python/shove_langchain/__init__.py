"""
Shove LangChain Integration
Auto-verify LLM outputs with Shove callbacks

Example:
    >>> from langchain_openai import ChatOpenAI
    >>> from shove import Shove
    >>> from shove_langchain import ShoveCallbackHandler
    >>>
    >>> client = Shove(api_key="vfy_...")
    >>> handler = ShoveCallbackHandler(client)
    >>>
    >>> llm = ChatOpenAI(callbacks=[handler])
    >>> response = llm.invoke("What is 2+2?")  # Auto-verified!
"""

from shove_langchain.callback import (
    ShoveCallbackHandler,
    AsyncShoveCallbackHandler,
    VerificationResult,
)
from shove_langchain.exceptions import (
    VerificationError,
    VerificationRejectedError,
)

__version__ = "0.1.0"

__all__ = [
    "ShoveCallbackHandler",
    "AsyncShoveCallbackHandler",
    "VerificationResult",
    "VerificationError",
    "VerificationRejectedError",
]
