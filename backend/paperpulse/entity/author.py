"""Author normalization per spec §9.1.

Resolution order:
  1. ORCID exact (if present)
  2. OpenAlex id exact
  3. Fuzzy name (rapidfuzz ratio >= 92) within ±10 char length window
  4. Create new (id = openalex_id if present else 'manual:author:<sha1>')
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass

from rapidfuzz import fuzz

from paperpulse.db.duckdb_client import execute, fetchall

_log = logging.getLogger(__name__)


@dataclass
class ResolvedAuthor:
    author_id: str
    name: str
    openalex_id: str | None
    orcid: str | None
    is_new: bool


def _manual_id(name: str) -> str:
    return "manual:author:" + hashlib.sha1(name.lower().encode("utf-8")).hexdigest()[:12]


def find_or_create(
    *,
    name: str,
    openalex_id: str | None = None,
    orcid: str | None = None,
) -> ResolvedAuthor:
    # 1. ORCID
    if orcid:
        rows = fetchall(
            "SELECT id, name, openalex_id, orcid FROM authors WHERE orcid = ?",
            [orcid],
        )
        if rows:
            return ResolvedAuthor(
                str(rows[0][0]), str(rows[0][1]), rows[0][2], rows[0][3], False
            )
    # 2. OpenAlex
    if openalex_id:
        rows = fetchall(
            "SELECT id, name, openalex_id, orcid FROM authors WHERE openalex_id = ?",
            [openalex_id],
        )
        if rows:
            return ResolvedAuthor(
                str(rows[0][0]), str(rows[0][1]), rows[0][2], rows[0][3], False
            )
    # 3. Fuzzy by name (within ±10 char length)
    candidates = fetchall(
        "SELECT id, name, openalex_id, orcid FROM authors "
        "WHERE LENGTH(name) BETWEEN ? AND ?",
        [max(1, len(name) - 10), len(name) + 10],
    )
    best_score = 0.0
    best_row: tuple[object, ...] | None = None
    for row in candidates:
        s = fuzz.ratio(name.lower(), str(row[1]).lower())
        if s > best_score:
            best_score = s
            best_row = row
    if best_row is not None and best_score >= 92:
        oid = best_row[2]
        orc = best_row[3]
        return ResolvedAuthor(
            str(best_row[0]),
            str(best_row[1]),
            str(oid) if oid is not None else None,
            str(orc) if orc is not None else None,
            False,
        )
    # 4. New
    new_id = openalex_id or _manual_id(name)
    execute(
        "INSERT INTO authors (id, name, openalex_id, orcid) VALUES (?, ?, ?, ?)",
        [new_id, name, openalex_id, orcid],
    )
    return ResolvedAuthor(new_id, name, openalex_id, orcid, True)


def link_paper_author(
    paper_id: str,
    author_id: str,
    *,
    order: int,
    is_first: bool,
    is_last: bool,
    is_corresponding: bool,
    institution_ids: list[str],
) -> None:
    execute(
        "INSERT INTO paper_authors (paper_id, author_id, author_order, is_first, "
        "is_last, is_corresponding, affiliation_ids) "
        "VALUES (?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT (paper_id, author_id) DO UPDATE SET "
        "author_order = EXCLUDED.author_order, "
        "affiliation_ids = EXCLUDED.affiliation_ids",
        [
            paper_id,
            author_id,
            order,
            is_first,
            is_last,
            is_corresponding,
            json.dumps(institution_ids),
        ],
    )
