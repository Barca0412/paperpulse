"""Institution resolve() + link_paper_institution."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from paperpulse.db.duckdb_client import execute, fetchall, get_connection
from paperpulse.entity import ror
from paperpulse.entity.institution import link_paper_institution, resolve
from paperpulse.entity.ror import RorIndex, _record_from_raw

FIXTURE = (
    Path(__file__).resolve().parents[1] / "fixtures" / "ror" / "ror_subset.json"
)


@pytest.fixture(autouse=True)
def _seed_ror_index() -> None:
    """Seed the ROR singleton with the test fixture for each test."""
    ror.reset_index()
    idx = RorIndex()
    raw = json.loads(FIXTURE.read_text())
    idx.load_records([_record_from_raw(r) for r in raw])
    # Inject into module-level singleton.
    ror._index = idx


def test_resolve_by_ror_id_writes_row() -> None:
    get_connection()
    iid = resolve(ror_id="https://ror.org/00f54p054")  # Stanford
    assert iid == "https://ror.org/00f54p054"
    rows = fetchall("SELECT name FROM institutions WHERE id = ?", [iid])
    assert rows[0][0] == "Stanford University"


def test_resolve_by_exact_name() -> None:
    get_connection()
    iid = resolve(name="Bloomberg L.P.")
    assert iid == "https://ror.org/01f5ytq51"


def test_resolve_by_alias() -> None:
    get_connection()
    iid = resolve(name="MIT")
    assert iid == "https://ror.org/042nb2s44"


def test_resolve_by_fuzzy_name() -> None:
    get_connection()
    # One missing letter typo (Stanford misspelled). The 92 cutoff is tight;
    # "Stanford U" → "Stanford University" scores ~69 (too short), but a
    # close spelling variant like this scores ~97.
    iid = resolve(name="Standford University")
    assert iid == "https://ror.org/00f54p054"


def test_unknown_name_gets_manual_id() -> None:
    get_connection()
    iid = resolve(name="Hogwarts School of Witchcraft")
    assert iid is not None
    assert iid.startswith("manual:inst:")
    rows = fetchall("SELECT name FROM institutions WHERE id = ?", [iid])
    assert rows[0][0] == "Hogwarts School of Witchcraft"


def test_unknown_ror_id_still_creates_row() -> None:
    get_connection()
    iid = resolve(ror_id="https://ror.org/unknown999")
    assert iid == "https://ror.org/unknown999"
    rows = fetchall("SELECT id FROM institutions WHERE id = ?", [iid])
    assert len(rows) == 1


def test_resolve_with_no_args_returns_none() -> None:
    get_connection()
    assert resolve() is None


def test_link_paper_institution_increments_on_repeat() -> None:
    get_connection()
    execute(
        "INSERT INTO papers (id, source, source_id, title) VALUES (?, ?, ?, ?)",
        ["sha1_p1", "arxiv", "x", "t"],
    )
    link_paper_institution(
        "sha1_p1", "https://ror.org/00f54p054",
        has_first_author=True, has_last_author=False,
    )
    link_paper_institution(
        "sha1_p1", "https://ror.org/00f54p054",
        has_first_author=False, has_last_author=True,
    )
    rows = fetchall(
        "SELECT author_count, has_first_author, has_last_author "
        "FROM paper_institutions WHERE paper_id = 'sha1_p1'"
    )
    assert rows[0][0] == 2
    assert rows[0][1] is True  # carried from first insert
    assert rows[0][2] is True  # OR-updated on second call
