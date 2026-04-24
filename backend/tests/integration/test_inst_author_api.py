"""Institutions + Authors list API."""

from __future__ import annotations

import json
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from paperpulse.db.duckdb_client import execute, get_connection


def _seed(paper_idx: int, *, days_ago: int = 0, inst_id: str = "https://ror.org/00f54p054",
          inst_name: str = "Stanford University") -> None:
    get_connection()
    pid = f"sha1_p{paper_idx}"
    date = datetime.now() - timedelta(days=days_ago)
    execute(
        "INSERT INTO papers (id, source, source_id, title, published_at, authors) "
        "VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING",
        [pid, "arxiv", f"2511.{paper_idx:04d}", f"Paper {paper_idx}",
         date, json.dumps([{"name": f"Author {paper_idx}"}])],
    )
    execute(
        "INSERT INTO institutions (id, ror_id, name) VALUES (?, ?, ?) "
        "ON CONFLICT (id) DO NOTHING",
        [inst_id, inst_id, inst_name],
    )
    execute(
        "INSERT INTO paper_institutions (paper_id, institution_id, author_count, "
        "has_first_author, has_last_author) VALUES (?, ?, 1, true, true) "
        "ON CONFLICT DO NOTHING",
        [pid, inst_id],
    )
    execute(
        "INSERT INTO authors (id, name) VALUES (?, ?) ON CONFLICT (id) DO NOTHING",
        [f"author_{paper_idx}", f"Author {paper_idx}"],
    )
    execute(
        "INSERT INTO paper_authors (paper_id, author_id, author_order, is_first, "
        "is_last, is_corresponding, affiliation_ids) VALUES (?, ?, 0, true, true, false, ?) "
        "ON CONFLICT (paper_id, author_id) DO NOTHING",
        [pid, f"author_{paper_idx}", json.dumps([inst_id])],
    )


def test_institutions_list_returns_papers_in_window(client: TestClient) -> None:
    _seed(1, days_ago=5)
    _seed(2, days_ago=15)
    _seed(3, days_ago=60)  # outside 30d window
    resp = client.get("/api/v1/institutions?window_days=30")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) >= 1
    stanford = next(i for i in body if i["id"] == "https://ror.org/00f54p054")
    assert stanford["paper_count_30d"] == 2
    assert stanford["paper_count_total"] == 3
    assert stanford["name"] == "Stanford University"


def test_institutions_list_excludes_zero_paper_institutions(client: TestClient) -> None:
    _seed(1, days_ago=5)
    # Seed an institution with no papers
    execute(
        "INSERT INTO institutions (id, ror_id, name) VALUES (?, ?, ?)",
        ["https://ror.org/empty", "https://ror.org/empty", "Empty Inst"],
    )
    resp = client.get("/api/v1/institutions?window_days=30")
    ids = {i["id"] for i in resp.json()}
    assert "https://ror.org/empty" not in ids


def test_institutions_list_limit_caps(client: TestClient) -> None:
    # Two institutions each with papers
    _seed(1, inst_id="https://ror.org/00f54p054", inst_name="Stanford University")
    _seed(2, inst_id="https://ror.org/042nb2s44", inst_name="MIT")
    resp = client.get("/api/v1/institutions?limit=1")
    assert len(resp.json()) == 1


def test_authors_list_returns_rows(client: TestClient) -> None:
    _seed(1, days_ago=2)
    _seed(2, days_ago=10)
    resp = client.get("/api/v1/authors?window_days=30")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) >= 2
    assert all("paper_count_30d" in a for a in body)


def test_authors_list_excludes_zero_paper_authors(client: TestClient) -> None:
    _seed(1, days_ago=2)
    execute(
        "INSERT INTO authors (id, name) VALUES (?, ?)",
        ["orphan_author", "Orphan Author"],
    )
    resp = client.get("/api/v1/authors")
    ids = {a["id"] for a in resp.json()}
    assert "orphan_author" not in ids
