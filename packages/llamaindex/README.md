# shove-llamaindex

LlamaIndex integration for Shove - Verify retrieved nodes before synthesis.

## Installation

```bash
pip install shove-llamaindex
```

## Quick Start

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from shove import Shove
from shove_llamaindex import ShovePostprocessor

# Initialize client
client = Shove(api_key="vfy_...")

# Create postprocessor
postprocessor = ShovePostprocessor(client)

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
- **Async support**: Full async support with AsyncShovePostprocessor
- **Metadata attachment**: Verification results attached to node metadata

## Usage

### Basic Usage

```python
from llama_index.core import VectorStoreIndex
from shove import Shove
from shove_llamaindex import ShovePostprocessor

client = Shove(api_key="vfy_...")
postprocessor = ShovePostprocessor(client)

query_engine = index.as_query_engine(
    node_postprocessors=[postprocessor]
)

response = query_engine.query("What is...?")
```

### Configure Methods and Filtering

```python
postprocessor = ShovePostprocessor(
    client,
    methods={"reasoning": 1.0, "tool": 0.5},
    min_confidence=0.7,
    filter_unverified=True,  # Remove nodes below threshold
)
```

### Keep All Nodes (Just Add Metadata)

```python
postprocessor = ShovePostprocessor(
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
from shove import AsyncShove
from shove_llamaindex import AsyncShovePostprocessor

async def main():
    client = AsyncShove(api_key="vfy_...")
    postprocessor = AsyncShovePostprocessor(client)

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
- shove
- llama-index-core >= 0.10.0

## License

MIT
