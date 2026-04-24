"""Filter pipeline orchestrator. Per spec §10.4.

Currently hosts L1 only; L2/L3 land in later Phase 3 PRs. Each `filter_paper_*`
function is idempotent — safe to re-run against the same paper_id (writes
overwrite the previous level{1,2,3} columns).
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from paperpulse.config import get_store
from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.filter.anchors import load_keywords, load_tier_a_venues
from paperpulse.filter.keywords import level1_filter

_log = logging.getLogger(__name__)


@dataclass
class _P:
    title: str
    abstract: str | None
    venue_normalized: str | None


def _load_paper(pid: str) -> _P | None:
    rows = fetchall(
        "SELECT title, abstract, venue_normalized FROM papers WHERE id = ?", [pid]
    )
    if not rows:
        return None
    r = rows[0]
    return _P(title=str(r[0]), abstract=r[1], venue_normalized=r[2])


def filter_paper_l1(paper_id: str) -> tuple[bool, list[str]]:
    paper = _load_paper(paper_id)
    if paper is None:
        return False, []
    store = get_store()
    kws = load_keywords(store)
    venues = load_tier_a_venues(store)
    ok, reasons = level1_filter(paper, kws, venues)
    execute(
        "UPDATE papers SET level1_passed = ?, level1_reasons = ? WHERE id = ?",
        [ok, json.dumps(reasons), paper_id],
    )
    return ok, reasons


def filter_paper(paper_id: str) -> None:
    """Full pipeline for one paper. Spec §10.4.

    L2/L3 are added in PR #3.3 and PR #3.5; this MVP variant runs L1 only
    and sets tier='C' when L1 fails (so the Feed default filter can hide it).
    """
    l1_ok, _ = filter_paper_l1(paper_id)
    if not l1_ok:
        execute("UPDATE papers SET tier = ? WHERE id = ?", ["C", paper_id])


def rescore_l1_all() -> int:
    """Re-run L1 across every paper in the DB. Returns count processed.

    Called on keywords.yml change. Text match is cheap — even at 10k papers
    this is seconds. Does not touch L2/L3 columns.
    """
    rows = fetchall("SELECT id FROM papers")
    n = 0
    for (pid,) in rows:
        try:
            filter_paper_l1(str(pid))
            n += 1
        except Exception:
            _log.exception("L1 rescore failed for %s", pid)
    return n
