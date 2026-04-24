"""Institution normalization per spec §9.2 step 4.

Resolution order:
  1. ROR id exact (usually coming from OpenAlex)
  2. ROR name exact match
  3. ROR alias exact match
  4. ROR fuzzy match >= 92
  5. Create unverified manual row (id = 'manual:inst:<sha1(name)>')

In every case the institutions row is INSERTed/UPSERTed so downstream
joins (feed filter, institution stats) work regardless of provenance.
"""

from __future__ import annotations

import hashlib
import json
import logging

from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.entity.ror import get_index

_log = logging.getLogger(__name__)


def _manual_id(name: str) -> str:
    return "manual:inst:" + hashlib.sha1(name.lower().encode("utf-8")).hexdigest()[:12]


def resolve(*, ror_id: str | None = None, name: str | None = None) -> str | None:
    """Return institution.id (creating a row if needed). None if no signal."""
    idx = get_index()

    if ror_id:
        rec = idx.get(ror_id)
        if rec is not None:
            _ensure_row(
                rec.ror_id, rec.name, json.dumps(rec.aliases),
                rec.country_code, rec.city, rec.lat, rec.lng, rec.type, rec.ror_id,
            )
            return rec.ror_id
        # ROR id given but not in our index — still record it so we can
        # attach papers to a stable id; we'll learn the name when the dump
        # gets updated.
        _ensure_row(ror_id, ror_id, "[]", None, None, None, None, None, ror_id)
        return ror_id

    if name:
        rec = idx.exact_match(name)
        if rec is None:
            rec = idx.fuzzy_match(name, score_cutoff=92.0)
        if rec is not None:
            _ensure_row(
                rec.ror_id, rec.name, json.dumps(rec.aliases),
                rec.country_code, rec.city, rec.lat, rec.lng, rec.type, rec.ror_id,
            )
            return rec.ror_id
        manual = _manual_id(name)
        _ensure_row(manual, name, "[]", None, None, None, None, None, None)
        return manual

    return None


def _ensure_row(
    inst_id: str,
    name: str,
    aliases_json: str,
    country: str | None,
    city: str | None,
    lat: float | None,
    lng: float | None,
    type_: str | None,
    ror_id: str | None,
) -> None:
    execute(
        "INSERT INTO institutions (id, ror_id, name, aliases, country_code, "
        "city, lat, lng, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
        "aliases = EXCLUDED.aliases, country_code = EXCLUDED.country_code",
        [inst_id, ror_id, name, aliases_json, country, city, lat, lng, type_],
    )


def link_paper_institution(
    paper_id: str,
    institution_id: str,
    *,
    has_first_author: bool,
    has_last_author: bool,
) -> None:
    """Increment author_count when the same (paper, inst) pair already exists
    (multiple co-authors share institution)."""
    rows = fetchall(
        "SELECT author_count, has_first_author, has_last_author "
        "FROM paper_institutions WHERE paper_id = ? AND institution_id = ?",
        [paper_id, institution_id],
    )
    if rows:
        execute(
            "UPDATE paper_institutions SET "
            "author_count = author_count + 1, "
            "has_first_author = (has_first_author OR ?), "
            "has_last_author = (has_last_author OR ?) "
            "WHERE paper_id = ? AND institution_id = ?",
            [has_first_author, has_last_author, paper_id, institution_id],
        )
    else:
        execute(
            "INSERT INTO paper_institutions (paper_id, institution_id, "
            "author_count, has_first_author, has_last_author) "
            "VALUES (?, ?, 1, ?, ?)",
            [paper_id, institution_id, has_first_author, has_last_author],
        )
