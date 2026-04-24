"""L1 keyword filter — spec §10.1.

Cases:
- Tier A venue match → pass with reason venue_A:*
- Positive keyword present → pass with reason kw+:*
- No positive hit → fail
- Reasons capped at 3
- Venue match is case-insensitive
"""
from __future__ import annotations

from dataclasses import dataclass

from paperpulse.filter.keywords import Keywords, level1_filter


@dataclass
class _P:
    title: str
    abstract: str | None
    venue_normalized: str | None = None


def _kws(**kwargs: list[str]) -> Keywords:
    return Keywords(
        positive_cs_core=kwargs.get("cs", []),
        positive_finance_core=kwargs.get("fin", []),
        positive_crosscut=kwargs.get("xc", []),
        strong_negative=kwargs.get("sn", []),
        weak_negative=kwargs.get("wn", []),
        immune=kwargs.get("im", []),
    )


def test_venue_tier_a_bypass_passes() -> None:
    kw = _kws()  # no positive terms at all
    paper = _P(title="Foo", abstract=None, venue_normalized="NeurIPS")
    ok, reasons = level1_filter(paper, kw, tier_a_venues={"NeurIPS", "ICML"})
    assert ok is True
    assert reasons == ["venue_A:NeurIPS"]


def test_positive_keyword_matches_case_insensitive() -> None:
    kw = _kws(cs=["Large Language Model"], fin=["asset pricing"])
    paper = _P(title="A study on large language models", abstract="")
    ok, reasons = level1_filter(paper, kw, tier_a_venues=set())
    assert ok is True
    assert any("large language model" in r for r in reasons)


def test_no_positive_hit_fails() -> None:
    kw = _kws(cs=["llm"], fin=["factor"])
    paper = _P(title="Image classification with CNNs", abstract="ResNet")
    ok, reasons = level1_filter(paper, kw, tier_a_venues=set())
    assert ok is False
    assert reasons == []


def test_reasons_capped_at_three() -> None:
    kw = _kws(cs=["a", "b", "c", "d", "e"])
    paper = _P(title="a b c d e", abstract="")
    ok, reasons = level1_filter(paper, kw, tier_a_venues=set())
    assert ok is True
    assert len(reasons) == 3


def test_venue_case_insensitive() -> None:
    kw = _kws()
    paper = _P(title="", abstract=None, venue_normalized="neurips")
    ok, reasons = level1_filter(paper, kw, tier_a_venues={"NeurIPS"})
    assert ok is True
    assert reasons == ["venue_A:NeurIPS"]
