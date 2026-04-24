"""Author normalization: ORCID > OpenAlex > fuzzy > new."""

from __future__ import annotations

from paperpulse.db.duckdb_client import fetchall, get_connection
from paperpulse.entity.author import find_or_create, link_paper_author


def test_creates_new_author_with_manual_id_when_no_ids() -> None:
    get_connection()
    r = find_or_create(name="Alice Wonderland")
    assert r.is_new is True
    assert r.author_id.startswith("manual:author:")


def test_dedups_by_orcid() -> None:
    get_connection()
    a = find_or_create(name="Alice Wonderland", orcid="0000-0001-0002-0003")
    b = find_or_create(name="Different Spelling", orcid="0000-0001-0002-0003")
    assert a.author_id == b.author_id
    assert b.is_new is False


def test_dedups_by_openalex_id() -> None:
    get_connection()
    a = find_or_create(name="Bryan Kelly", openalex_id="A12345")
    b = find_or_create(name="B. Kelly", openalex_id="A12345")
    assert a.author_id == "A12345"
    assert b.is_new is False


def test_fuzzy_match_dedups_minor_typos() -> None:
    get_connection()
    a = find_or_create(name="Bryan T Kelly")
    b = find_or_create(name="Bryan T. Kelly")  # punctuation differs
    assert a.author_id == b.author_id
    assert b.is_new is False


def test_completely_different_names_get_separate_ids() -> None:
    get_connection()
    a = find_or_create(name="Alice Wonderland")
    b = find_or_create(name="Bob Smith")
    assert a.author_id != b.author_id


def test_link_paper_author_writes_row() -> None:
    get_connection()
    au = find_or_create(name="Alice Wonderland")
    # Need a paper row for the FK-equivalent (no enforced FK, but for query joins)
    from paperpulse.db.duckdb_client import execute
    execute(
        "INSERT INTO papers (id, source, source_id, title) VALUES (?, ?, ?, ?)",
        ["sha1_p1", "arxiv", "2511.0001", "Test Paper"],
    )
    link_paper_author(
        "sha1_p1", au.author_id,
        order=0, is_first=True, is_last=True, is_corresponding=True,
        institution_ids=["https://ror.org/00f54p054"],
    )
    rows = fetchall(
        "SELECT paper_id, author_id, is_first, affiliation_ids "
        "FROM paper_authors WHERE paper_id = 'sha1_p1'"
    )
    assert len(rows) == 1
    assert rows[0][0] == "sha1_p1"
    assert rows[0][2] is True
    import json as _json
    assert _json.loads(rows[0][3]) == ["https://ror.org/00f54p054"]
