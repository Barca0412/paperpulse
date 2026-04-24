"""Simulate counts tiers under proposed rules without persisting."""
from __future__ import annotations

import datetime as dt
from pathlib import Path

from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.filter.simulate import simulate_tiers
from paperpulse.filter.tiers import BScore, TierRules
from paperpulse.ingest.base import RawPaper
from paperpulse.ingest.dedup import upsert_raw


def _ingest(title: str, venue: str | None, l2: float | None) -> str:
    raw = RawPaper(
        source="arxiv",
        source_id=title,
        arxiv_id=title,
        title=title,
        abstract="",
        authors_raw=[{"name": "T"}],
        published_at=dt.datetime(2026, 4, 1),
        updated_at=dt.datetime(2026, 4, 1),
    )
    pid, _ = upsert_raw(raw)
    execute(
        "UPDATE papers SET level1_passed = TRUE, venue_normalized = ?, "
        "level2_score = ? WHERE id = ?",
        [venue, l2, pid],
    )
    return pid


def test_simulate_assigns_tiers_without_persisting(isolate_runtime: Path) -> None:
    p_a = _ingest("paper A venue", "NeurIPS", 0.0)
    p_b = _ingest("paper B l2", None, 0.8)
    p_c = _ingest("paper C low", None, 0.1)

    rules = TierRules(
        A_venues={"NeurIPS"},
        B=BScore(weights={"level2_similarity": 1.0}, threshold=0.5),
    )
    r = simulate_tiers(rules)
    assert r.total == 3
    assert r.tier_a == 1
    assert r.tier_b == 1
    assert r.tier_c == 1

    # Simulating must NOT persist — tier column remains NULL for all three
    for pid in (p_a, p_b, p_c):
        row = fetchall("SELECT tier FROM papers WHERE id = ?", [pid])[0]
        assert row[0] is None


def test_simulate_ignores_l1_failed_papers(isolate_runtime: Path) -> None:
    pid = _ingest("failed paper", "NeurIPS", 0.9)
    execute("UPDATE papers SET level1_passed = FALSE WHERE id = ?", [pid])

    rules = TierRules(
        A_venues={"NeurIPS"},
        B=BScore(weights={"level2_similarity": 1.0}, threshold=0.5),
    )
    r = simulate_tiers(rules)
    assert r.total == 0


def test_simulate_respects_limit(isolate_runtime: Path) -> None:
    for i in range(5):
        _ingest(f"p{i}", None, 0.6)

    rules = TierRules(
        A_venues=set(),
        B=BScore(weights={"level2_similarity": 1.0}, threshold=0.5),
    )
    r = simulate_tiers(rules, limit=3)
    assert r.total == 3
