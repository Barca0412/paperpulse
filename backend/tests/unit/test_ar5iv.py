"""ar5iv parser against saved fixture (no network)."""

from __future__ import annotations

from pathlib import Path

from paperpulse.entity.ar5iv import parse

FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "fixtures"
    / "ar5iv"
    / "paper_bloomberggpt.html"
)


def test_parse_finds_at_least_one_affiliation() -> None:
    affs = parse(FIXTURE.read_bytes())
    assert len(affs) >= 1


def test_parse_extracts_bloomberg_text() -> None:
    affs = parse(FIXTURE.read_bytes())
    blob = " ".join(a.text for a in affs).lower()
    assert "bloomberg" in blob


def test_parse_extracts_distinct_locations() -> None:
    """BloombergGPT has three affiliations: Bloomberg NY, Bloomberg Toronto,
    Johns Hopkins (Mark Dredze)."""
    affs = parse(FIXTURE.read_bytes())
    blob = " ".join(a.text for a in affs).lower()
    assert "new york" in blob or "ny" in blob
    assert "toronto" in blob


def test_parse_returns_empty_for_unrelated_html() -> None:
    affs = parse(b"<html><body><p>Just some text.</p></body></html>")
    assert affs == []


def test_parse_strips_footnote_markers() -> None:
    """Affiliations come with leading numeric/symbol markers like '1 Bloomberg…'.
    We strip those so resolver gets the clean institution string."""
    affs = parse(FIXTURE.read_bytes())
    for a in affs:
        # No affiliation should start with just a digit or punctuation.
        assert not a.text.startswith(("1 ", "2 ", "3 ", "* ", "† "))
