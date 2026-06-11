"""
Phase 1: Heuristic Pruner
Strips low-information tokens from text without semantic loss.
Zero external dependencies. Deterministic. Lossy-by-design for filler content.
"""

import re
from typing import List, Tuple, Dict

# Apply in strict order
PRUNE_RULES: List[Tuple[re.Pattern, str]] = [
    (re.compile(r'\n{3,}'), '\n\n'),
    (re.compile(r'[ \t]{2,}'), ' '),
    (re.compile(r'<!--[\s\S]*?-->'), ''),
    (re.compile(r' +$', re.MULTILINE), ''),
    
    # Common boilerplate phrases (case-insensitive)
    (re.compile(r'\bplease note that\b', re.IGNORECASE), ''),
    (re.compile(r'\bit is important to note that\b', re.IGNORECASE), ''),
    (re.compile(r'\bit is worth noting that\b', re.IGNORECASE), ''),
    (re.compile(r'\bfeel free to\b', re.IGNORECASE), ''),
    (re.compile(r'\bas an ai language model,?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bas a large language model,?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bcertainly[,!]?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bof course[,!]?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bsure[,!]?\s*', re.IGNORECASE), ''),
    (re.compile(r'\babsolutely[,!]?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bi hope (this|that) helps\.?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bplease let me know if you (have|need)\b[^.]*\.', re.IGNORECASE), ''),
    (re.compile(r'\blet me know if you have any (other )?questions\.?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bin this (article|document|guide|section|report),?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bwithout further ado,?\s*', re.IGNORECASE), ''),
    (re.compile(r'\bit(\'s| is) worth mentioning that\b', re.IGNORECASE), ''),
    (re.compile(r'\bhere (is|are) (the|some|a few)\b', re.IGNORECASE), ''),

    # Strip navigational/menu boilerplate patterns
    (re.compile(r'^(Home|Menu|Navigation|Skip to content|Table of Contents)\s*[|>»]\s*', re.IGNORECASE | re.MULTILINE), ''),

    # Strip repeated separator lines
    (re.compile(r'^[-=_]{3,}$', re.MULTILINE), ''),
]

def normalize_sentence(s: str) -> str:
    s = s.lower()
    s = re.sub(r'[^\w\s]', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def deduplicate_sentences(text: str) -> str:
    # Split by sentence-ending punctuation followed by space
    sentences = re.split(r'(?<=[.!?])\s+', text)
    seen = set()
    result = []
    for sentence in sentences:
        normalized = normalize_sentence(sentence)
        if len(normalized) < 5:
            result.append(sentence)
            continue
        if normalized not in seen:
            seen.add(normalized)
            result.append(sentence)
    return ' '.join(result)

def guard_sinks(text: str, sinks: List[str]) -> Tuple[str, Dict[str, str]]:
    markers = {}
    guarded = text
    for i, sink in enumerate(sinks):
        marker = f"__APEX_SINK_{i}__"
        markers[marker] = sink
        guarded = guarded.replace(sink, marker)
    return guarded, markers

def restore_sinks(text: str, markers: Dict[str, str]) -> str:
    result = text
    for marker, original in markers.items():
        result = result.replace(marker, original)
    return result

def prune_heuristic(text: str, attention_sinks: List[str] = None) -> str:
    """
    Apply heuristic pruning to text input.
    """
    if not text:
        return ""
    if attention_sinks is None:
        attention_sinks = []
        
    guarded, markers = guard_sinks(text, attention_sinks)
    
    result = guarded
    for pattern, replacement in PRUNE_RULES:
        result = pattern.sub(replacement, result)
        
    result = deduplicate_sentences(result)
    result = restore_sinks(result, markers)
    
    return result.strip()
