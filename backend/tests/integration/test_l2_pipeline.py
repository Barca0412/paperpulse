"""L2 integration: ingest → L1 pass → L2 scores → primary_topic set.

Uses StubEmbedder so test runtime stays fast. Verifies the full wiring:
- AnchorCache initialized on app startup
- Topics.yml edit rebuilds the cache (via _on_config_change)
- filter_paper() writes level2_score + primary_topic for L1-passed papers
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

from fastapi.testclient import TestClient

from paperpulse.db.duckdb_client import fetchall
from paperpulse.filter import embedding as _emb
from paperpulse.ingest.base import RawPaper
from paperpulse.ingest.dedup import upsert_raw
from tests.fixtures.bge_m3_stub import StubEmbedder


def _seed(cfg_dir: Path, name: str, contents: str) -> None:
    (cfg_dir / f"{name}.yml").write_text(contents, encoding="utf-8")


def test_l2_assigns_primary_topic(
    client: TestClient, isolate_runtime: Path, monkeypatch
) -> None:
    monkeypatch.setattr(_emb, "_backend", StubEmbedder())

    cfg = isolate_runtime.parent / "config"
    _seed(
        cfg,
        "keywords",
        "positive:\n"
        "  cs_core: [\"LLM\"]\n"
        "  finance_core: []\n"
        "  crosscut: []\n"
        "strong_negative: []\n"
        "weak_negative: []\n"
        "immune: []\n",
    )
    _seed(
        cfg,
        "topics",
        "topics:\n"
        "  - name: \"LLM Agents for Finance\"\n"
        "    slug: \"llm-agents-finance\"\n"
        "    side: \"crosscut\"\n"
        "    description_en: \"LLM agents trading finance\"\n"
        "    description_zh: \"LLM 金融 agent\"\n"
        "    weight: 1.0\n",
    )
    from paperpulse.config import get_store
    get_store().reload("keywords")
    get_store().reload("topics")

    # Simulate ingesting a relevant paper
    raw = RawPaper(
        source="arxiv",
        source_id="l2-test-1",
        arxiv_id="l2-test-1",
        title="LLM agents for portfolio management",
        abstract="We apply large language models to trading.",
        authors_raw=[{"name": "Test"}],
        published_at=dt.datetime(2026, 4, 1),
        updated_at=dt.datetime(2026, 4, 1),
    )
    pid, _ = upsert_raw(raw)

    from paperpulse.filter.pipeline import filter_paper
    filter_paper(pid)

    row = fetchall(
        "SELECT level1_passed, level2_score, primary_topic FROM papers WHERE id = ?",
        [pid],
    )[0]
    assert row[0] is True
    assert row[1] is not None and row[1] > 0
    assert row[2] == "llm-agents-finance"


def test_l2_skipped_for_l1_fail(
    client: TestClient, isolate_runtime: Path, monkeypatch
) -> None:
    monkeypatch.setattr(_emb, "_backend", StubEmbedder())
    cfg = isolate_runtime.parent / "config"
    _seed(
        cfg,
        "keywords",
        "positive:\n"
        "  cs_core: [\"LLM\"]\n"
        "  finance_core: []\n"
        "  crosscut: []\n"
        "strong_negative: []\n"
        "weak_negative: []\n"
        "immune: []\n",
    )
    from paperpulse.config import get_store
    get_store().reload("keywords")

    raw = RawPaper(
        source="arxiv",
        source_id="l2-test-2",
        arxiv_id="l2-test-2",
        title="Protein folding benchmarks",
        abstract="molecular dynamics",
        authors_raw=[{"name": "Test"}],
        published_at=dt.datetime(2026, 4, 1),
        updated_at=dt.datetime(2026, 4, 1),
    )
    pid, _ = upsert_raw(raw)

    from paperpulse.filter.pipeline import filter_paper
    filter_paper(pid)

    row = fetchall(
        "SELECT level1_passed, level2_score, tier FROM papers WHERE id = ?",
        [pid],
    )[0]
    assert row[0] is False
    assert row[1] is None  # L2 was skipped
    assert row[2] == "C"
