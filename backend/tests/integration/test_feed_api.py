"""Feed + ingest API contract tests.

Covers:
- flat response with level1_passed filter
- group_by=topic / tier / source
- time_window, sort, tier / source / topic filters
- ingest /run-now endpoint (kept from Phase 1)
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from paperpulse.db.duckdb_client import execute, get_connection


def _seed_paper(
    idx: int,
    *,
    l1: bool = True,
    tier: str | None = "B",
    primary_topic: str | None = "multi-agent-finance",
    source: str = "arxiv",
    published: datetime | None = None,
    level2_score: float | None = 0.6,
) -> str:
    get_connection()
    pid = f"sha1_p{idx}"
    execute(
        "INSERT INTO papers (id, source, source_id, title, title_normalized, "
        "authors, published_at, user_status, level1_passed, tier, primary_topic, "
        "level2_score) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            pid,
            source,
            f"2511.{idx:04d}",
            f"Paper {idx}: Multi-Agent Finance",
            f"paper {idx} multi-agent finance",
            json.dumps([{"name": f"Author {idx}"}]),
            published or datetime(2026, 4, 23 - (idx % 5)),
            "unread",
            l1,
            tier,
            primary_topic,
            level2_score,
        ],
    )
    return pid


def test_feed_returns_seeded_papers(client: TestClient) -> None:
    for i in range(3):
        _seed_paper(i)
    resp = client.get("/api/v1/feed?limit=10")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert body["group_by"] == "flat"
    assert len(body["papers"]) == 3
    p = body["papers"][0]
    assert "title" in p
    assert "user_status" in p


def test_feed_excludes_l1_failed_by_default(client: TestClient) -> None:
    _seed_paper(0, l1=True)
    _seed_paper(1, l1=False)
    body = client.get("/api/v1/feed").json()
    assert body["total"] == 1


def test_feed_include_l1_failed_flag(client: TestClient) -> None:
    _seed_paper(0, l1=True)
    _seed_paper(1, l1=False)
    body = client.get("/api/v1/feed?include_l1_failed=true").json()
    assert body["total"] == 2


def test_feed_limit_caps_results(client: TestClient) -> None:
    for i in range(5):
        _seed_paper(i)
    resp = client.get("/api/v1/feed?limit=2")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 5  # total respects filter, not limit
    assert len(body["papers"]) == 2


def test_feed_group_by_tier(client: TestClient) -> None:
    _seed_paper(0, tier="A")
    _seed_paper(1, tier="B")
    _seed_paper(2, tier="B")
    _seed_paper(3, tier="C")
    body = client.get("/api/v1/feed?group_by=tier").json()
    assert body["group_by"] == "tier"
    groups = {g["label"]: g["count"] for g in body["groups"]}
    assert groups == {"A": 1, "B": 2, "C": 1}
    # Tier A appears first in ordering
    assert body["groups"][0]["label"] == "A"


def test_feed_group_by_topic(client: TestClient) -> None:
    _seed_paper(0, primary_topic="llm-agents")
    _seed_paper(1, primary_topic="llm-agents")
    _seed_paper(2, primary_topic="asset-pricing")
    _seed_paper(3, primary_topic=None)
    body = client.get("/api/v1/feed?group_by=topic").json()
    groups = {g["label"]: g["count"] for g in body["groups"]}
    assert groups == {"llm-agents": 2, "asset-pricing": 1, "unassigned": 1}


def test_feed_group_by_source(client: TestClient) -> None:
    _seed_paper(0, source="arxiv")
    _seed_paper(1, source="arxiv")
    _seed_paper(2, source="nber")
    body = client.get("/api/v1/feed?group_by=source").json()
    groups = {g["label"]: g["count"] for g in body["groups"]}
    assert groups == {"arxiv": 2, "nber": 1}


def test_feed_time_window_today(client: TestClient) -> None:
    _seed_paper(0, published=datetime.now())
    _seed_paper(1, published=datetime.now() - timedelta(days=45))
    body = client.get("/api/v1/feed?time_window=today").json()
    assert body["total"] == 1


def test_feed_tier_filter(client: TestClient) -> None:
    _seed_paper(0, tier="A")
    _seed_paper(1, tier="B")
    _seed_paper(2, tier="C")
    body = client.get("/api/v1/feed?tier=A,B").json()
    assert body["total"] == 2


def test_feed_sort_relevance_uses_l3_score(client: TestClient) -> None:
    p1 = _seed_paper(0, tier="B")
    p2 = _seed_paper(1, tier="B")
    execute("UPDATE papers SET level3_tier_b_score = ? WHERE id = ?", [0.9, p1])
    execute("UPDATE papers SET level3_tier_b_score = ? WHERE id = ?", [0.3, p2])
    body = client.get("/api/v1/feed?sort=relevance").json()
    assert body["papers"][0]["id"] == p1


def test_feed_invalid_group_by_422(client: TestClient) -> None:
    r = client.get("/api/v1/feed?group_by=nonsense")
    assert r.status_code == 422


def test_ingest_run_now_queues_named_source(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cfg = tmp_path / "config2"
    cfg.mkdir(exist_ok=True)
    (cfg / "sources.yml").write_text(
        "sources:\n"
        "  arxiv: {enabled: true, categories: [cs.LG], max_results_per_run: 5}\n"
        "  nber: {enabled: true}\n",
        encoding="utf-8",
    )
    for n in [
        "keywords", "seeds", "topics", "institutions",
        "authors", "tiers", "conferences", "app",
    ]:
        (cfg / f"{n}.yml").write_text("{}\n", encoding="utf-8")
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(cfg))
    from paperpulse import config as cfg_mod

    cfg_mod.reset_store()

    resp = client.post("/api/v1/settings/ingest/run-now", json={"sources": ["arxiv"]})
    assert resp.status_code == 200
    body = resp.json()
    assert "arxiv" in body["queued"]
