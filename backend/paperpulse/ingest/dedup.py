"""Dedup + storage of RawPaper into the ``papers`` table.

Spec §8.3 ordering:
    1. DOI exact
    2. arxiv_id exact (version-stripped)
    3. fuzzy title + first_author + year
    4. new — generate stable id from normalized fields
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime

from rapidfuzz import fuzz

from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.ingest.base import RawPaper

_log = logging.getLogger(__name__)
_PUNCT_RE = re.compile(r"[^\w\s]+", flags=re.UNICODE)
_WS_RE = re.compile(r"\s+")


def normalize_title(title: str) -> str:
    t = _PUNCT_RE.sub("", title.lower())
    t = _WS_RE.sub(" ", t).strip()
    return t


def strip_arxiv_version(arxiv_id: str | None) -> str | None:
    if not arxiv_id:
        return None
    if "v" in arxiv_id and arxiv_id.split("v")[-1].isdigit():
        return arxiv_id.rsplit("v", 1)[0]
    return arxiv_id


def _first_author_name(raw: RawPaper) -> str:
    if raw.authors_raw:
        return str(raw.authors_raw[0].get("name", ""))
    return ""


def generate_id(raw: RawPaper) -> str:
    norm = normalize_title(raw.title)
    first = _first_author_name(raw).lower().strip()
    year = raw.published_at.year if raw.published_at else 0
    arxiv = strip_arxiv_version(raw.arxiv_id) or ""
    payload = f"{norm}|{first}|{year}|{arxiv}|{raw.doi or ''}"
    return "sha1_" + hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]


def _find_existing(raw: RawPaper) -> str | None:
    # 1. DOI exact
    if raw.doi:
        rows = fetchall("SELECT id FROM papers WHERE doi = ?", [raw.doi])
        if rows:
            return str(rows[0][0])
    # 2. arxiv_id (version-stripped)
    bare = strip_arxiv_version(raw.arxiv_id)
    if bare:
        rows = fetchall(
            "SELECT id, arxiv_id FROM papers WHERE arxiv_id = ? OR arxiv_id LIKE ?",
            [bare, f"{bare}v%"],
        )
        if rows:
            return str(rows[0][0])
    # 3. Fuzzy by normalized title within same year + first-author surname match
    year = raw.published_at.year if raw.published_at else None
    if year is None:
        return None
    candidates = fetchall(
        "SELECT id, title_normalized, authors FROM papers "
        "WHERE EXTRACT(YEAR FROM published_at) = ?",
        [year],
    )
    norm = normalize_title(raw.title)
    raw_first = _first_author_name(raw).lower()
    for cid, c_norm, c_authors_json in candidates:
        if not c_norm:
            continue
        if fuzz.ratio(norm, c_norm) > 95:
            try:
                c_authors = json.loads(c_authors_json) if c_authors_json else []
            except json.JSONDecodeError:
                c_authors = []
            c_first = c_authors[0].get("name", "").lower() if c_authors else ""
            if c_first and raw_first and c_first.split()[-1] == raw_first.split()[-1]:
                return str(cid)
    return None


def upsert_raw(raw: RawPaper) -> tuple[str, bool]:
    """Insert or refresh a paper. Returns ``(paper_id, is_new)``."""
    existing = _find_existing(raw)
    if existing is not None:
        execute(
            "UPDATE papers SET title = ?, title_normalized = ?, abstract = ?, "
            "authors = ?, updated_at = ?, pdf_url = COALESCE(?, pdf_url), "
            "html_url = COALESCE(?, html_url) WHERE id = ?",
            [
                raw.title,
                normalize_title(raw.title),
                raw.abstract,
                json.dumps(raw.authors_raw),
                raw.updated_at,
                raw.pdf_url,
                raw.html_url,
                existing,
            ],
        )
        return existing, False

    new_id = generate_id(raw)
    execute(
        "INSERT INTO papers (id, source, source_id, doi, arxiv_id, title, "
        "title_normalized, abstract, authors, published_at, updated_at, "
        "pdf_url, html_url) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            new_id,
            raw.source,
            raw.source_id,
            raw.doi,
            raw.arxiv_id,
            raw.title,
            normalize_title(raw.title),
            raw.abstract,
            json.dumps(raw.authors_raw),
            raw.published_at,
            raw.updated_at,
            raw.pdf_url,
            raw.html_url,
        ],
    )
    return new_id, True


def record_run(
    source: str,
    *,
    started_at: datetime,
    finished_at: datetime,
    status: str,
    papers_fetched: int,
    papers_new: int,
    error_message: str | None = None,
) -> None:
    execute(
        "INSERT INTO ingest_runs (source, started_at, finished_at, status, "
        "papers_fetched, papers_new, error_message) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [source, started_at, finished_at, status, papers_fetched, papers_new, error_message],
    )
