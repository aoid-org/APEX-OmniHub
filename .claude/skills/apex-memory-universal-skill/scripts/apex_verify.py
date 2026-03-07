#!/usr/bin/env python3
"""
APEX-Memory(TM) Hallucination Verifier
(C) 2025 APEX Business Systems Ltd. All Rights Reserved.
Proprietary and Confidential. Unauthorized use prohibited.

Audits a response for potential hallucinations by checking claims against context.
Exit codes: 0=all clear, 1=hallucinations detected, 2=system error
"""

import sys
import re
import json
import argparse
from pathlib import Path
from datetime import datetime

APEX_HEADER = "APEX-Memory Verifier v2.0.0 | (C) 2025 APEX Business Systems Ltd."


def extract_claims(response: str) -> list:
    """Extract factual claims from a response."""
    sentences = re.split(r"(?<=[.!?])\s+", response)
    claims = []
    # Factual indicators: definitive statements
    fact_words = [
        "is",
        "are",
        "was",
        "were",
        "will",
        "has",
        "have",
        "had",
        "uses",
        "requires",
        "runs",
        "deploys",
        "returns",
        "equals",
        "contains",
        "supports",
        "enables",
        "provides",
        "implements",
    ]
    for sent in sentences:
        sent = sent.strip()
        if len(sent) < 15:
            continue
        lower = sent.lower()
        # Skip hedged statements (already flagged as uncertain)
        if any(
            h in lower
            for h in [
                "i think",
                "maybe",
                "perhaps",
                "might",
                "possibly",
                "i'm not sure",
            ]
        ):
            continue
        # Check for factual indicators
        if any(f" {w} " in f" {lower} " for w in fact_words):
            claims.append(sent)
    return claims


def check_claim_in_context(claim: str, context: str, threshold: float = 0.3) -> dict:
    """Check if a claim is grounded in the context using keyword overlap."""
    claim_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", claim.lower()))
    context_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", context.lower()))

    if not claim_words:
        return {"grounded": True, "score": 1.0, "reason": "empty_claim"}

    # Remove common stop words
    stop_words = {
        "the",
        "and",
        "for",
        "are",
        "but",
        "not",
        "you",
        "all",
        "can",
        "had",
        "her",
        "was",
        "one",
        "our",
        "out",
        "has",
        "his",
        "how",
        "its",
        "may",
        "new",
        "now",
        "old",
        "see",
        "way",
        "who",
        "did",
        "get",
        "let",
        "say",
        "she",
        "too",
        "use",
        "this",
        "that",
        "with",
        "have",
        "from",
        "they",
        "been",
        "said",
        "each",
        "make",
        "like",
        "than",
        "into",
        "some",
        "could",
        "them",
        "would",
        "these",
        "other",
        "which",
        "their",
        "there",
        "about",
        "will",
        "what",
        "when",
        "where",
    }
    claim_words -= stop_words
    context_words -= stop_words

    if not claim_words:
        return {"grounded": True, "score": 1.0, "reason": "stopwords_only"}

    overlap = claim_words & context_words
    score = len(overlap) / len(claim_words)

    return {
        "grounded": score >= threshold,
        "score": round(score, 3),
        "matched_keywords": sorted(list(overlap))[:10],
        "unmatched_keywords": sorted(list(claim_words - overlap))[:10],
    }


def detect_temporal_violations(response: str) -> list:
    """Detect claims about future events or beyond knowledge cutoff."""
    violations = []
    future_patterns = [
        r"\b(will be|will have|going to|expected to|predicted to)\b",
        r"\b(in 20(?:2[6-9]|[3-9]\d))\b",  # Years 2026+
        r"\b(next year|next month|upcoming)\b",
    ]
    for pattern in future_patterns:
        matches = re.finditer(pattern, response, re.IGNORECASE)
        for match in matches:
            # Get surrounding sentence
            start = max(0, response.rfind(".", 0, match.start()) + 1)
            end = response.find(".", match.end())
            if end == -1:
                end = len(response)
            violations.append(
                {
                    "type": "temporal_violation",
                    "match": match.group(),
                    "context": response[start:end].strip(),
                }
            )
    return violations


def detect_fabrication_patterns(response: str) -> list:
    """Detect patterns that commonly indicate fabricated information."""
    flags = []
    # Exact statistics without source
    stat_pattern = r"\b\d{1,3}(?:\.\d+)?%\b"
    stats = re.findall(stat_pattern, response)
    for stat in stats:
        # Check if there's a source citation nearby
        idx = response.find(stat)
        nearby = response[max(0, idx - 100) : idx + 100]
        if not any(
            w in nearby.lower()
            for w in ["source", "study", "research", "according", "reported", "found"]
        ):
            flags.append(
                {
                    "type": "unsourced_statistic",
                    "value": stat,
                    "warning": "Statistic without source citation",
                }
            )

    # Invented function/API names (camelCase or snake_case not in context)
    func_pattern = r"\b(?:[a-z]+[A-Z][a-zA-Z]*|[a-z]+_[a-z]+_[a-z]+)\(\)"
    funcs = re.findall(func_pattern, response)
    if funcs:
        flags.append(
            {
                "type": "potential_code_fabrication",
                "values": funcs[:5],
                "warning": "Function calls detected -- verify they exist in codebase",
            }
        )

    return flags


def verify_response(response: str, context: str = None) -> dict:
    """Full APEX-Memory(TM) verification pipeline."""
    claims = extract_claims(response)
    temporal = detect_temporal_violations(response)
    fabrications = detect_fabrication_patterns(response)

    results = {
        "total_claims": len(claims),
        "grounded_claims": 0,
        "ungrounded_claims": 0,
        "temporal_violations": len(temporal),
        "fabrication_flags": len(fabrications),
        "details": [],
    }

    for claim in claims:
        if context:
            check = check_claim_in_context(claim, context)
            if check["grounded"]:
                results["grounded_claims"] += 1
            else:
                results["ungrounded_claims"] += 1
                results["details"].append(
                    {
                        "claim": claim[:200],
                        "status": "UNGROUNDED",
                        "score": check["score"],
                        "unmatched": check.get("unmatched_keywords", []),
                    }
                )
        else:
            # Without context, we can only flag the claim for review
            results["details"].append(
                {
                    "claim": claim[:200],
                    "status": "UNCHECKED",
                    "reason": "No context provided for verification",
                }
            )

    if temporal:
        results["details"].extend(temporal)
    if fabrications:
        results["details"].extend(fabrications)

    # Overall verdict
    total_issues = (
        results["ungrounded_claims"]
        + results["temporal_violations"]
        + results["fabrication_flags"]
    )
    if total_issues == 0:
        results["verdict"] = "[OK] CLEAN -- No hallucinations detected"
        results["exit_code"] = 0
    elif total_issues <= 2:
        results["verdict"] = " CAUTION -- Minor concerns found"
        results["exit_code"] = 1
    else:
        results["verdict"] = "[STOP] ALERT -- Multiple hallucination signals detected"
        results["exit_code"] = 1

    return results


def main():
    parser = argparse.ArgumentParser(
        description=f"{APEX_HEADER}\nAudit a response for potential hallucinations.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("response", type=Path, help="Response file to verify")
    parser.add_argument(
        "--context", "-c", type=Path, help="Context file to check against"
    )
    parser.add_argument("--json", "-j", action="store_true", help="Output as JSON")
    parser.add_argument("--version", "-v", action="version", version=APEX_HEADER)
    args = parser.parse_args()

    if not args.response.exists():
        print(f"[NO] File not found: {args.response}", file=sys.stderr)
        sys.exit(2)

    response = args.response.read_text(encoding="utf-8")
    context = (
        args.context.read_text(encoding="utf-8")
        if args.context and args.context.exists()
        else None
    )

    result = verify_response(response, context)

    if args.json:
        report = {
            "tool": APEX_HEADER,
            "timestamp": datetime.now().isoformat(),
            "input_file": str(args.response),
            "context_file": str(args.context) if args.context else None,
            **result,
        }
        print(json.dumps(report, indent=2, default=str))
    else:
        print(f"\n{'=' * 60}")
        print(f"  {APEX_HEADER}")
        print(f"{'=' * 60}")
        print(f"  Total Claims:      {result['total_claims']}")
        print(f"  Grounded:          {result['grounded_claims']}")
        print(f"  Ungrounded:        {result['ungrounded_claims']}")
        print(f"  Temporal Issues:   {result['temporal_violations']}")
        print(f"  Fabrication Flags: {result['fabrication_flags']}")
        print(f"  Verdict:           {result['verdict']}")
        print(f"{'=' * 60}")

        if result["details"]:
            print(f"\n  DETAILS:")
            for i, detail in enumerate(result["details"][:10], 1):
                status = detail.get("status", detail.get("type", "FLAG"))
                claim = detail.get("claim", detail.get("match", "N/A"))
                print(f"  [{i}] {status}: {claim[:80]}...")
        print()

    sys.exit(result["exit_code"])


if __name__ == "__main__":
    main()
