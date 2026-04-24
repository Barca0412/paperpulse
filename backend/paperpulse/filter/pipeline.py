"""Filter pipeline orchestrator. Per spec §10.4.

Each ``filter_paper_*`` function is idempotent — safe to re-run against the
same paper_id (writes overwrite the previous level{1,2,3} columns).
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from paperpulse.config import get_store
from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.filter import embedding as _emb
from paperpulse.filter.anchors import (
    load_keywords,
    load_tier_a_venues,
    load_tier_rules,
)
from paperpulse.filter.keywords import level1_filter
from paperpulse.filter.semantic import L2Config, level2_filter
from paperpulse.filter.tiers import PaperForScoring, Signals, level3_tier
from paperpulse.filter.vectors_store import PaperVectorStore

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


def _get_anchor_cache() -> object | None:
    """Late-bound lookup so pipeline avoids a circular import on main."""
    from paperpulse import main as _main

    return _main.anchor_cache


def filter_paper_l2(paper_id: str) -> tuple[bool, float, str | None]:
    """L2 semantic filter. Writes level2_score, level2_matched_seed,
    primary_topic (when best match is a topic anchor).
    """
    rows = fetchall("SELECT title, abstract FROM papers WHERE id = ?", [paper_id])
    if not rows:
        return False, 0.0, None
    title = str(rows[0][0])
    abstract = rows[0][1]
    text = _emb.paper_input_text(title, abstract)
    th = _emb.text_hash(text)

    store = PaperVectorStore()
    cached = store.get(paper_id)
    if cached is not None and cached.text_hash == th:
        vec = cached.vector
    else:
        vec = _emb.embed([text])[0]
        store.put(paper_id, th, vec)

    cache = _get_anchor_cache()
    if cache is None:
        _log.warning("anchor cache not initialised; skipping L2 for %s", paper_id)
        return False, 0.0, None

    kws = load_keywords(get_store())
    ok, score, label = level2_filter(
        vec,
        cache.vectors_for_scoring(),  # type: ignore[attr-defined]
        cache.weights_for_scoring(),  # type: ignore[attr-defined]
        cache.labels(),  # type: ignore[attr-defined]
        text=text,
        keywords_strong_negative=kws.strong_negative,
        keywords_weak_negative=kws.weak_negative,
        keywords_immune=kws.immune,
        config=L2Config(similarity_threshold=0.45),
    )

    topic_labels = set(cache.topic_labels())  # type: ignore[attr-defined]
    primary_topic = label if (label in topic_labels) else None

    execute(
        "UPDATE papers SET level2_score = ?, level2_matched_seed = ?, "
        "primary_topic = ? WHERE id = ?",
        [score, label, primary_topic, paper_id],
    )
    return ok, score, label


def filter_paper_l3(paper_id: str) -> tuple[str, float]:
    """L3 tier scoring. Writes tier + level3_tier_b_score.

    Caller is responsible for ensuring the paper reaches L3 (L1 pass and
    either L2 pass or institution whitelist hit — see ``filter_paper``).
    """
    rows = fetchall(
        "SELECT venue_normalized, level2_score FROM papers WHERE id = ?", [paper_id]
    )
    if not rows:
        return "C", 0.0
    venue, l2 = rows[0]

    inst_rows = fetchall(
        "SELECT i.in_whitelist, i.whitelist_priority "
        "FROM paper_institutions pi "
        "JOIN institutions i ON pi.institution_id = i.id "
        "WHERE pi.paper_id = ?",
        [paper_id],
    )
    institutions: list[dict[str, object]] = [
        {"in_whitelist": bool(r[0]), "whitelist_priority": r[1]} for r in inst_rows
    ]
    tracked_rows = fetchall(
        "SELECT 1 FROM paper_authors pa JOIN authors a ON pa.author_id = a.id "
        "WHERE pa.paper_id = ? AND a.is_tracked = TRUE LIMIT 1",
        [paper_id],
    )

    paper = PaperForScoring(
        venue_normalized=venue,
        level2_score=l2 or 0.0,
        institutions=institutions,
        authors_is_tracked=bool(tracked_rows),
    )
    rules = load_tier_rules(get_store())
    tier, score = level3_tier(paper, rules, Signals())
    execute(
        "UPDATE papers SET tier = ?, level3_tier_b_score = ? WHERE id = ?",
        [tier, score, paper_id],
    )
    return tier, score


def _has_whitelist_hit(paper_id: str) -> bool:
    rows = fetchall(
        "SELECT 1 FROM paper_institutions pi "
        "JOIN institutions i ON pi.institution_id = i.id "
        "WHERE pi.paper_id = ? AND i.in_whitelist = TRUE LIMIT 1",
        [paper_id],
    )
    return bool(rows)


def filter_paper(paper_id: str) -> None:
    """Full pipeline for one paper. Spec §10.4.

    L1 fail → tier=C, return.
    L1 passed via Tier-A venue → skip L2 (don't let a semantic miss drop
    a NeurIPS/JF paper), go straight to L3 which returns A.
    L1 pass via keyword → L2 scores.
      L2 fail + no institution whitelist hit → tier=C, return.
      otherwise → L3 assigns A/B/C.
    """
    l1_ok, l1_reasons = filter_paper_l1(paper_id)
    if not l1_ok:
        execute("UPDATE papers SET tier = ? WHERE id = ?", ["C", paper_id])
        return

    via_venue_a = any(r.startswith("venue_A:") for r in l1_reasons)
    if not via_venue_a:
        l2_ok, _, _ = filter_paper_l2(paper_id)
        if not l2_ok and not _has_whitelist_hit(paper_id):
            execute(
                "UPDATE papers SET tier = ?, level3_tier_b_score = ? WHERE id = ?",
                ["C", 0.0, paper_id],
            )
            return
    filter_paper_l3(paper_id)


def rescore_l3_all() -> int:
    """Re-run L3 for every L1-passed paper. Called on tiers.yml change."""
    rows = fetchall("SELECT id FROM papers WHERE level1_passed = TRUE")
    n = 0
    for (pid,) in rows:
        try:
            filter_paper_l3(str(pid))
            n += 1
        except Exception:
            _log.exception("L3 rescore failed for %s", pid)
    return n


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
