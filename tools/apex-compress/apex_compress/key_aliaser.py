"""
Phase 7: Key Aliasing
Bidirectional JSON key aliaser.
"""

from typing import Dict, Any, List
import json

ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

def generate_alias(n: int) -> str:
    if n < 52:
        return ALPHA[n]
    outer = (n // 52) - 1
    inner = n % 52
    return ALPHA[outer] + ALPHA[inner]

def build_key_alias_map(schema_keys: List[str]) -> Dict[str, Dict[str, str]]:
    counter = 0
    compress = {}
    inflate = {}
    
    for key in schema_keys:
        if len(key) > 2:
            alias = generate_alias(counter)
            counter += 1
            compress[key] = alias
            inflate[alias] = key
            
    return {"compress": compress, "inflate": inflate}

def alias_json_keys(obj: Any, map_compress: Dict[str, str]) -> Any:
    if isinstance(obj, list):
        return [alias_json_keys(item, map_compress) for item in obj]
    if obj is not None and isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            aliased_key = map_compress.get(k, k)
            result[aliased_key] = alias_json_keys(v, map_compress)
        return result
    return obj

def inflate_json_keys(obj: Any, map_inflate: Dict[str, str]) -> Any:
    if isinstance(obj, list):
        return [inflate_json_keys(item, map_inflate) for item in obj]
    if obj is not None and isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            original_key = map_inflate.get(k, k)
            result[original_key] = inflate_json_keys(v, map_inflate)
        return result
    return obj

def build_compressed_schema_instruction(original_schema: Dict[str, Any], map_obj: Dict[str, Dict[str, str]]) -> str:
    aliased = alias_json_keys(original_schema, map_obj["compress"])
    return f"Respond ONLY with valid JSON matching this schema (single-char keys): {json.dumps(aliased)}"
