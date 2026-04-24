"""Three-path affiliation orchestrator per spec §9.2.

    Path 1 (primary): OpenAlex lookup_by_doi / lookup_by_arxiv
    Path 2 (fallback, arxiv-only): ar5iv HTML scrape
    Path 3 (deferred): mark unverified + queue for retry

Public API:
    enrich_paper_affiliations(paper_id) -> source label
    process_retry_queue(max_per_run) -> count retried
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta

from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.entity import ar5iv, author, institution, openalex

_log = logging.getLogger(__name__)

_RETRY_DELAY_HOURS = 48
_MAX_ATTEMPTS = 5


def enrich_paper_affiliations(paper_id: str) -> str:
    """Fill paper_authors + paper_institutions for one paper.

    Returns the affiliation_source label written back to papers:
      'openalex' | 'ar5iv' | 'unverified'
    """
    rows = fetchall(
        "SELECT doi, arxiv_id, source, authors FROM papers WHERE id = ?",
        [paper_id],
    )
    if not rows:
        return "unverified"
    doi, arxiv_id, source_name, authors_json = rows[0]

    # Path 1: OpenAlex
    work = None
    if doi:
        work = openalex.lookup_by_doi(doi)
    if not work and arxiv_id:
        work = openalex.lookup_by_arxiv(arxiv_id)

    affs = openalex.extract_affiliations(work) if work else []
    has_institutions = any(a.institution_ror_ids or a.institution_names for a in affs)

    if affs and has_institutions:
        _persist_openalex(paper_id, affs)
        _mark_source(paper_id, "openalex")
        return "openalex"

    # Path 2: ar5iv (arxiv-only)
    if source_name == "arxiv" and arxiv_id:
        ar5iv_affs = ar5iv.fetch_and_parse(arxiv_id)
        if ar5iv_affs:
            _persist_ar5iv(paper_id, authors_json, ar5iv_affs, openalex_affs=affs)
            _mark_source(paper_id, "ar5iv")
            return "ar5iv"

    # Path 3: queue retry, mark unverified
    # If OpenAlex gave authors (but no institutions), still persist authors so
    # the Authors page has content — don't leave paper_authors empty.
    if affs:
        _persist_openalex(paper_id, affs)  # persists authors; institutions empty
    _mark_source(paper_id, "unverified")
    _enqueue_retry(paper_id, delay_hours=_RETRY_DELAY_HOURS)
    return "unverified"


def _persist_openalex(
    paper_id: str, affs: list[openalex.OpenAlexAffiliation]
) -> None:
    n = len(affs)
    for i, a in enumerate(affs):
        au = author.find_or_create(
            name=a.author_name,
            openalex_id=a.author_openalex_id,
            orcid=a.author_orcid,
        )
        inst_ids: list[str] = []
        for rid in a.institution_ror_ids:
            resolved = institution.resolve(ror_id=rid)
            if resolved:
                inst_ids.append(resolved)
        # Name-only fallback when no ROR ids
        if not inst_ids:
            for nm in a.institution_names:
                resolved = institution.resolve(name=nm)
                if resolved:
                    inst_ids.append(resolved)
        author.link_paper_author(
            paper_id, au.author_id,
            order=i,
            is_first=(i == 0),
            is_last=(i == n - 1),
            is_corresponding=a.is_corresponding,
            institution_ids=inst_ids,
        )
        for iid in inst_ids:
            institution.link_paper_institution(
                paper_id, iid,
                has_first_author=(i == 0),
                has_last_author=(i == n - 1),
            )


def _persist_ar5iv(
    paper_id: str,
    authors_json: str | None,
    ar5iv_affs: list[ar5iv.Ar5ivAffiliation],
    *,
    openalex_affs: list[openalex.OpenAlexAffiliation],
) -> None:
    """ar5iv doesn't give author-affiliation linkage with enough confidence in v1,
    so we attach **all** parsed affiliations to **all** authors. Better than no
    signal for the Phase 3 institution-whitelist filter."""
    raw_authors: list[dict[str, str]] = []
    if authors_json:
        try:
            raw_authors = json.loads(authors_json) or []
        except (json.JSONDecodeError, TypeError):
            raw_authors = []
    # Prefer OpenAlex author metadata (has OpenAlex id + ORCID) when available.
    name_to_oa = {a.author_name: a for a in openalex_affs}

    inst_ids: list[str] = []
    for a in ar5iv_affs:
        resolved = institution.resolve(name=a.text)
        if resolved:
            inst_ids.append(resolved)
    # De-dup
    inst_ids = list(dict.fromkeys(inst_ids))

    n = len(raw_authors) or 1
    for i, au_dict in enumerate(raw_authors):
        name = au_dict.get("name", "")
        if not name:
            continue
        oa = name_to_oa.get(name)
        au = author.find_or_create(
            name=name,
            openalex_id=oa.author_openalex_id if oa else None,
            orcid=oa.author_orcid if oa else None,
        )
        author.link_paper_author(
            paper_id, au.author_id,
            order=i,
            is_first=(i == 0),
            is_last=(i == n - 1),
            is_corresponding=False,
            institution_ids=inst_ids,
        )
        for iid in inst_ids:
            institution.link_paper_institution(
                paper_id, iid,
                has_first_author=(i == 0),
                has_last_author=(i == n - 1),
            )


def _mark_source(paper_id: str, source: str) -> None:
    execute(
        "UPDATE papers SET affiliation_source = ?, affiliation_fetched_at = ? "
        "WHERE id = ?",
        [source, datetime.now(), paper_id],
    )


def _enqueue_retry(paper_id: str, *, delay_hours: int) -> None:
    next_attempt = datetime.now() + timedelta(hours=delay_hours)
    execute(
        "INSERT INTO affiliation_retry_queue (paper_id, next_attempt_at, attempts) "
        "VALUES (?, ?, 0) ON CONFLICT (paper_id) DO UPDATE SET "
        "next_attempt_at = EXCLUDED.next_attempt_at",
        [paper_id, next_attempt],
    )


def process_retry_queue(*, max_per_run: int = 50) -> int:
    rows = fetchall(
        "SELECT paper_id FROM affiliation_retry_queue "
        "WHERE next_attempt_at <= ? AND attempts < ? "
        "ORDER BY next_attempt_at LIMIT ?",
        [datetime.now(), _MAX_ATTEMPTS, max_per_run],
    )
    n = 0
    for (pid,) in rows:
        result = enrich_paper_affiliations(pid)
        if result != "unverified":
            execute(
                "DELETE FROM affiliation_retry_queue WHERE paper_id = ?", [pid]
            )
        else:
            execute(
                "UPDATE affiliation_retry_queue SET attempts = attempts + 1 "
                "WHERE paper_id = ?",
                [pid],
            )
        n += 1
    return n
