"""
Phase 4: TSCG — Tool Schema Compression and Generation
8 deterministic operators applied in strict pipeline order.
"""

import json
import re
from typing import Dict, Any, Tuple
import copy

ToolSchema = Dict[str, Any]

TYPE_COMPRESS_MAP = {
    "string": "str",
    "integer": "int",
    "boolean": "bool",
    "array": "arr",
    "object": "obj",
    "number": "num",
}
TYPE_INFLATE_MAP = {v: k for k, v in TYPE_COMPRESS_MAP.items()}

def apply_sdm(desc: str) -> str:
    result = re.sub(r'\bthis (function|method|tool|endpoint)\s+(will\s+)?', '', desc, flags=re.IGNORECASE)
    result = re.sub(r'\bwhen called,?\s*', '', result, flags=re.IGNORECASE)
    result = re.sub(r'\bif (provided|specified|given),?\s*', '', result, flags=re.IGNORECASE)
    result = re.sub(r'\bby default,?\s*', '', result, flags=re.IGNORECASE)
    result = re.sub(r'\bnote that\b', '', result, flags=re.IGNORECASE)
    result = re.sub(r'\bplease\s+', '', result, flags=re.IGNORECASE)
    result = re.sub(r'\be\.g\.,?\s*', '', result, flags=re.IGNORECASE)
    result = re.sub(r'\bi\.e\.,?\s*', '', result, flags=re.IGNORECASE)
    result = re.sub(r'\s{2,}', ' ', result).strip()
    
    sentences = re.split(r'\.\s+', result)
    if len(sentences) > 1:
        result = sentences[0] + '.'
    return result

def apply_dro(schema: ToolSchema) -> ToolSchema:
    if "parameters" not in schema or "properties" not in schema["parameters"]:
        return schema
        
    props = schema["parameters"]["properties"]
    for key, prop in props.items():
        if "enum" in prop and isinstance(prop["enum"], list):
            enum_vals = [str(v) for v in prop["enum"]]
            existing_desc = prop.get("description", "")
            compact_enum = f"[{'|'.join(enum_vals)}]"
            prop["description"] = f"{existing_desc} {compact_enum}".strip()
            del prop["enum"]
            
    return schema

def apply_tas(schema: ToolSchema) -> ToolSchema:
    s = json.dumps(schema)
    for verbose, compact in TYPE_COMPRESS_MAP.items():
        s = re.sub(rf'"type"\s*:\s*"{verbose}"', f'"type":"{compact}"', s)
    return json.loads(s)

def apply_cfl(schema: ToolSchema) -> ToolSchema:
    if "parameters" not in schema or "properties" not in schema["parameters"] or "required" not in schema["parameters"]:
        return schema
        
    required = set(schema["parameters"]["required"])
    props = schema["parameters"]["properties"]
    
    for key in required:
        if key in props:
            props[key]["_req"] = 1
            
    del schema["parameters"]["required"]
    return schema

def to_alias(n: int) -> str:
    chars = 'abcdefghijklmnopqrstuvwxyz'
    if n < 26: return chars[n]
    return chars[(n // 26) - 1] + chars[n % 26]

def apply_cfo(schema: ToolSchema) -> Tuple[ToolSchema, Dict[str, str]]:
    key_map = {}
    if "parameters" not in schema or "properties" not in schema["parameters"]:
        return schema, key_map
        
    props = schema["parameters"]["properties"]
    aliased_props = {}
    counter = 0
    
    for key, value in props.items():
        if len(key) > 4:
            alias = to_alias(counter)
            counter += 1
            key_map[alias] = key
            aliased_props[alias] = value
        else:
            aliased_props[key] = value
            
    schema["parameters"]["properties"] = aliased_props
    return schema, key_map

def apply_cas(schema: ToolSchema) -> ToolSchema:
    s = json.dumps(schema)
    result = re.sub(r'"default"\s*:\s*(?:"[^"]*"|[^,}]+)\s*,?', '', s)
    cleaned = re.sub(r',\s*,', ',', result)
    cleaned = re.sub(r',\s*\}', '}', cleaned)
    cleaned = re.sub(r'\{\s*,', '{', cleaned)
    return json.loads(cleaned)

def apply_sadf(schema: ToolSchema) -> ToolSchema:
    s = json.dumps(schema)
    nullable_patterns = [
        (r'"type"\s*:\s*\["str"\s*,\s*"null"\]', '"type":"str?"'),
        (r'"type"\s*:\s*\["int"\s*,\s*"null"\]', '"type":"int?"'),
        (r'"type"\s*:\s*\["bool"\s*,\s*"null"\]', '"type":"bool?"'),
        (r'"type"\s*:\s*\["num"\s*,\s*"null"\]', '"type":"num?"'),
        (r'"type"\s*:\s*\["string"\s*,\s*"null"\]', '"type":"str?"'),
        (r'"type"\s*:\s*\["integer"\s*,\s*"null"\]', '"type":"int?"'),
        (r'"type"\s*:\s*\["boolean"\s*,\s*"null"\]', '"type":"bool?"'),
        (r'"type"\s*:\s*\["number"\s*,\s*"null"\]', '"type":"num?"'),
    ]
    for pattern, repl in nullable_patterns:
        s = re.sub(pattern, repl, s)
    return json.loads(s)

def apply_ccp(schema: ToolSchema) -> ToolSchema:
    s = json.dumps(schema)
    
    def replacer(match):
        return match.group(1)[1:-1]
        
    s = re.sub(r'"allOf"\s*:\s*\[(\{[^[\]{}]*\})\]', replacer, s)
    s = re.sub(r'"oneOf"\s*:\s*\[(\{[^[\]{}]*\})\]', replacer, s)
    s = re.sub(r'"anyOf"\s*:\s*\[(\{[^[\]{}]*\})\]', replacer, s)
    return json.loads(s)

def compress_tool_schema(schema: ToolSchema) -> Tuple[ToolSchema, Dict[str, str]]:
    result = copy.deepcopy(schema)
    
    if "description" in result:
        result["description"] = apply_sdm(result["description"])
        
    if "parameters" in result and "properties" in result["parameters"]:
        for key, prop in result["parameters"]["properties"].items():
            if isinstance(prop.get("description"), str):
                prop["description"] = apply_sdm(prop["description"])
                
    result = apply_dro(result)
    result = apply_tas(result)
    result = apply_cfl(result)
    result, key_map = apply_cfo(result)
    result = apply_cas(result)
    result = apply_sadf(result)
    result = apply_ccp(result)
    
    return result, key_map

def inflate_tool_schema(compressed: ToolSchema, key_map: Dict[str, str]) -> ToolSchema:
    s = json.dumps(compressed)
    
    for compact, verbose in TYPE_INFLATE_MAP.items():
        s = s.replace(f'"type":"{compact}"', f'"type":"{verbose}"')
        
    s = s.replace('"type":"str?"', '"type":["string","null"]')
    s = s.replace('"type":"int?"', '"type":["integer","null"]')
    s = s.replace('"type":"bool?"', '"type":["boolean","null"]')
    s = s.replace('"type":"num?"', '"type":["number","null"]')
    
    result = json.loads(s)
    
    if "parameters" in result and "properties" in result["parameters"]:
        props = result["parameters"]["properties"]
        inflated = {}
        for alias, value in props.items():
            original_key = key_map.get(alias, alias)
            inflated[original_key] = value
        result["parameters"]["properties"] = inflated
        
    return result
