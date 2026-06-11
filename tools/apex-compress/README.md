# APEX-COMPRESS

Zero-dependency token optimization library for APEX-OmniHub LLM pipelines.
Achieves 40-65% token reduction across input and output modalities using:

1. **Heuristic Pruner**: Strips parasitic boilerplate.
2. **Telegraph English**: Symbolic rewriting of natural language.
3. **TOON**: Token-Oriented Object Notation for JSON structural compression.
4. **TSCG**: 8-operator pipeline for Tool Schema Compression.
5. **Key Aliasing**: Bidirectional minification of output schemas.

## Usage

```python
from apex_compress import compress, compress_schema, compress_json_payload

# Compress system prompt
result = compress("Please note that you must validate inputs...", attention_sinks=["Guardian"])
print(result["compressed"]) # "must validate inputs..."

# Compress JSON payload to TOON
toon = compress_json_payload({"name": "Alice", "active": True})
print(toon) # "name:Alice|active:T"
```
