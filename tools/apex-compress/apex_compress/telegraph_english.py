"""
Phase 2: Telegraph English (TE) Compression
Achieves 40-65% input token reduction on instruction/prose text
via deterministic symbolic rewriting.
"""

import re
from typing import List, Tuple, Dict, Any

TE_SUBSTITUTIONS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r'\bin order to\b', re.IGNORECASE), 'to'),
    (re.compile(r'\bas well as\b', re.IGNORECASE), '&'),
    (re.compile(r'\bfor example\b', re.IGNORECASE), 'e.g.'),
    (re.compile(r'\bthat is to say\b', re.IGNORECASE), 'i.e.'),
    (re.compile(r'\bthat is\b', re.IGNORECASE), 'i.e.'),
    (re.compile(r'\bsuch as\b', re.IGNORECASE), 'e.g.'),
    (re.compile(r'\bbecause of\b', re.IGNORECASE), 'due to'),
    (re.compile(r'\bas a result of\b', re.IGNORECASE), 'due to'),
    (re.compile(r'\bwith respect to\b', re.IGNORECASE), 're:'),
    (re.compile(r'\bwith regard to\b', re.IGNORECASE), 're:'),
    (re.compile(r'\bregarding\b', re.IGNORECASE), 're:'),
    (re.compile(r'\bpertaining to\b', re.IGNORECASE), 're:'),
    (re.compile(r'\bif and only if\b', re.IGNORECASE), 'iff'),
    (re.compile(r'\bif applicable\b', re.IGNORECASE), 'if applic.'),
    (re.compile(r'\bwhenever possible\b', re.IGNORECASE), 'when poss.'),
    (re.compile(r'\bas appropriate\b', re.IGNORECASE), 'as approp.'),
    (re.compile(r'\bthe following\b', re.IGNORECASE), 'these'),
    (re.compile(r'\bin addition to\b', re.IGNORECASE), '& also'),
    (re.compile(r'\bon the other hand\b', re.IGNORECASE), 'conversely'),
    (re.compile(r'\bat the same time\b', re.IGNORECASE), 'simultaneously'),
    (re.compile(r'\bin the event that\b', re.IGNORECASE), 'if'),
    (re.compile(r'\bfor the purpose of\b', re.IGNORECASE), 'to'),
    (re.compile(r'\bin the context of\b', re.IGNORECASE), 'within'),
    (re.compile(r'\bwith the exception of\b', re.IGNORECASE), 'except'),
    (re.compile(r'\btake into account\b', re.IGNORECASE), 'consider'),
    (re.compile(r'\btake into consideration\b', re.IGNORECASE), 'consider'),
    (re.compile(r'\bin spite of\b', re.IGNORECASE), 'despite'),
    (re.compile(r'\bin conjunction with\b', re.IGNORECASE), 'with'),

    (re.compile(r'\bmake sure (that |to )', re.IGNORECASE), 'ensure '),
    (re.compile(r'\byou (should|must|need to|are required to|have to) ', re.IGNORECASE), ''),
    (re.compile(r'\bplease\s+', re.IGNORECASE), ''),
    (re.compile(r'\bit is (required|necessary|important|critical|essential)\s+(that |to )', re.IGNORECASE), 'must '),
    (re.compile(r'\bdo not\b', re.IGNORECASE), "don't"),
    (re.compile(r'\bcannot\b', re.IGNORECASE), "can't"),
    (re.compile(r'\bwill not\b', re.IGNORECASE), "won't"),
    (re.compile(r'\bshould not\b', re.IGNORECASE), "shouldn't"),
    (re.compile(r'\bwould not\b', re.IGNORECASE), "wouldn't"),
    (re.compile(r'\bcould not\b', re.IGNORECASE), "couldn't"),

    (re.compile(r'^(\s*[-*•]\s*)the\s+', re.IGNORECASE | re.MULTILINE), r'\1'),
    (re.compile(r'^(\s*\d+[.)]\s*)the\s+', re.IGNORECASE | re.MULTILINE), r'\1'),
    (re.compile(r'^(\s*[-*•]\s*)an?\s+', re.IGNORECASE | re.MULTILINE), r'\1'),
    (re.compile(r'^(\s*\d+[.)]\s*)an?\s+', re.IGNORECASE | re.MULTILINE), r'\1'),

    (re.compile(r'\byou are (an? )', re.IGNORECASE), ''),
    (re.compile(r'\brespond (only |strictly )?in\b', re.IGNORECASE), 'Output:'),
    (re.compile(r'\breturn (only |strictly )?(a |the )', re.IGNORECASE), 'Return: '),
    (re.compile(r'\byour response (must|should) (be|include)\b', re.IGNORECASE), 'Output:'),
    (re.compile(r'\.\s{2,}', re.MULTILINE), '. '),

    (re.compile(r'\bit should be noted that\b', re.IGNORECASE), ''),
    (re.compile(r'\bas mentioned (above|earlier|previously|before)\b', re.IGNORECASE), ''),
    (re.compile(r'\bkeep in mind that\b', re.IGNORECASE), 'note:'),
    (re.compile(r'\bbased on the fact that\b', re.IGNORECASE), 'since'),
    (re.compile(r'\bdue to the fact that\b', re.IGNORECASE), 'since'),
    (re.compile(r'\bin light of\b', re.IGNORECASE), 'given'),
    (re.compile(r'\bby means of\b', re.IGNORECASE), 'via'),
    (re.compile(r'\bhas the ability to\b', re.IGNORECASE), 'can'),
    (re.compile(r'\bis able to\b', re.IGNORECASE), 'can'),
    (re.compile(r'\bin order for\b', re.IGNORECASE), 'for'),
    (re.compile(r'\bat this point in time\b', re.IGNORECASE), 'now'),
    (re.compile(r'\bprior to\b', re.IGNORECASE), 'before'),
    (re.compile(r'\bsubsequent to\b', re.IGNORECASE), 'after'),
    (re.compile(r'\bin the process of\b', re.IGNORECASE), 'during'),
]

TE_EXEMPT_PATTERNS = [
    re.compile(r'```[\s\S]*?```'),
    re.compile(r'`[^`]+`'),
    re.compile(r'"[^"]*"\s*:'),
    re.compile(r'https?:\/\/\S+'),
    re.compile(r'\$\{[^}]+\}'),
    re.compile(r'\{\{[^}]+\}\}'),
    re.compile(r'<[^>]+>'),
]

def guard_exemptions(text: str, attention_sinks: List[str]) -> Dict[str, Any]:
    exempts = {}
    sinks = {}
    working = text
    block_idx = 0
    
    for pattern in TE_EXEMPT_PATTERNS:
        matches = list(pattern.finditer(working))
        # Replace from end to start to avoid index shifts
        for match in reversed(matches):
            key = f"__TE_EXEMPT_{block_idx}__"
            block_idx += 1
            exempts[key] = match.group(0)
            working = working[:match.start()] + key + working[match.end():]
            
    for i, sink in enumerate(attention_sinks):
        key = f"__TE_SINK_{i}__"
        sinks[key] = sink
        working = working.replace(sink, key)
        
    return {"text": working, "exempts": exempts, "sinks": sinks}

def restore_guards(text: str, state: Dict[str, Any]) -> str:
    result = text
    for marker, original in state["sinks"].items():
        result = result.replace(marker, original)
    for key, original in state["exempts"].items():
        result = result.replace(key, original)
    return result

def compress_telegraph_english(text: str, attention_sinks: List[str] = None) -> str:
    if not text:
        return ""
    if attention_sinks is None:
        attention_sinks = []
        
    guard_state = guard_exemptions(text, attention_sinks)
    working = guard_state["text"]
    
    for pattern, replacement in TE_SUBSTITUTIONS:
        working = pattern.sub(replacement, working)
        
    working = restore_guards(working, guard_state)
    return working.strip()
