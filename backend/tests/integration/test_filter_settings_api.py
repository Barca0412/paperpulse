"""Settings API: round-trip YAML via GET/POST /settings/keywords (+ seeds/topics/tiers).

Validates that writes land on disk, ConfigStore reflects the new values after
the reload hook, and subsequent GETs see the update.
"""
from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient


def test_get_keywords_returns_parsed_yaml(client: TestClient, isolate_runtime: Path) -> None:
    cfg = isolate_runtime.parent / "config"
    (cfg / "keywords.yml").write_text(
        "positive:\n"
        "  cs_core: [\"LLM\"]\n"
        "  finance_core: []\n"
        "  crosscut: []\n"
        "strong_negative: []\n"
        "weak_negative: []\n"
        "immune: []\n",
        encoding="utf-8",
    )
    # client fixture starts app → lifespan calls get_store().load_all() already
    # but the test just wrote a new file → trigger explicit reload via GET side-effect
    from paperpulse.config import get_store
    get_store().reload("keywords")

    r = client.get("/api/v1/settings/keywords")
    assert r.status_code == 200
    body = r.json()
    assert body["positive"]["cs_core"] == ["LLM"]
    assert body["immune"] == []


def test_post_keywords_persists_and_reloads(client: TestClient, isolate_runtime: Path) -> None:
    new = {
        "positive": {"cs_core": ["foo"], "finance_core": ["bar"], "crosscut": []},
        "strong_negative": [],
        "weak_negative": [],
        "immune": [],
    }
    r = client.post("/api/v1/settings/keywords", json=new)
    assert r.status_code == 200
    # Follow-up GET sees new state
    r2 = client.get("/api/v1/settings/keywords")
    assert r2.json()["positive"]["cs_core"] == ["foo"]
    # File on disk has the new content
    cfg = isolate_runtime.parent / "config"
    disk = (cfg / "keywords.yml").read_text()
    assert "foo" in disk and "bar" in disk


def test_post_keywords_triggers_l1_rescore(
    client: TestClient, isolate_runtime: Path
) -> None:
    """End-to-end: POSTing new keywords re-scores every paper in the DB."""
    import datetime as dt

    from paperpulse.db.duckdb_client import fetchall
    from paperpulse.filter.pipeline import filter_paper_l1
    from paperpulse.ingest.base import RawPaper
    from paperpulse.ingest.dedup import upsert_raw

    # Ingest a paper that won't match initial (empty) keywords
    raw = RawPaper(
        source="arxiv",
        source_id="api-rescore-test",
        arxiv_id="api-rescore-test",
        title="Deep hedging with RL",
        abstract="",
        authors_raw=[{"name": "Test"}],
        published_at=dt.datetime(2026, 4, 1),
        updated_at=dt.datetime(2026, 4, 1),
    )
    pid, _ = upsert_raw(raw)
    filter_paper_l1(pid)
    assert fetchall("SELECT level1_passed FROM papers WHERE id = ?", [pid])[0][0] is False

    # POST new keywords → subscriber should rescore
    r = client.post(
        "/api/v1/settings/keywords",
        json={
            "positive": {"cs_core": ["deep hedging"], "finance_core": [], "crosscut": []},
            "strong_negative": [],
            "weak_negative": [],
            "immune": [],
        },
    )
    assert r.status_code == 200
    assert fetchall("SELECT level1_passed FROM papers WHERE id = ?", [pid])[0][0] is True


def test_post_keywords_validates_positive_buckets(client: TestClient) -> None:
    # Missing "crosscut" bucket → 422
    r = client.post(
        "/api/v1/settings/keywords",
        json={
            "positive": {"cs_core": [], "finance_core": []},
            "strong_negative": [],
            "weak_negative": [],
            "immune": [],
        },
    )
    assert r.status_code == 422


def test_seeds_roundtrip(client: TestClient, monkeypatch) -> None:
    # Without stubbing embedding, an anchor-cache rebuild triggered by the
    # seeds reload would try to load bge-m3 → monkeypatch the backend.
    from paperpulse.filter import embedding as _emb
    from tests.fixtures.bge_m3_stub import StubEmbedder

    monkeypatch.setattr(_emb, "_backend", StubEmbedder())

    payload = {
        "seed_papers": [
            {
                "id": "s1",
                "title": "Deep hedging",
                "abstract": "policy network for hedging",
                "base_weight": 1.0,
            }
        ],
        "user_must_read_papers": [],
        "seed_meta": {"total_active": 1},
    }
    r = client.post("/api/v1/settings/seeds", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["seed_papers"][0]["title"] == "Deep hedging"


def test_topics_roundtrip(client: TestClient, monkeypatch) -> None:
    from paperpulse.filter import embedding as _emb
    from tests.fixtures.bge_m3_stub import StubEmbedder

    monkeypatch.setattr(_emb, "_backend", StubEmbedder())

    payload = {
        "topics": [
            {
                "name": "Foo",
                "slug": "foo",
                "side": "cs",
                "description_en": "A topic about foo",
                "description_zh": "foo 主题",
                "weight": 1.2,
            }
        ]
    }
    r = client.post("/api/v1/settings/topics", json=payload)
    assert r.status_code == 200
    assert r.json()["topics"][0]["slug"] == "foo"
