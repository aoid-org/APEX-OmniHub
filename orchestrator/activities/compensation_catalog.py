"""Side-effect compensation catalog for replay-safe workflows."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

CompensationHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


@dataclass(frozen=True)
class CompensationEntry:
    ref: str
    owner: str
    description: str
    handler: CompensationHandler | None = None


class CompensationCatalog:
    def __init__(self) -> None:
        self._entries: dict[str, CompensationEntry] = {}

    def register(self, entry: CompensationEntry) -> None:
        if not entry.ref.startswith("apex.comp."):
            raise ValueError("compensation_ref_must_use_apex_namespace")
        self._entries[entry.ref] = entry

    def get(self, ref: str | None) -> CompensationEntry | None:
        return self._entries.get(ref or "")


catalog = CompensationCatalog()
