"""Integration: 3-path affiliation orchestration with mocked upstreams."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from paperpulse.db.duckdb_client import execute, fetchall, get_connection
from paperpulse.entity import affiliation_pipeline, ar5iv, openalex, ror
from paperpulse.entity.affiliation_pipeline import enrich_paper_affiliations
from paperpulse.entity.ror import RorIndex, _record_from_raw

FIX_DIR = Path(__file__).resolve().parents[1] / "fixtures"
ROR_FIX = FIX_DIR / "ror" / "ror_subset.json"
OA_RICH = FIX_DIR / "openalex" / "work_empirical_asset_pricing.json"
OA_THIN = FIX_DIR / "openalex" / "work_bloomberggpt.json"
AR5IV_BG = FIX_DIR / "ar5iv" / "paper_bloomberggpt.html"


@pytest.fixture(autouse=True)
def _seed_ror() -> None:
    ror.reset_index()
    idx = RorIndex()
    idx.load_records([_record_from_raw(r) for r in json.loads(ROR_FIX.read_text())])
    ror._index = idx


def _insert_paper(paper_id: str, **kw: object) -> None:
    get_connection()
    cols = {
        "id": paper_id, "source": "arxiv", "source_id": "2511.0001",
        "title": "Test Paper", "doi": None, "arxiv_id": None,
        "authors": json.dumps([]),
    }
    cols.update(kw)
    execute(
        "INSERT INTO papers (id, source, source_id, title, doi, arxiv_id, authors) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [cols["id"], cols["source"], cols["source_id"], cols["title"],
         cols["doi"], cols["arxiv_id"], cols["authors"]],
    )


def test_openalex_path_persists_authors_and_institutions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Rich OpenAlex data (Empirical Asset Pricing) → source='openalex', rows written."""
    _insert_paper("sha1_eap", source="arxiv", arxiv_id="1907.12345", doi=None)
    work = json.loads(OA_RICH.read_text())
    monkeypatch.setattr(openalex, "lookup_by_arxiv", lambda aid: work)
    monkeypatch.setattr(openalex, "lookup_by_doi", lambda d: None)

    result = enrich_paper_affiliations("sha1_eap")
    assert result == "openalex"

    rows = fetchall("SELECT affiliation_source FROM papers WHERE id = ?", ["sha1_eap"])
    assert rows[0][0] == "openalex"

    # At least one author row
    pa_rows = fetchall("SELECT author_id FROM paper_authors WHERE paper_id = ?", ["sha1_eap"])
    assert len(pa_rows) >= 3  # Gu, Kelly, Xiu

    # At least one institution row — University of Chicago ROR id should be linked
    pi_rows = fetchall(
        "SELECT institution_id FROM paper_institutions WHERE paper_id = ?",
        ["sha1_eap"],
    )
    inst_ids = {r[0] for r in pi_rows}
    assert "https://ror.org/024mw5h28" in inst_ids  # University of Chicago


def test_ar5iv_fallback_when_openalex_has_no_institutions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """BloombergGPT: OpenAlex returns work but empty institutions → ar5iv fallback."""
    _insert_paper(
        "sha1_bg",
        source="arxiv",
        arxiv_id="2303.17564",
        authors=json.dumps([
            {"name": "Shijie Wu"},
            {"name": "Mark Dredze"},
            {"name": "Gideon Mann"},
        ]),
    )
    thin_work = json.loads(OA_THIN.read_text())
    monkeypatch.setattr(openalex, "lookup_by_arxiv", lambda aid: thin_work)
    monkeypatch.setattr(openalex, "lookup_by_doi", lambda d: None)
    # Return cached ar5iv HTML instead of hitting the network
    html = AR5IV_BG.read_bytes()
    monkeypatch.setattr(
        ar5iv, "fetch_and_parse", lambda aid, timeout=15: ar5iv.parse(html)
    )

    result = enrich_paper_affiliations("sha1_bg")
    assert result == "ar5iv"

    rows = fetchall("SELECT affiliation_source FROM papers WHERE id = ?", ["sha1_bg"])
    assert rows[0][0] == "ar5iv"

    # All 3 authors attached to every parsed institution (heuristic per spec §9.2)
    pa = fetchall("SELECT author_id FROM paper_authors WHERE paper_id = ?", ["sha1_bg"])
    assert len(pa) == 3

    pi = fetchall(
        "SELECT institution_id FROM paper_institutions WHERE paper_id = ?",
        ["sha1_bg"],
    )
    # Manual:inst rows created for "Bloomberg, New York…" etc since ROR fixture
    # doesn't have a "Bloomberg, New York, NY USA" exact name.
    assert len(pi) >= 1


def test_unverified_path_queues_retry(monkeypatch: pytest.MonkeyPatch) -> None:
    _insert_paper("sha1_nothing", source="arxiv", arxiv_id="9999.99999")
    monkeypatch.setattr(openalex, "lookup_by_arxiv", lambda aid: None)
    monkeypatch.setattr(openalex, "lookup_by_doi", lambda d: None)
    monkeypatch.setattr(ar5iv, "fetch_and_parse", lambda aid, timeout=15: [])

    result = enrich_paper_affiliations("sha1_nothing")
    assert result == "unverified"

    rows = fetchall(
        "SELECT source, affiliation_source FROM papers WHERE id = ?",
        ["sha1_nothing"],
    )
    assert rows[0][1] == "unverified"
    q = fetchall(
        "SELECT paper_id, attempts FROM affiliation_retry_queue WHERE paper_id = ?",
        ["sha1_nothing"],
    )
    assert len(q) == 1
    assert q[0][1] == 0


def test_nonexistent_paper_returns_unverified(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(openalex, "lookup_by_doi", lambda d: None)
    monkeypatch.setattr(openalex, "lookup_by_arxiv", lambda aid: None)
    assert enrich_paper_affiliations("sha1_missing") == "unverified"


def test_process_retry_queue_runs_due_items(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Seed a paper + enqueue it with next_attempt_at in the past
    _insert_paper("sha1_retry", source="arxiv", arxiv_id="2303.17564")
    execute(
        "INSERT INTO affiliation_retry_queue (paper_id, next_attempt_at, attempts) "
        "VALUES (?, '2020-01-01', 1)",
        ["sha1_retry"],
    )
    # Mock upstreams to succeed via ar5iv this time
    monkeypatch.setattr(openalex, "lookup_by_arxiv", lambda aid: None)
    monkeypatch.setattr(openalex, "lookup_by_doi", lambda d: None)
    html = AR5IV_BG.read_bytes()
    monkeypatch.setattr(
        ar5iv, "fetch_and_parse", lambda aid, timeout=15: ar5iv.parse(html)
    )

    n = affiliation_pipeline.process_retry_queue()
    assert n == 1
    # Queue should be empty after successful retry
    q = fetchall("SELECT paper_id FROM affiliation_retry_queue")
    assert q == []
