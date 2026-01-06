"""
VerifyAI LangChain Integration
Auto-verify LLM outputs with VerifyAI callbacks

Example:
    >>> from langchain_openai import ChatOpenAI
    >>> from verifyai import VerifyAI
    >>> from verifyai_langchain import VerifyAICallbackHandler
    >>>
    >>> client = VerifyAI(api_key="vfy_...")
    >>> handler = VerifyAICallbackHandler(client)
    >>>
    >>> llm = ChatOpenAI(callbacks=[handler])
    >>> response = llm.invoke("What is 2+2?")  # Auto-verified!
"""

from verifyai_langchain.callback import (
    VerifyAICallbackHandler,
    AsyncVerifyAICallbackHandler,
    VerificationResult,
)
from verifyai_langchain.exceptions import (
    VerificationError,
    VerificationRejectedError,
)

__version__ = "0.1.0"

__all__ = [
    "VerifyAICallbackHandler",
    "AsyncVerifyAICallbackHandler",
    "VerificationResult",
    "VerificationError",
    "VerificationRejectedError",
]
