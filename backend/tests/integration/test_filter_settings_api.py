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
