#!/usr/bin/env python3
"""
APEX-Memory(TM) Context Compressor
(C) 2025 APEX Business Systems Ltd. All Rights Reserved.
Proprietary and Confidential. Unauthorized use prohibited.

Standalone compression tool implementing primacy-recency + semantic dedup + map-reduce.
Exit codes: 0=success, 1=input error, 2=system error
"""

import sys
import re
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime

APEX_HEADER = "APEX-Memory Compress v2.0.0 | (C) 2025 APEX Business Systems Ltd."


def count_tokens(text: str) -> int:
    """Estimate token count."""
    return max(1, int(len(text.split()) * 1.3))


def jaccard_similarity(a: str, b: str) -> float:
    """Compute Jaccard similarity between two strings."""
    words_a = set(a.lower().split())
    words_b = set(b.lower().split())
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)


def semantic_dedup(lines: list, threshold: float = 0.75) -> list:
    """Remove near-duplicate lines."""
    if not lines:
        return lines
    kept = [lines[0]]
    for line in lines[1:]:
        if not line.strip():
            kept.append(line)
            continue
        is_dup = any(
            jaccard_similarity(line, k) >= threshold for k in kept[-15:] if k.strip()
        )
        if not is_dup:
            kept.append(line)
    return kept


def score_sentence(sent: str) -> float:
    """Score sentence importance by entity density and keyword presence."""
    score = 0.0
    score += len(re.findall(r"\b[A-Z][a-z]{2,}\b", sent)) * 1.5  # Proper nouns
    score += len(re.findall(r"`[^`]+`", sent)) * 2.0  # Code references
    score += len(re.findall(r"\b\d+\b", sent)) * 0.5  # Numbers
    score += (
        len(
            re.findall(
                r"(?:error|fix|bug|crash|fail|issue|resolve|deploy|config|install)",
                sent,
                re.I,
            )
        )
        * 2.0
    )
    score += (
        len(
            re.findall(
                r"(?:must|should|require|critical|important|always|never)", sent, re.I
            )
        )
        * 1.5
    )
    # Penalize short/generic sentences
    if len(sent.split()) < 5:
        score *= 0.3
    return score


def extractive_compress(text: str, ratio: int = 5) -> str:
    """Extractive compression: keep highest-scored sentences."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?\n])\s+", text) if s.strip()]
    if not sentences:
        return text

    # Preserve code blocks entirely
    code_blocks = re.findall(r"```[\s\S]*?```", text)
    non_code_text = re.sub(r"```[\s\S]*?```", "", text)
    sentences = [
        s.strip() for s in re.split(r"(?<=[.!?\n])\s+", non_code_text) if s.strip()
    ]

    scored = [(score_sentence(s), i, s) for i, s in enumerate(sentences)]
    scored.sort(reverse=True)

    keep_count = max(3, len(scored) // ratio)
    kept = scored[:keep_count]
    kept.sort(key=lambda x: x[1])  # Restore order

    result = ". ".join([k[2] for k in kept])

    # Re-attach code blocks
    for block in code_blocks:
        result += "\n\n" + block

    return result


def compress_context(text: str, ratio: int = 5, preserve_code: bool = True) -> dict:
    """Full APEX-Memory(TM) compression pipeline."""
    original_tokens = count_tokens(text)

    # Phase 1: Dedup
    lines = text.split("\n")
    deduped_lines = semantic_dedup(lines)
    deduped = "\n".join(deduped_lines)

    # Phase 2: Primacy-Recency split
    total = len(deduped)
    primacy = deduped[: int(total * 0.20)]
    middle = deduped[int(total * 0.20) : int(total * 0.90)]
    recency = deduped[int(total * 0.90) :]

    # Phase 3: Compress middle
    compressed_middle = extractive_compress(middle, ratio=ratio)

    # Phase 4: Reconstruct
    result = (
        primacy
        + "\n\n[--- COMPRESSED ZONE ---]\n\n"
        + compressed_middle
        + "\n\n[--- END COMPRESSED ---]\n\n"
        + recency
    )

    compressed_tokens = count_tokens(result)

    return {
        "compressed_text": result,
        "original_tokens": original_tokens,
        "compressed_tokens": compressed_tokens,
        "ratio": round(original_tokens / max(1, compressed_tokens), 2),
        "savings_pct": round(
            (1 - compressed_tokens / max(1, original_tokens)) * 100, 1
        ),
        "dedup_removed": len(lines) - len(deduped_lines),
        "hash": hashlib.sha256(result.encode()).hexdigest()[:16],
    }


def main():
    parser = argparse.ArgumentParser(
        description=f"{APEX_HEADER}\nStandalone context compression tool.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Input context file")
    parser.add_argument("--output", "-o", type=Path, help="Output file")
    parser.add_argument(
        "--ratio", "-r", type=int, default=5, help="Compression ratio (default: 5)"
    )
    parser.add_argument(
        "--json", "-j", action="store_true", help="Output stats as JSON"
    )
    parser.add_argument("--version", "-v", action="version", version=APEX_HEADER)
    args = parser.parse_args()

    if not args.input.exists():
        print(f"[NO] File not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    text = args.input.read_text(encoding="utf-8")
    result = compress_context(text, ratio=args.ratio)

    if args.json:
        report = {
            "tool": APEX_HEADER,
            "timestamp": datetime.now().isoformat(),
            "input": str(args.input),
            "original_tokens": result["original_tokens"],
            "compressed_tokens": result["compressed_tokens"],
            "ratio": result["ratio"],
            "savings_pct": result["savings_pct"],
            "dedup_removed": result["dedup_removed"],
            "hash": result["hash"],
        }
        print(json.dumps(report, indent=2))
    elif args.output:
        args.output.write_text(result["compressed_text"], encoding="utf-8")
        print(
            f"[OK] Compressed {result['original_tokens']} -> {result['compressed_tokens']} tokens ({result['ratio']}:1)",
            file=sys.stderr,
        )
    else:
        print(result["compressed_text"])


if __name__ == "__main__":
    main()
