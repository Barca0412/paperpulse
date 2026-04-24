"""OpenAlex extraction from saved fixtures (no network)."""

from __future__ import annotations

import json
from pathlib import Path

from paperpulse.entity.openalex import extract_affiliations

FIX_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "openalex"


def _load(name: str) -> dict:
    return json.loads((FIX_DIR / name).read_text())


def test_rich_paper_extracts_authors_and_ror_ids() -> None:
    """Empirical Asset Pricing has full institution + ROR data."""
    affs = extract_affiliations(_load("work_empirical_asset_pricing.json"))
    assert len(affs) >= 3  # Gu, Kelly, Xiu
    by_name = {a.author_name: a for a in affs}
    gu = by_name.get("Shihao Gu")
    assert gu is not None
    assert "https://ror.org/024mw5h28" in gu.institution_ror_ids  # University of Chicago
    kelly = by_name.get("Bryan Kelly")
    assert kelly is not None
    # Bryan Kelly has multi-affiliation in OpenAlex
    assert any("yale" in n.lower() for n in kelly.institution_names)


def test_preprint_with_no_institutions_returns_authors_with_empty_lists() -> None:
    """BloombergGPT is an arXiv preprint — OpenAlex indexes the work but
    institutions[] is empty for every author. Caller must fall back to ar5iv."""
    affs = extract_affiliations(_load("work_bloomberggpt.json"))
    assert len(affs) >= 1
    # All affiliations should have empty institution lists
    assert all(not a.institution_ror_ids for a in affs)
    # But author identity is still recoverable (we may use OpenAlex author id later)
    by_name = {a.author_name for a in affs}
    assert "Shijie Wu" in by_name


def test_extract_handles_missing_authorships_gracefully() -> None:
    affs = extract_affiliations({})
    assert affs == []
    affs = extract_affiliations({"authorships": None})
    assert affs == []


def test_is_corresponding_flag_is_extracted() -> None:
    work = _load("work_empirical_asset_pricing.json")
    # At least one author should be marked corresponding (or none — depends on data)
    affs = extract_affiliations(work)
    # Just verify the field is a bool, present on every record
    assert all(isinstance(a.is_corresponding, bool) for a in affs)
