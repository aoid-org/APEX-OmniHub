import pytest
from apex_compress.pipeline import (
    compress,
    compress_json_payload,
    decompress_json_payload,
    compress_schema,
    decompress_tool_schema
)

def test_compress_text():
    input_text = "Please note that in order to test this, you must run it. Please note that in order to test this, you must run it."
    result = compress(input_text)
    assert result["reduction_percent"] > 0
    assert "heuristic-pruner" in result["phases_applied"]
    assert "telegraph-english" in result["phases_applied"]
    assert result["compressed"] == "to test this, run it."

def test_toon_roundtrip():
    obj = {"message": "hello world", "active": True}
    toon = compress_json_payload(obj)
    restored = decompress_json_payload(toon)
    assert restored == obj

def test_schema_roundtrip():
    schema = {
        "name": "test_tool",
        "description": "This tool will process data. By default, it returns a string.",
        "parameters": {
            "type": "object",
            "properties": {
                "verbose_key_name": {
                    "type": "string",
                    "description": "A verbose key description",
                },
                "enum_key": {
                    "type": "string",
                    "enum": ["A", "B", "C"],
                },
                "nullable_key": {
                    "type": ["string", "null"],
                },
                "default_key": {
                    "type": "integer",
                    "default": 42,
                }
            },
            "required": ["verbose_key_name"],
        },
    }
    compressed, key_map = compress_schema(schema)
    
    assert compressed["description"] == "process data."
    assert "a" in compressed["parameters"]["properties"]
    assert "enum_key" not in compressed["parameters"]["properties"]
    
    inflated = decompress_tool_schema(compressed, key_map)
    assert inflated["name"] == schema["name"]
    assert inflated["description"] == "process data."
    assert "verbose_key_name" in inflated["parameters"]["properties"]
    assert "enum_key" in inflated["parameters"]["properties"]
