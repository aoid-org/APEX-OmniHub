"""
Unified Pipeline for APEX-COMPRESS
"""

import json
from typing import Dict, Any, List, Tuple
from .heuristic_pruner import prune_heuristic
from .telegraph_english import compress_telegraph_english
from .toon_serializer import (
    serialize_to_toon, serialize_tabular_toon,
    deserialize_from_toon, deserialize_tabular_toon
)
from .schema_compressor import compress_tool_schema, inflate_tool_schema
from .key_aliaser import build_key_alias_map, build_compressed_schema_instruction, inflate_json_keys

def estimate_tokens(text: str) -> int:
    if not text: return 0
    words = len([w for w in text.split() if w])
    chars = len(text)
    return round(((words * 1.3) + (chars / 4)) / 2)

def estimate_reduction(original: str, compressed: str) -> int:
    orig_t = estimate_tokens(original)
    if orig_t == 0: return 0
    comp_t = estimate_tokens(compressed)
    return round(((orig_t - comp_t) / orig_t) * 100)

def compress(
    text: str,
    enable_heuristic: bool = True,
    enable_telegraph: bool = True,
    attention_sinks: List[str] = None
) -> Dict[str, Any]:
    current = text
    phases = []
    
    if enable_heuristic:
        current = prune_heuristic(current, attention_sinks)
        phases.append('heuristic-pruner')
        
    if enable_telegraph:
        current = compress_telegraph_english(current, attention_sinks)
        phases.append('telegraph-english')
        
    return {
        "original": text,
        "compressed": current,
        "original_tokens": estimate_tokens(text),
        "compressed_tokens": estimate_tokens(current),
        "reduction_percent": estimate_reduction(text, current),
        "phases_applied": phases
    }

def compress_schema(schema: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, str]]:
    return compress_tool_schema(schema)

def compress_json_payload(obj: Dict[str, Any]) -> str:
    return serialize_to_toon(obj)

def compress_tabular_payload(name: str, items: List[Dict[str, Any]]) -> str:
    return serialize_tabular_toon(name, items)

def _extract_all_keys(obj: Any, keys: List[str] = None) -> List[str]:
    if keys is None: keys = []
    if obj is not None and isinstance(obj, dict):
        for k, v in obj.items():
            keys.append(k)
            _extract_all_keys(v, keys)
    return keys

def build_output_schema(schema: Dict[str, Any]) -> Tuple[str, Dict[str, Dict[str, str]]]:
    keys = _extract_all_keys(schema)
    map_obj = build_key_alias_map(keys)
    instruction = build_compressed_schema_instruction(schema, map_obj)
    return instruction, map_obj

def decompress_json_payload(toon: str) -> Dict[str, Any]:
    return deserialize_from_toon(toon)

def decompress_tabular_payload(toon: str) -> List[Dict[str, Any]]:
    return deserialize_tabular_toon(toon)

def decompress_output_keys(response: str, map_obj: Dict[str, Dict[str, str]]) -> Dict[str, Any]:
    try:
        parsed = json.loads(response)
        return inflate_json_keys(parsed, map_obj["inflate"])
    except json.JSONDecodeError:
        return {"raw": response}

def decompress_tool_schema(compressed: Dict[str, Any], key_map: Dict[str, str]) -> Dict[str, Any]:
    return inflate_tool_schema(compressed, key_map)
