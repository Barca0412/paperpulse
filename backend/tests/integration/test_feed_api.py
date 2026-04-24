"""Feed + ingest API contract tests."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from paperpulse.db.duckdb_client import execute, get_connection


def _seed_paper(idx: int) -> None:
    get_connection()
    execute(
        "INSERT INTO papers (id, source, source_id, title, title_normalized, "
        "authors, published_at, user_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            f"sha1_p{idx}",
            "arxiv",
            f"2511.{idx:04d}",
            f"Paper {idx}: Multi-Agent Finance",
            f"paper {idx} multi-agent finance",
            json.dumps([{"name": f"Author {idx}"}]),
            datetime(2026, 4, 23 - (idx % 5)),
            "unread",
        ],
    )


def test_feed_returns_seeded_papers(client: TestClient) -> None:
    for i in range(3):
        _seed_paper(i)
    resp = client.get("/api/v1/feed?limit=10")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["papers"]) == 3
    p = body["papers"][0]
    assert "title" in p
    assert "user_status" in p


def test_feed_limit_caps_results(client: TestClient) -> None:
    for i in range(5):
        _seed_paper(i)
    resp = client.get("/api/v1/feed?limit=2")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 5
    assert len(body["papers"]) == 2


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
    # Other config files may be looked up — provide empty placeholders.
    for n in ["keywords", "seeds", "topics", "institutions",
              "authors", "tiers", "conferences", "app"]:
        (cfg / f"{n}.yml").write_text("{}\n", encoding="utf-8")
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(cfg))
    from paperpulse import config as cfg_mod

    cfg_mod.reset_store()

    resp = client.post("/api/v1/settings/ingest/run-now", json={"sources": ["arxiv"]})
    assert resp.status_code == 200
    body = resp.json()
    assert "arxiv" in body["queued"]
