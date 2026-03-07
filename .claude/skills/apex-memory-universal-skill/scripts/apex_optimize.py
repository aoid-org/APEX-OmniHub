#!/usr/bin/env python3
"""
APEX-Memory(TM) Context Optimizer -- Full Pipeline
(C) 2025 APEX Business Systems Ltd. All Rights Reserved.
Proprietary and Confidential. Unauthorized use prohibited.

Full context optimization pipeline: analyze -> compress -> verify -> report.
Exit codes: 0=success, 1=input error, 2=system error
"""

import sys
import json
import argparse
import hashlib
import re
import os
from pathlib import Path
from datetime import datetime
from collections import Counter

# --- PROPRIETARY HEADER -------------------------------------------------------
APEX_HEADER = "APEX-Memory v2.0.0 | (C) 2025 APEX Business Systems Ltd."
# ------------------------------------------------------------------------------


def count_tokens(text: str) -> int:
    """Estimate token count ( words  1.3 for English text)."""
    return max(1, int(len(text.split()) * 1.3))


def extract_entities(text: str) -> list:
    """Extract named entities using pattern matching (no ML dependencies)."""
    patterns = {
        "file_paths": r'(?:[A-Za-z]:\\|/)[^\s\'"]+|\.\/[^\s\'"]+',
        "urls": r'https?://[^\s\'"]+',
        "emails": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "ip_addresses": r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",
        "env_vars": r"\b[A-Z][A-Z0-9_]{2,}\b",
        "quoted_strings": r'"([^"]{3,})"',
        "code_refs": r"`([^`]+)`",
    }
    entities = {}
    for entity_type, pattern in patterns.items():
        matches = list(set(re.findall(pattern, text)))
        if matches:
            entities[entity_type] = matches[:20]  # Cap at 20 per type
    return entities


def extract_facts(text: str) -> list:
    """Extract fact-like sentences (declarative, specific)."""
    sentences = re.split(r"[.!?\n]+", text)
    facts = []
    fact_indicators = [
        "is",
        "are",
        "was",
        "were",
        "has",
        "have",
        "must",
        "should",
        "requires",
        "uses",
        "runs",
        "deploys",
        "config",
        "set to",
        "equals",
        "returns",
        "expects",
        "depends",
    ]
    for sent in sentences:
        sent = sent.strip()
        if len(sent) < 10 or len(sent) > 300:
            continue
        lower = sent.lower()
        if any(ind in lower for ind in fact_indicators):
            facts.append(sent)
    return facts


def split_primacy_recency(text: str) -> dict:
    """Split text into primacy (20%), middle (70%), recency (10%) zones."""
    total = len(text)
    p_end = int(total * 0.20)
    r_start = int(total * 0.90)
    return {
        "primacy": text[:p_end],
        "middle": text[p_end:r_start],
        "recency": text[r_start:],
    }


def compress_middle(text: str, ratio: int = 5) -> str:
    """Map-reduce compression of the middle zone."""
    if not text.strip():
        return text

    # Chunk into ~1000-char segments
    chunk_size = 1000
    chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

    summaries = []
    for chunk in chunks:
        facts = extract_facts(chunk)
        if facts:
            # Keep top facts based on entity density
            scored = []
            for f in facts:
                score = len(extract_entities(f))
                scored.append((score, f))
            scored.sort(reverse=True)
            keep = max(1, len(scored) // ratio)
            summaries.extend([s[1] for s in scored[:keep]])
        else:
            # Extractive: keep first and last sentence
            sents = [s.strip() for s in re.split(r"[.!?\n]+", chunk) if s.strip()]
            if sents:
                summaries.append(sents[0])
                if len(sents) > 1:
                    summaries.append(sents[-1])

    return ". ".join(summaries)


def semantic_dedup(text: str, threshold: float = 0.8) -> str:
    """Remove near-duplicate lines using Jaccard similarity."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if not lines:
        return text

    kept = [lines[0]]
    for line in lines[1:]:
        words_new = set(line.lower().split())
        is_dup = False
        for existing in kept[-10:]:  # Compare against recent 10 lines
            words_existing = set(existing.lower().split())
            if not words_new or not words_existing:
                continue
            intersection = words_new & words_existing
            union = words_new | words_existing
            jaccard = len(intersection) / len(union)
            if jaccard >= threshold:
                is_dup = True
                break
        if not is_dup:
            kept.append(line)

    return "\n".join(kept)


def optimize_context(text: str, ratio: int = 5, max_tokens: int = None) -> dict:
    """Full APEX-Memory(TM) optimization pipeline."""
    original_tokens = count_tokens(text)

    # Step 1: Semantic deduplication
    deduped = semantic_dedup(text)
    dedup_tokens = count_tokens(deduped)

    # Step 2: Primacy-Recency split
    zones = split_primacy_recency(deduped)

    # Step 3: Compress middle zone
    compressed_middle = compress_middle(zones["middle"], ratio=ratio)

    # Step 4: Reconstruct
    optimized = (
        zones["primacy"] + "\n\n" + compressed_middle + "\n\n" + zones["recency"]
    )

    # Step 5: Extract metadata
    entities = extract_entities(text)
    facts = extract_facts(text)
    optimized_tokens = count_tokens(optimized)

    # Step 6: Quality verification
    original_facts = set(extract_facts(text))
    retained_facts = set(extract_facts(optimized))
    if original_facts:
        fact_retention = len(retained_facts & original_facts) / len(original_facts)
    else:
        fact_retention = 1.0

    context_hash = hashlib.sha256(optimized.encode()).hexdigest()[:16]

    return {
        "optimized_text": optimized,
        "stats": {
            "original_tokens": original_tokens,
            "optimized_tokens": optimized_tokens,
            "compression_ratio": round(original_tokens / max(1, optimized_tokens), 2),
            "dedup_savings_pct": round(
                (1 - dedup_tokens / max(1, original_tokens)) * 100, 1
            ),
            "fact_retention_pct": round(fact_retention * 100, 1),
            "entities_extracted": sum(len(v) for v in entities.values()),
            "facts_extracted": len(facts),
            "context_hash": context_hash,
        },
        "entities": entities,
        "quality": {
            "pass": fact_retention >= 0.90,
            "retention": round(fact_retention * 100, 1),
            "threshold": 90.0,
        },
    }


def main():
    parser = argparse.ArgumentParser(
        description=f"{APEX_HEADER}\nFull context optimization pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Input context file to optimize")
    parser.add_argument(
        "--output", "-o", type=Path, help="Output file for optimized context"
    )
    parser.add_argument(
        "--ratio", "-r", type=int, default=5, help="Compression ratio (default: 5)"
    )
    parser.add_argument("--max-tokens", type=int, help="Maximum output token count")
    parser.add_argument(
        "--stats", "-s", action="store_true", help="Print statistics to stderr"
    )
    parser.add_argument(
        "--json", "-j", action="store_true", help="Output full report as JSON"
    )
    parser.add_argument("--version", "-v", action="version", version=APEX_HEADER)
    args = parser.parse_args()

    if not args.input.exists():
        print(f"[NO] File not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    try:
        text = args.input.read_text(encoding="utf-8")
    except Exception as e:
        print(f"[NO] Read error: {e}", file=sys.stderr)
        sys.exit(2)

    result = optimize_context(text, ratio=args.ratio, max_tokens=args.max_tokens)

    if args.json:
        report = {
            "tool": APEX_HEADER,
            "timestamp": datetime.now().isoformat(),
            "input_file": str(args.input),
            "stats": result["stats"],
            "entities": result["entities"],
            "quality": result["quality"],
        }
        print(json.dumps(report, indent=2))
    else:
        if args.output:
            args.output.write_text(result["optimized_text"], encoding="utf-8")
            print(f"[OK] Optimized -> {args.output}", file=sys.stderr)
        else:
            print(result["optimized_text"])

    if args.stats:
        s = result["stats"]
        q = result["quality"]
        print(f"\n{'=' * 60}", file=sys.stderr)
        print(f"  {APEX_HEADER}", file=sys.stderr)
        print(f"{'=' * 60}", file=sys.stderr)
        print(f"  Original:     {s['original_tokens']} tokens", file=sys.stderr)
        print(f"  Optimized:    {s['optimized_tokens']} tokens", file=sys.stderr)
        print(f"  Compression:  {s['compression_ratio']}:1", file=sys.stderr)
        print(f"  Dedup Saved:  {s['dedup_savings_pct']}%", file=sys.stderr)
        print(f"  Fact Retain:  {s['fact_retention_pct']}%", file=sys.stderr)
        print(f"  Entities:     {s['entities_extracted']}", file=sys.stderr)
        print(
            f"  Quality:      {'[OK] PASS' if q['pass'] else '[NO] FAIL'}", file=sys.stderr
        )
        print(f"  Hash:         {s['context_hash']}", file=sys.stderr)
        print(f"{'=' * 60}", file=sys.stderr)


if __name__ == "__main__":
    main()
