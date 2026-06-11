"""
APEX-COMPRESS
Zero-dependency token optimization library for APEX-OmniHub LLM pipelines.
Achieves 40-65% token reduction across input and output modalities.
"""

from .heuristic_pruner import prune_heuristic
from .telegraph_english import compress_telegraph_english
from .toon_serializer import (
    serialize_to_toon,
    deserialize_from_toon,
    serialize_tabular_toon,
    deserialize_tabular_toon,
)
from .schema_compressor import compress_tool_schema, inflate_tool_schema
from .key_aliaser import (
    build_key_alias_map,
    alias_json_keys,
    inflate_json_keys,
    build_compressed_schema_instruction,
)
from .pipeline import (
    compress,
    compress_schema,
    compress_json_payload,
    compress_tabular_payload,
    build_output_schema,
    decompress_json_payload,
    decompress_tabular_payload,
    decompress_output_keys,
    decompress_tool_schema,
)

__all__ = [
    "prune_heuristic",
    "compress_telegraph_english",
    "serialize_to_toon",
    "deserialize_from_toon",
    "serialize_tabular_toon",
    "deserialize_tabular_toon",
    "compress_tool_schema",
    "inflate_tool_schema",
    "build_key_alias_map",
    "alias_json_keys",
    "inflate_json_keys",
    "build_compressed_schema_instruction",
    "compress",
    "compress_schema",
    "compress_json_payload",
    "compress_tabular_payload",
    "build_output_schema",
    "decompress_json_payload",
    "decompress_tabular_payload",
    "decompress_output_keys",
    "decompress_tool_schema",
]
