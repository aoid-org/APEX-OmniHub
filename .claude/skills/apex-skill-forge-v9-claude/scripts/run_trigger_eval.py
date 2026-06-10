#!/usr/bin/env python3
"""Live trigger accuracy measurement for apex-skill-forge.
Calls Anthropic API once per query in evals/trigger-eval.json.
Writes results to evals/trigger-eval-results.json.
Exit 0 = ran successfully (accuracy may still be < 1.0).

Set MOCK_JUDGE=1 to validate the harness without an API key: a keyword
heuristic stands in for the model and results are labeled "mode": "mock".
Mock accuracy is a harness check only — never copy it into scorecard.json.
"""
from __future__ import annotations
import json, os, sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
EVAL_PATH = SKILL_DIR / "evals" / "trigger-eval.json"
RESULTS_PATH = SKILL_DIR / "evals" / "trigger-eval-results.json"

DESCRIPTION = (SKILL_DIR / "SKILL.md").read_text(encoding="utf-8").split("description:")[1].split("\n")[0].strip().strip('"')

JUDGE_PROMPT = """You are a skill-routing evaluator. Given a skill description and a user query, decide whether the skill would be selected to handle that query.

Skill description: {description}

User query: {query}

Reply with exactly one word: YES if the skill should handle this query, NO if it should not."""

MOCK_MODE = os.environ.get("MOCK_JUDGE") == "1"


def judge_live(client, query: str) -> str:
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=5,
        messages=[{"role": "user", "content": JUDGE_PROMPT.format(
            description=DESCRIPTION, query=query)}],
    )
    return msg.content[0].text.strip().upper()


def judge_mock(query: str) -> str:
    # Keyword stand-in for the model: exercises both YES and NO paths.
    q = query.lower()
    return "YES" if ("skill" in q and "mcp" not in q) else "NO"


def main() -> int:
    if MOCK_MODE:
        client = None
        print("MODE: MOCK (harness validation only — not a measured accuracy)")
    else:
        if not os.environ.get("ANTHROPIC_API_KEY"):
            print("BLOCKED: ANTHROPIC_API_KEY not set — set it then re-run")
            return 1
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    queries = json.loads(EVAL_PATH.read_text(encoding="utf-8"))
    results = []
    correct = 0
    for item in queries:
        answer = judge_mock(item["query"]) if MOCK_MODE else judge_live(client, item["query"])
        triggered = answer.startswith("Y")
        expected = item["should_trigger"]
        match = triggered == expected
        if match:
            correct += 1
        results.append({
            "query": item["query"],
            "should_trigger": expected,
            "model_triggered": triggered,
            "model_raw": answer,
            "correct": match,
        })
        print(f"  [{'PASS' if match else 'FAIL'}] should={expected} got={triggered} | {item['query'][:60]}")

    accuracy = round(correct / len(queries), 4)
    print(f"\nACCURACY: {correct}/{len(queries)} = {accuracy}")
    RESULTS_PATH.write_text(json.dumps({
        "mode": "mock" if MOCK_MODE else "live",
        "accuracy": accuracy, "correct": correct,
        "total": len(queries), "results": results}, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
