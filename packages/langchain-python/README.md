# shove-langchain

LangChain integration for Shove - Auto-verify LLM outputs with callbacks.

## Installation

```bash
pip install shove-langchain
```

## Quick Start

```python
from langchain_openai import ChatOpenAI
from shove import Shove
from shove_langchain import ShoveCallbackHandler

# Initialize clients
client = Shove(api_key="vfy_...")
handler = ShoveCallbackHandler(client)

# Use with any LangChain LLM
llm = ChatOpenAI(callbacks=[handler])
response = llm.invoke("What is the capital of France?")

# Verification result is attached to output
print(response.response_metadata.get("verification"))
```

## Features

- **Auto-verification**: Automatically verify LLM outputs
- **Callback-based**: Uses LangChain's callback system
- **Flexible methods**: Configure which verification methods to use
- **Error handling**: Optionally raise on verification rejection
- **Async support**: Full async support with AsyncShoveCallbackHandler

## Usage

### Basic Usage

```python
from langchain_openai import ChatOpenAI
from shove import Shove
from shove_langchain import ShoveCallbackHandler

client = Shove(api_key="vfy_...")
handler = ShoveCallbackHandler(client)

llm = ChatOpenAI(callbacks=[handler])
response = llm.invoke("What is 2+2?")
```

### Configure Methods

```python
handler = ShoveCallbackHandler(
    client,
    methods={"reasoning": 1.0, "tool": 0.5},
    min_confidence=0.7,
)
```

### Raise on Rejection

```python
from shove_langchain import ShoveCallbackHandler, VerificationRejectedError

handler = ShoveCallbackHandler(
    client,
    raise_on_reject=True,  # Raise exception if verification fails
)

try:
    response = llm.invoke("What is the population of Mars?")
except VerificationRejectedError as e:
    print(f"Verification failed: {e.reasoning}")
```

### Custom Callback

```python
def on_verification(content: str, result):
    print(f"Verified: {result.verdict} ({result.confidence:.0%})")

handler = ShoveCallbackHandler(
    client,
    on_verification=on_verification,
)
```

### Async Usage

```python
import asyncio
from langchain_openai import ChatOpenAI
from shove import AsyncShove
from shove_langchain import AsyncShoveCallbackHandler

async def main():
    client = AsyncShove(api_key="vfy_...")
    handler = AsyncShoveCallbackHandler(client)

    llm = ChatOpenAI(callbacks=[handler])
    response = await llm.ainvoke("What is 2+2?")

    await client.close()

asyncio.run(main())
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `methods` | dict | `{"reasoning": 1.0}` | Verification methods and weights |
| `min_confidence` | float | `0.7` | Minimum confidence threshold |
| `raise_on_reject` | bool | `False` | Raise exception on rejection |
| `on_verification` | callable | `None` | Callback for verification results |
| `skip_empty` | bool | `True` | Skip empty responses |
| `poll_interval` | float | `1.0` | Polling interval in seconds |
| `timeout` | float | `60.0` | Max wait time in seconds |

## With Chains and Agents

```python
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

prompt = PromptTemplate.from_template("Answer: {question}")
chain = LLMChain(llm=llm, prompt=prompt)

# Verification happens automatically on LLM calls
result = chain.invoke({"question": "What is the speed of light?"})
```

## Requirements

- Python 3.9+
- shove
- langchain-core >= 0.1.0

## License

MIT
