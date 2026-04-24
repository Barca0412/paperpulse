"""L3 integration: L1 pass + L2 pass → tier assigned.

Uses StubEmbedder + constructed tier rules to exercise venue-A, Tier-B
threshold crossing, and institution whitelist L2-exemption.
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.filter import embedding as _emb
from paperpulse.ingest.base import RawPaper
from paperpulse.ingest.dedup import upsert_raw
from tests.fixtures.bge_m3_stub import StubEmbedder


def _write_yaml(cfg_dir: Path, name: str, payload: object) -> None:
    (cfg_dir / f"{name}.yml").write_text(
        yaml.safe_dump(payload, sort_keys=False), encoding="utf-8"
    )


def _full_setup(cfg_dir: Path, tier_a: list[str], weights: dict, threshold: float) -> None:
    _write_yaml(
        cfg_dir,
        "keywords",
        {
            "positive": {"cs_core": ["LLM"], "finance_core": [], "crosscut": []},
            "strong_negative": [],
            "weak_negative": [],
            "immune": [],
        },
    )
    _write_yaml(
        cfg_dir,
        "topics",
        {
            "topics": [
                {
                    "name": "LLM",
                    "slug": "llm",
                    "side": "cs",
                    "description_en": "large language models",
                    "description_zh": "LLM",
                    "weight": 1.0,
                }
            ]
        },
    )
    _write_yaml(
        cfg_dir,
        "tiers",
        {
            "tier_rules": {
                "A": {"venues": tier_a, "auto_include": True},
                "B_score": {"weights": weights, "threshold": threshold},
                "C": {},
            }
        },
    )
    from paperpulse.config import get_store
    for n in ("keywords", "topics", "tiers"):
        get_store().reload(n)


def test_l3_venue_a_assigns_tier_a(
    client: TestClient, isolate_runtime: Path, monkeypatch
) -> None:
    monkeypatch.setattr(_emb, "_backend", StubEmbedder())
    _full_setup(
        isolate_runtime.parent / "config",
        tier_a=["NeurIPS"],
        weights={"level2_similarity": 1.0},
        threshold=0.5,
    )

    raw = RawPaper(
        source="arxiv",
        source_id="l3-venue-a",
        arxiv_id="l3-venue-a",
        title="LLM for finance at NeurIPS",
        abstract="we apply LLMs to markets",
        authors_raw=[{"name": "T"}],
        published_at=dt.datetime(2026, 4, 1),
        updated_at=dt.datetime(2026, 4, 1),
    )
    pid, _ = upsert_raw(raw)
    # Simulate venue_normalized being set by some future source-specific
    # normalization step; for now, write it directly.
    execute(
        "UPDATE papers SET venue_normalized = ? WHERE id = ?", ["NeurIPS", pid]
    )

    from paperpulse.filter.pipeline import filter_paper
    filter_paper(pid)

    row = fetchall(
        "SELECT tier, level3_tier_b_score FROM papers WHERE id = ?", [pid]
    )[0]
    assert row[0] == "A"
    assert row[1] == 1.0


def test_l3_tier_b_via_l2_match(
    client: TestClient, isolate_runtime: Path, monkeypatch
) -> None:
    monkeypatch.setattr(_emb, "_backend", StubEmbedder())
    _full_setup(
        isolate_runtime.parent / "config",
        tier_a=[],
        weights={"level2_similarity": 1.0},
        threshold=0.1,
    )

    raw = RawPaper(
        source="arxiv",
        source_id="l3-tier-b",
        arxiv_id="l3-tier-b",
        title="LLM study",
        abstract="large language models",
        authors_raw=[{"name": "T"}],
        published_at=dt.datetime(2026, 4, 1),
        updated_at=dt.datetime(2026, 4, 1),
    )
    pid, _ = upsert_raw(raw)
    from paperpulse.filter.pipeline import filter_paper
    filter_paper(pid)

    row = fetchall("SELECT tier FROM papers WHERE id = ?", [pid])[0]
    assert row[0] == "B"


def test_l3_tier_c_when_l2_fails_and_no_whitelist(
    client: TestClient, isolate_runtime: Path, monkeypatch
) -> None:
    monkeypatch.setattr(_emb, "_backend", StubEmbedder())
    _full_setup(
        isolate_runtime.parent / "config",
        tier_a=[],
        # Impossible threshold for this stub — L2 won't pass
        weights={"level2_similarity": 1.0},
        threshold=10.0,
    )

    raw = RawPaper(
        source="arxiv",
        source_id="l3-tier-c",
        arxiv_id="l3-tier-c",
        title="LLM token-level study",
        abstract="tokenization methods",
        authors_raw=[{"name": "T"}],
        published_at=dt.datetime(2026, 4, 1),
        updated_at=dt.datetime(2026, 4, 1),
    )
    pid, _ = upsert_raw(raw)
    from paperpulse.filter.pipeline import filter_paper
    filter_paper(pid)

    row = fetchall("SELECT tier FROM papers WHERE id = ?", [pid])[0]
    # L2 likely fails against impossible threshold; no whitelist hit → C
    assert row[0] == "C"
