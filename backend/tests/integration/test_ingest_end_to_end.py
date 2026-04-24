"""End-to-end ingest using the saved arXiv fixture (no network)."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime
from pathlib import Path

from paperpulse.db.duckdb_client import fetchall
from paperpulse.ingest.arxiv import parse_atom_feed
from paperpulse.ingest.base import RawPaper, Source
from paperpulse.ingest.runner import run_source

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "arxiv" / "sample_response.xml"


class _FixtureSource(Source):
    name = "arxiv"

    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]:  # noqa: ARG002
        yield from parse_atom_feed(FIXTURE.read_bytes())

    def health_check(self) -> bool:
        return True


def test_run_source_inserts_papers_and_records_run() -> None:
    fetched, new = run_source(_FixtureSource())
    assert fetched >= 1
    assert new == fetched
    rows = fetchall("SELECT COUNT(*) FROM papers WHERE source = 'arxiv'")
    assert rows[0][0] == fetched
    runs = fetchall(
        "SELECT source, status, papers_fetched, papers_new FROM ingest_runs"
    )
    assert runs == [("arxiv", "success", fetched, new)]


def test_running_twice_does_not_create_duplicates() -> None:
    run_source(_FixtureSource())
    run_source(_FixtureSource())
    count = fetchall("SELECT COUNT(*) FROM papers WHERE source = 'arxiv'")[0][0]
    fixture_count = sum(1 for _ in parse_atom_feed(FIXTURE.read_bytes()))
    assert count == fixture_count
