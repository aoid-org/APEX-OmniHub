"""Deterministic recursive hydration helpers for plan templates."""

from __future__ import annotations

from typing import Any


def build_replacement_pairs(replacements: dict[str, str]) -> list[tuple[str, str]]:
    """Return replacement pairs sorted longest-first to avoid partial collisions."""
    return sorted(replacements.items(), key=lambda item: len(item[0]), reverse=True)


def transform_nested_values(value: Any, replacement_pairs: list[tuple[str, str]]) -> Any:
    """Recursively transform strings in nested dict/list payloads."""
    if isinstance(value, str):
        transformed = value
        for needle, replacement in replacement_pairs:
            transformed = transformed.replace(needle, replacement)
        return transformed

    if isinstance(value, dict):
        return {
            key: transform_nested_values(nested_value, replacement_pairs)
            for key, nested_value in value.items()
        }

    if isinstance(value, list):
        return [transform_nested_values(item, replacement_pairs) for item in value]

    return value


def inject_parameters(plan_steps: list[dict[str, Any]], parameters: dict[str, str]) -> list[dict[str, Any]]:
    """Replace {PARAM} placeholders with concrete values across nested payloads."""
    replacement_pairs = build_replacement_pairs(
        {f"{{{param_name}}}": param_value for param_name, param_value in parameters.items()}
    )
    return [
        transform_nested_values(step, replacement_pairs) for step in plan_steps
    ]


def parameterize_steps(
    plan_steps: list[dict[str, Any]], parameters: dict[str, str]
) -> list[dict[str, Any]]:
    """Replace concrete values with {PARAM} placeholders across nested payloads."""
    replacement_pairs = build_replacement_pairs(
        {param_value: f"{{{param_name}}}" for param_name, param_value in parameters.items()}
    )
    return [
        transform_nested_values(step, replacement_pairs) for step in plan_steps
    ]
