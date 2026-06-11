"""
Phase 3: TOON (Token-Oriented Object Notation) Serializer
Replaces nested JSON with flat, delimiter-minimized notation.
"""

import re
from typing import Any, Dict, List, Union

def to_toon(value: Any) -> str:
    if value is None:
        return '~'
    if isinstance(value, bool):
        return 'T' if value else 'F'
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value) if isinstance(value, int) else f"{value:.2f}"
    if isinstance(value, str):
        needs_quoting = (
            bool(re.search(r'[|:{}[\],~]', value)) or
            value in ('T', 'F', '~', '') or
            bool(re.match(r'^-?\d+(\.\d+)?$', value))
        )
        if needs_quoting:
            escaped = value.replace('"', '\\"')
            return f'"{escaped}"'
        return value
    if isinstance(value, list):
        inner = ','.join(to_toon(v) for v in value)
        return f"[{inner}]"
    if isinstance(value, dict):
        pairs = '|'.join(f"{to_toon(k)}:{to_toon(v)}" for k, v in value.items())
        return pairs
    return str(value)

def serialize_to_toon(obj: Dict[str, Any]) -> str:
    parts = []
    for k, v in obj.items():
        if isinstance(v, list):
            inner = ','.join(to_toon(item) for item in v)
            serialized_v = f"[{inner}]"
        elif v is not None and isinstance(v, dict):
            serialized_v = f"{{{serialize_to_toon(v)}}}"
        else:
            serialized_v = to_toon(v)
        parts.append(f"{k}:{serialized_v}")
    return '|'.join(parts)

def serialize_tabular_toon(name: str, items: List[Dict[str, Any]]) -> str:
    if not items:
        return f"{name}[0]{{}}:"
    
    keys = list(items[0].keys())
    header = f"{name}[{len(items)}]{{{','.join(keys)}}}:"
    
    rows = []
    for item in items:
        row = ','.join(to_toon(item.get(k)) for k in keys)
        rows.append(row)
        
    return '\n'.join([header] + rows)

def split_top_level(s: str, delimiter: str) -> List[str]:
    parts = []
    depth = 0
    in_quote = False
    current = ""
    
    i = 0
    while i < len(s):
        ch = s[i]
        if ch == '"' and (i == 0 or s[i-1] != '\\'):
            in_quote = not in_quote
            
        if not in_quote:
            if ch in ('{', '['):
                depth += 1
            elif ch in ('}', ']'):
                depth -= 1
            elif ch == delimiter and depth == 0:
                parts.append(current)
                current = ""
                i += 1
                continue
                
        current += ch
        i += 1
        
    if current or s.endswith(delimiter):
        parts.append(current)
    return parts

def parse_toon_value(raw: str) -> Any:
    t = raw.strip()
    if t == '~': return None
    if t == 'T': return True
    if t == 'F': return False
    if re.match(r'^-?\d+$', t): return int(t)
    if re.match(r'^-?\d+\.\d+$', t): return float(t)
    
    if t.startswith('[') and t.endswith(']'):
        inner = t[1:-1]
        if not inner: return []
        return [parse_toon_value(x) for x in split_top_level(inner, ',')]
        
    if t.startswith('{') and t.endswith('}'):
        return deserialize_from_toon(t[1:-1])
        
    if t.startswith('"') and t.endswith('"'):
        return t[1:-1].replace('\\"', '"')
        
    return t

def find_top_level_colon(s: str) -> int:
    depth = 0
    in_quote = False
    for i, ch in enumerate(s):
        if ch == '"' and (i == 0 or s[i-1] != '\\'):
            in_quote = not in_quote
        if not in_quote:
            if ch in ('{', '['): depth += 1
            elif ch in ('}', ']'): depth -= 1
            elif ch == ':' and depth == 0: return i
    return -1

def deserialize_from_toon(toon: str) -> Dict[str, Any]:
    result = {}
    pairs = split_top_level(toon, '|')
    
    for pair in pairs:
        colon_idx = find_top_level_colon(pair)
        if colon_idx == -1:
            continue
            
        raw_key = pair[:colon_idx].strip()
        key = raw_key[1:-1].replace('\\"', '"') if raw_key.startswith('"') and raw_key.endswith('"') else raw_key
        raw_value = pair[colon_idx+1:]
        result[key] = parse_toon_value(raw_value)
        
    return result

def deserialize_tabular_toon(toon: str) -> List[Dict[str, Any]]:
    lines = [l for l in toon.split('\n') if l.strip()]
    if not lines:
        return []
        
    header_match = re.match(r'^[^\[]*\[\d+\]\{([^}]*)\}:$', lines[0])
    if not header_match:
        return []
        
    keys = [k.strip() for k in header_match.group(1).split(',')]
    result = []
    
    for line in lines[1:]:
        values = split_top_level(line, ',')
        obj = {}
        for idx, key in enumerate(keys):
            obj[key] = parse_toon_value(values[idx]) if idx < len(values) else None
        result.append(obj)
        
    return result
