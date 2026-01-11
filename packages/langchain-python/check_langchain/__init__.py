"""
Check LangChain Integration
Auto-verify LLM outputs with Check callbacks

Example:
    >>> from langchain_openai import ChatOpenAI
    >>> from check import Check
    >>> from check_langchain import CheckCallbackHandler
    >>>
    >>> client = Check(api_key="vfy_...")
    >>> handler = CheckCallbackHandler(client)
    >>>
    >>> llm = ChatOpenAI(callbacks=[handler])
    >>> response = llm.invoke("What is 2+2?")  # Auto-verified!
"""

from check_langchain.callback import (
    CheckCallbackHandler,
    AsyncCheckCallbackHandler,
    VerificationResult,
)
from check_langchain.exceptions import (
    VerificationError,
    VerificationRejectedError,
)

__version__ = "0.1.0"

__all__ = [
    "CheckCallbackHandler",
    "AsyncCheckCallbackHandler",
    "VerificationResult",
    "VerificationError",
    "VerificationRejectedError",
]
