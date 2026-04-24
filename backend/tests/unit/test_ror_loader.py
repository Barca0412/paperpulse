"""ROR loader: exact + alias + fuzzy + DB upsert."""

from __future__ import annotations

import json
from pathlib import Path

from paperpulse.db.duckdb_client import fetchall, get_connection
from paperpulse.entity.ror import RorIndex, _record_from_raw, upsert_to_db

FIXTURE = (
    Path(__file__).resolve().parents[1] / "fixtures" / "ror" / "ror_subset.json"
)


def _load_records():  # type: ignore[no-untyped-def]
    raw = json.loads(FIXTURE.read_text())
    return [_record_from_raw(r) for r in raw]


def test_exact_name_match_case_insensitive() -> None:
    idx = RorIndex()
    idx.load_records(_load_records())
    assert idx.exact_match("Stanford University") is not None
    assert idx.exact_match("stanford university") is not None
    assert idx.exact_match("Nonexistent Institute") is None


def test_alias_match() -> None:
    idx = RorIndex()
    idx.load_records(_load_records())
    bg = idx.exact_match("Bloomberg")  # alias of Bloomberg L.P.
    assert bg is not None
    assert bg.name == "Bloomberg L.P."

    mit = idx.exact_match("MIT")
    assert mit is not None
    assert mit.name == "Massachusetts Institute of Technology"


def test_fuzzy_match_handles_minor_difference() -> None:
    idx = RorIndex()
    idx.load_records(_load_records())
    res = idx.fuzzy_match("Massachusetts Institute of Tech")  # truncated
    assert res is not None
    assert res.ror_id == "https://ror.org/042nb2s44"


def test_fuzzy_match_returns_none_below_cutoff() -> None:
    idx = RorIndex()
    idx.load_records(_load_records())
    assert idx.fuzzy_match("Hogwarts School of Witchcraft") is None


def test_get_by_ror_id() -> None:
    idx = RorIndex()
    idx.load_records(_load_records())
    rec = idx.get("https://ror.org/03cve4549")
    assert rec is not None
    assert rec.name == "Tsinghua University"
    assert rec.country_code == "CN"


def test_upsert_to_db_writes_institutions_rows() -> None:
    get_connection()
    records = _load_records()
    n = upsert_to_db(records)
    assert n == len(records)
    rows = fetchall(
        "SELECT name FROM institutions WHERE ror_id LIKE 'https://ror.org/%' "
        "ORDER BY name"
    )
    names = [r[0] for r in rows]
    assert "Stanford University" in names
    assert "Bloomberg L.P." in names
    assert "Tsinghua University" in names
    assert len(rows) == len(records)


def test_upsert_to_db_is_idempotent() -> None:
    get_connection()
    records = _load_records()
    upsert_to_db(records)
    upsert_to_db(records)  # second time should not duplicate
    rows = fetchall(
        "SELECT COUNT(*) FROM institutions WHERE ror_id LIKE 'https://ror.org/%'"
    )
    assert rows[0][0] == len(records)
