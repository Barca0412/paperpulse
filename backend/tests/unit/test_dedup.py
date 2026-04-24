"""Dedup logic from spec §8.3."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from paperpulse.db.duckdb_client import execute, fetchall, get_connection
from paperpulse.ingest.base import RawPaper
from paperpulse.ingest.dedup import generate_id, normalize_title, upsert_raw


def _raw(**kw: Any) -> RawPaper:
    base: dict[str, Any] = dict(
        source="arxiv",
        source_id="2511.0001",
        title="A Multi-Agent Framework for Portfolio Optimisation",
        abstract="…",
        authors_raw=[{"name": "Alice"}],
        published_at=datetime(2026, 4, 23),
        arxiv_id="2511.0001v1",
        doi=None,
    )
    base.update(kw)
    return RawPaper(**base)


def test_generate_id_is_stable() -> None:
    p = _raw()
    assert generate_id(p) == generate_id(p)


def test_generate_id_strips_arxiv_version_for_stability() -> None:
    p1 = _raw(arxiv_id="2511.0001v1")
    p2 = _raw(arxiv_id="2511.0001v2")
    assert generate_id(p1) == generate_id(p2)


def test_normalize_title_lowercases_and_strips_punctuation() -> None:
    assert normalize_title("Hello, World!") == "hello world"


def test_upsert_inserts_new_paper() -> None:
    get_connection()
    p = _raw()
    pid, is_new = upsert_raw(p)
    assert is_new is True
    rows = fetchall("SELECT id, title FROM papers WHERE id = ?", [pid])
    assert rows and rows[0][1].startswith("A Multi-Agent")


def test_upsert_dedups_by_arxiv_id_across_versions() -> None:
    get_connection()
    p1 = _raw(arxiv_id="2511.0001v1")
    p2 = _raw(arxiv_id="2511.0001v2", title="Updated title v2")
    pid1, new1 = upsert_raw(p1)
    pid2, new2 = upsert_raw(p2)
    assert new1 is True
    assert new2 is False
    assert pid1 == pid2
    rows = fetchall("SELECT title FROM papers WHERE id = ?", [pid1])
    assert rows[0][0] == "Updated title v2"


def test_upsert_dedups_by_doi_across_sources() -> None:
    get_connection()
    a = _raw(source="arxiv", arxiv_id="2511.0002", doi="10.1000/xyz")
    b = _raw(
        source="crossref",
        source_id="10.1000/xyz",
        arxiv_id=None,
        doi="10.1000/xyz",
    )
    pid_a, _ = upsert_raw(a)
    pid_b, new_b = upsert_raw(b)
    assert pid_a == pid_b
    assert new_b is False


def test_upsert_dedups_by_fuzzy_title_first_author_year() -> None:
    get_connection()
    a = _raw(arxiv_id=None, doi=None, title="Deep Learning for Asset Pricing")
    b = _raw(
        source="nber",
        source_id="w99999",
        arxiv_id=None,
        doi=None,
        title="Deep Learning for Asset Pricing.",  # punctuation difference
        authors_raw=[{"name": "Alice"}],
    )
    pid_a, _ = upsert_raw(a)
    pid_b, new_b = upsert_raw(b)
    assert pid_a == pid_b
    assert new_b is False


def test_ingest_runs_table_accepts_inserts() -> None:
    get_connection()
    execute(
        "INSERT INTO ingest_runs (source, started_at, finished_at, status, "
        "papers_fetched, papers_new) VALUES (?, ?, ?, ?, ?, ?)",
        ["arxiv", datetime.now(), datetime.now(), "success", 10, 7],
    )
    rows = fetchall("SELECT source, papers_new FROM ingest_runs")
    assert rows == [("arxiv", 7)]
