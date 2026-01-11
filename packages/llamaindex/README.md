# check-llamaindex

LlamaIndex integration for Check - Verify retrieved nodes before synthesis.

## Installation

```bash
pip install check-llamaindex
```

## Quick Start

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from check import Check
from check_llamaindex import CheckPostprocessor

# Initialize client
client = Check(api_key="vfy_...")

# Create postprocessor
postprocessor = CheckPostprocessor(client)

# Use with query engine
documents = SimpleDirectoryReader("data").load_data()
index = VectorStoreIndex.from_documents(documents)

query_engine = index.as_query_engine(
    node_postprocessors=[postprocessor]
)

# Retrieved nodes are automatically verified!
response = query_engine.query("What is the main topic?")
```

## Features

- **Node verification**: Verify retrieved nodes before synthesis
- **Configurable filtering**: Filter out unverified nodes
- **Query context**: Include query in verification for relevance checking
- **Async support**: Full async support with AsyncCheckPostprocessor
- **Metadata attachment**: Verification results attached to node metadata

## Usage

### Basic Usage

```python
from llama_index.core import VectorStoreIndex
from check import Check
from check_llamaindex import CheckPostprocessor

client = Check(api_key="vfy_...")
postprocessor = CheckPostprocessor(client)

query_engine = index.as_query_engine(
    node_postprocessors=[postprocessor]
)

response = query_engine.query("What is...?")
```

### Configure Methods and Filtering

```python
postprocessor = CheckPostprocessor(
    client,
    methods={"reasoning": 1.0, "tool": 0.5},
    min_confidence=0.7,
    filter_unverified=True,  # Remove nodes below threshold
)
```

### Keep All Nodes (Just Add Metadata)

```python
postprocessor = CheckPostprocessor(
    client,
    filter_unverified=False,  # Keep all nodes
)

# Now all nodes have verification metadata
for node in response.source_nodes:
    print(node.metadata.get("verification"))
```

### Async Usage

```python
import asyncio
from llama_index.core import VectorStoreIndex
from check import AsyncCheck
from check_llamaindex import AsyncCheckPostprocessor

async def main():
    client = AsyncCheck(api_key="vfy_...")
    postprocessor = AsyncCheckPostprocessor(client)

    query_engine = index.as_query_engine(
        node_postprocessors=[postprocessor]
    )

    # Use async query
    response = await query_engine.aquery("What is...?")

    await client.close()

asyncio.run(main())
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `methods` | dict | `{"reasoning": 1.0}` | Verification methods and weights |
| `min_confidence` | float | `0.7` | Minimum confidence to keep node |
| `filter_unverified` | bool | `True` | Remove nodes below threshold |
| `include_query_context` | bool | `True` | Include query in verification context |
| `poll_interval` | float | `1.0` | Polling interval in seconds |
| `timeout` | float | `60.0` | Max wait time in seconds |

## Verification Metadata

After processing, nodes have verification metadata:

```python
node.metadata["verification"] = {
    "id": "ver_abc123",
    "verdict": "true",
    "confidence": 0.92,
    "decision": "accept",
    "reasoning": "...",
    "cached": False,
}
```

## With Chat Engine

```python
from llama_index.core.chat_engine import CondenseQuestionChatEngine

chat_engine = CondenseQuestionChatEngine.from_defaults(
    query_engine=query_engine  # Uses the postprocessor
)

response = chat_engine.chat("Tell me more about...")
```

## Requirements

- Python 3.9+
- check
- llama-index-core >= 0.10.0

## License

MIT
