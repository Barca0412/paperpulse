"""L3 tier scoring pure-function tests. Spec §10.3."""
from __future__ import annotations

from paperpulse.filter.tiers import (
    BScore,
    PaperForScoring,
    Signals,
    TierRules,
    level3_tier,
)


def _rules(
    a_venues: set[str] | None = None,
    weights: dict[str, float] | None = None,
    threshold: float = 0.5,
) -> TierRules:
    return TierRules(
        A_venues=a_venues or set(),
        B=BScore(weights=weights or {}, threshold=threshold),
    )


def test_venue_tier_a_returns_1() -> None:
    rules = _rules(a_venues={"NeurIPS"})
    p = PaperForScoring(
        venue_normalized="NeurIPS",
        level2_score=0.0,
        institutions=[],
        authors_is_tracked=False,
    )
    tier, score = level3_tier(p, rules, Signals())
    assert tier == "A"
    assert score == 1.0


def test_tier_b_when_score_clears_threshold() -> None:
    rules = _rules(
        weights={
            "level2_similarity": 1.0,
            "institution_whitelist": 0,
            "citation_velocity": 0,
            "pwc_has_code": 0,
            "hf_daily_papers": 0,
            "tracked_author": 0,
        },
        threshold=0.5,
    )
    p = PaperForScoring(
        venue_normalized=None,
        level2_score=0.6,
        institutions=[],
        authors_is_tracked=False,
    )
    tier, score = level3_tier(p, rules, Signals())
    assert tier == "B"
    assert abs(score - 0.6) < 1e-6


def test_tier_c_below_threshold() -> None:
    rules = _rules(
        weights={
            "level2_similarity": 1.0,
            "institution_whitelist": 0,
            "citation_velocity": 0,
            "pwc_has_code": 0,
            "hf_daily_papers": 0,
            "tracked_author": 0,
        },
        threshold=0.5,
    )
    p = PaperForScoring(
        venue_normalized=None,
        level2_score=0.2,
        institutions=[],
        authors_is_tracked=False,
    )
    tier, _ = level3_tier(p, rules, Signals())
    assert tier == "C"


def test_institution_whitelist_high_priority_scores_1() -> None:
    rules = _rules(
        weights={
            "level2_similarity": 0,
            "institution_whitelist": 1.0,
            "citation_velocity": 0,
            "pwc_has_code": 0,
            "hf_daily_papers": 0,
            "tracked_author": 0,
        },
        threshold=0.5,
    )
    p = PaperForScoring(
        venue_normalized=None,
        level2_score=0.0,
        institutions=[{"in_whitelist": True, "whitelist_priority": "high"}],
        authors_is_tracked=False,
    )
    tier, score = level3_tier(p, rules, Signals())
    assert tier == "B"
    assert abs(score - 1.0) < 1e-6


def test_institution_whitelist_normal_priority_scores_05() -> None:
    rules = _rules(
        weights={
            "level2_similarity": 0,
            "institution_whitelist": 1.0,
            "citation_velocity": 0,
            "pwc_has_code": 0,
            "hf_daily_papers": 0,
            "tracked_author": 0,
        },
        threshold=0.8,
    )
    p = PaperForScoring(
        venue_normalized=None,
        level2_score=0.0,
        institutions=[{"in_whitelist": True, "whitelist_priority": "normal"}],
        authors_is_tracked=False,
    )
    _, score = level3_tier(p, rules, Signals())
    assert abs(score - 0.5) < 1e-6


def test_citation_velocity_normalized() -> None:
    rules = _rules(
        weights={
            "level2_similarity": 0,
            "institution_whitelist": 0,
            "citation_velocity": 1.0,
            "pwc_has_code": 0,
            "hf_daily_papers": 0,
            "tracked_author": 0,
        },
        threshold=0.3,
    )
    p = PaperForScoring(
        venue_normalized=None,
        level2_score=0.0,
        institutions=[],
        authors_is_tracked=False,
    )
    # vel 5 / 10 = 0.5
    _, score = level3_tier(p, rules, Signals(citation_velocity=5.0))
    assert abs(score - 0.5) < 1e-6
    # vel 15 caps at 1.0
    _, score2 = level3_tier(p, rules, Signals(citation_velocity=15.0))
    assert abs(score2 - 1.0) < 1e-6


def test_tracked_author_contributes() -> None:
    rules = _rules(
        weights={
            "level2_similarity": 0,
            "institution_whitelist": 0,
            "citation_velocity": 0,
            "pwc_has_code": 0,
            "hf_daily_papers": 0,
            "tracked_author": 1.0,
        },
        threshold=0.5,
    )
    p = PaperForScoring(
        venue_normalized=None,
        level2_score=0.0,
        institutions=[],
        authors_is_tracked=True,
    )
    tier, score = level3_tier(p, rules, Signals())
    assert tier == "B"
    assert abs(score - 1.0) < 1e-6


def test_composite_score_uses_all_weights() -> None:
    rules = _rules(
        weights={
            "level2_similarity": 0.5,
            "institution_whitelist": 0.5,
            "citation_velocity": 0,
            "pwc_has_code": 0,
            "hf_daily_papers": 0,
            "tracked_author": 0,
        },
        threshold=0.4,
    )
    p = PaperForScoring(
        venue_normalized=None,
        level2_score=0.4,  # * 0.5 = 0.20
        institutions=[{"in_whitelist": True, "whitelist_priority": "normal"}],  # 0.5 * 0.5 = 0.25
        authors_is_tracked=False,
    )
    tier, score = level3_tier(p, rules, Signals())
    assert abs(score - 0.45) < 1e-6
    assert tier == "B"
