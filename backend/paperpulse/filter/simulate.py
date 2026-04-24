"""Count how many papers fall into A/B/C under a proposed tier ruleset,
without persisting. Used by the Tier Rules tab's Simulate button.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from paperpulse.db.duckdb_client import fetchall
from paperpulse.filter.tiers import (
    PaperForScoring,
    Signals,
    TierRules,
    level3_tier,
)


@dataclass
class SimulateResult:
    total: int
    tier_a: int
    tier_b: int
    tier_c: int


def simulate_tiers(rules: TierRules, limit: int | None = None) -> SimulateResult:
    base = (
        "SELECT p.id, p.venue_normalized, p.level2_score, p.level1_reasons "
        "FROM papers p WHERE p.level1_passed = TRUE"
    )
    if limit:
        base += f" LIMIT {int(limit)}"
    paper_rows = fetchall(base)

    counts: Counter[str] = Counter()
    for pid, venue, l2, _l1_reasons in paper_rows:
        inst_rows = fetchall(
            "SELECT i.in_whitelist, i.whitelist_priority "
            "FROM paper_institutions pi "
            "JOIN institutions i ON pi.institution_id = i.id "
            "WHERE pi.paper_id = ?",
            [pid],
        )
        institutions: list[dict[str, object]] = [
            {"in_whitelist": bool(r[0]), "whitelist_priority": r[1]}
            for r in inst_rows
        ]
        tracked = bool(
            fetchall(
                "SELECT 1 FROM paper_authors pa "
                "JOIN authors a ON pa.author_id = a.id "
                "WHERE pa.paper_id = ? AND a.is_tracked = TRUE LIMIT 1",
                [pid],
            )
        )
        p = PaperForScoring(
            venue_normalized=venue,
            level2_score=l2 or 0.0,
            institutions=institutions,
            authors_is_tracked=tracked,
        )
        tier, _ = level3_tier(p, rules, Signals())
        counts[tier] += 1
    total = sum(counts.values())
    return SimulateResult(
        total=total,
        tier_a=counts["A"],
        tier_b=counts["B"],
        tier_c=counts["C"],
    )
