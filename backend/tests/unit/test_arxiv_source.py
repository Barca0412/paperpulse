"""Arxiv source parses Atom feed responses into RawPaper objects."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from paperpulse.ingest.arxiv import parse_atom_feed

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "arxiv" / "sample_response.xml"


def test_parses_at_least_one_paper() -> None:
    xml = FIXTURE.read_bytes()
    papers = list(parse_atom_feed(xml))
    assert len(papers) >= 1


def test_paper_has_arxiv_id_and_title() -> None:
    papers = list(parse_atom_feed(FIXTURE.read_bytes()))
    p = papers[0]
    assert p.source == "arxiv"
    assert p.arxiv_id  # like "2511.01234" or "2511.01234v1"
    assert p.title.strip()
    assert isinstance(p.published_at, datetime)
    assert p.html_url == f"https://ar5iv.labs.arxiv.org/html/{p.arxiv_id}"


def test_authors_extracted_with_name_field() -> None:
    papers = list(parse_atom_feed(FIXTURE.read_bytes()))
    p = papers[0]
    assert p.authors_raw, "expected at least one author"
    assert "name" in p.authors_raw[0]
