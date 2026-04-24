"""Integration: ingest → filter pipeline writes level{1,2,3} columns.

Phase 3 PR #3.1 coverage: L1 only. Later PRs extend this file as L2/L3
come online.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

from paperpulse.db.duckdb_client import fetchall
from paperpulse.filter.pipeline import filter_paper, filter_paper_l1, rescore_l1_all
from paperpulse.ingest.base import RawPaper
from paperpulse.ingest.dedup import upsert_raw


def _raw(**kw: object) -> RawPaper:
    defaults: dict[str, object] = dict(
        source="arxiv",
        source_id="x",
        doi=None,
        arxiv_id=None,
        title="",
        abstract="",
        authors_raw=[{"name": "Test Author"}],
        venue_raw=None,
        published_at=dt.datetime(2026, 4, 1),
        updated_at=dt.datetime(2026, 4, 1),
        pdf_url=None,
        html_url=None,
    )
    defaults.update(kw)
    return RawPaper(**defaults)  # type: ignore[arg-type]


def _seed_keywords(isolate_runtime: Path, cs: list[str]) -> None:
    cfg = isolate_runtime.parent / "config"
    (cfg / "keywords.yml").write_text(
        "positive:\n"
        f"  cs_core: {cs}\n"
        "  finance_core: []\n"
        "  crosscut: []\n"
        "strong_negative: []\n"
        "weak_negative: []\n"
        "immune: []\n",
        encoding="utf-8",
    )
    from paperpulse.config import get_store
    get_store().reload("keywords")


def test_l1_marks_keyword_match(isolate_runtime: Path) -> None:
    _seed_keywords(isolate_runtime, ["LLM", "asset pricing"])
    raw = _raw(
        source_id="9999.99999",
        arxiv_id="9999.99999",
        title="A Large Language Model for asset pricing",
        abstract="We fine-tune an LLM on returns data.",
    )
    pid, is_new = upsert_raw(raw)
    assert is_new is True
    filter_paper_l1(pid)

    row = fetchall(
        "SELECT level1_passed, level1_reasons FROM papers WHERE id = ?", [pid]
    )[0]
    assert row[0] is True
    reasons = json.loads(row[1])
    assert any("kw+:" in r for r in reasons)


def test_l1_rejects_off_topic(isolate_runtime: Path) -> None:
    _seed_keywords(isolate_runtime, ["LLM"])
    raw = _raw(
        source_id="9999.00001",
        arxiv_id="9999.00001",
        title="Protein folding with AlphaFold",
        abstract="Molecular dynamics simulation.",
    )
    pid, _ = upsert_raw(raw)
    filter_paper(pid)
    row = fetchall(
        "SELECT level1_passed, tier FROM papers WHERE id = ?", [pid]
    )[0]
    assert row[0] is False
    # Full pipeline stamps tier=C when L1 fails (feed-filter hides these)
    assert row[1] == "C"


def test_rescore_l1_all_flips_on_keyword_change(isolate_runtime: Path) -> None:
    # Initial keywords allow nothing to match this paper
    _seed_keywords(isolate_runtime, ["something_else"])
    raw = _raw(
        source_id="9999.00002",
        arxiv_id="9999.00002",
        title="Deep hedging with neural nets",
        abstract="we apply a policy network",
    )
    pid, _ = upsert_raw(raw)
    filter_paper_l1(pid)
    assert fetchall("SELECT level1_passed FROM papers WHERE id = ?", [pid])[0][0] is False

    # Edit keywords to include "deep hedging" → rescore → now passes
    _seed_keywords(isolate_runtime, ["deep hedging"])
    n = rescore_l1_all()
    assert n == 1
    assert fetchall("SELECT level1_passed FROM papers WHERE id = ?", [pid])[0][0] is True
