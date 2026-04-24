"""L1 keyword rule filter. Pure function; no DB access.

Spec §10.1. Venue Tier-A bypass first, then positive keyword presence.
Negative/immune logic lives in L2 per spec — L1 only decides
"does this paper clear the keyword gate".
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class Keywords:
    positive_cs_core: list[str] = field(default_factory=list)
    positive_finance_core: list[str] = field(default_factory=list)
    positive_crosscut: list[str] = field(default_factory=list)
    strong_negative: list[str] = field(default_factory=list)
    weak_negative: list[str] = field(default_factory=list)
    immune: list[str] = field(default_factory=list)

    def positive_flat(self) -> list[str]:
        return [*self.positive_cs_core, *self.positive_finance_core, *self.positive_crosscut]


class _PaperLike(Protocol):
    title: str
    abstract: str | None
    venue_normalized: str | None


def level1_filter(
    paper: _PaperLike,
    keywords: Keywords,
    tier_a_venues: Iterable[str],
) -> tuple[bool, list[str]]:
    """Return (passed, reasons).

    Reasons format: ``["venue_A:NeurIPS"]`` or ``["kw+:llm", "kw+:asset pricing"]``.
    Empty list when not passed.
    """
    venues_lower = {v.lower(): v for v in tier_a_venues}
    if paper.venue_normalized and paper.venue_normalized.lower() in venues_lower:
        canonical = venues_lower[paper.venue_normalized.lower()]
        return True, [f"venue_A:{canonical}"]

    text = (paper.title + " " + (paper.abstract or "")).lower()
    hits: list[str] = []
    for kw in keywords.positive_flat():
        if kw.lower() in text:
            hits.append(kw.lower())
            if len(hits) >= 3:
                break
    if not hits:
        return False, []
    return True, [f"kw+:{kw}" for kw in hits]
