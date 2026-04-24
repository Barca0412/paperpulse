"""NBER source parses the NBER 'new' RSS feed."""

from __future__ import annotations

from pathlib import Path

from paperpulse.ingest.nber import parse_rss

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "nber" / "sample_rss.xml"


def test_parses_at_least_one_entry() -> None:
    papers = list(parse_rss(FIXTURE.read_bytes()))
    assert len(papers) >= 1


def test_each_paper_has_title_and_source_id() -> None:
    papers = list(parse_rss(FIXTURE.read_bytes()))
    p = papers[0]
    assert p.source == "nber"
    assert p.title.strip()
    assert p.source_id  # NBER working paper number, e.g. "w33245"
    assert p.html_url and p.html_url.startswith("http")
