"""Schema bootstrap smoke tests."""

from __future__ import annotations

from paperpulse.db.duckdb_client import fetchall, get_connection


def test_schema_creates_papers_table() -> None:
    get_connection()
    rows = fetchall(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'main' ORDER BY table_name"
    )
    names = {r[0] for r in rows}
    assert "papers" in names
    assert "institutions" in names
    assert "authors" in names
    assert "paper_authors" in names
    assert "paper_institutions" in names
    assert "ingest_runs" in names
    assert "config_changes" in names


def test_papers_table_has_expected_columns() -> None:
    get_connection()
    rows = fetchall("PRAGMA table_info('papers')")
    cols = {r[1] for r in rows}
    for required in [
        "id",
        "source",
        "source_id",
        "doi",
        "arxiv_id",
        "title",
        "abstract",
        "authors",
        "published_at",
        "tier",
        "primary_topic",
        "user_status",
    ]:
        assert required in cols, f"missing column: {required}"


def test_inserting_a_minimal_paper_round_trips() -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO papers (id, source, source_id, title) VALUES (?, ?, ?, ?)",
        ["sha1_test", "arxiv", "2511.0001", "Smoke test paper"],
    )
    rows = fetchall("SELECT id, title FROM papers")
    assert rows == [("sha1_test", "Smoke test paper")]
