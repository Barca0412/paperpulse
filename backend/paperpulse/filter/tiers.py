"""L3 Tier weighted scoring. Spec §10.3.

Pure function: caller loads rules + signals + institution/author state and
passes them in.
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field


@dataclass
class BScore:
    weights: dict[str, float] = field(default_factory=dict)
    threshold: float = 0.5


@dataclass
class TierRules:
    A_venues: set[str]
    B: BScore


@dataclass
class Signals:
    citation_velocity: float | None = None
    pwc_has_code: bool = False
    hf_daily_papers: bool = False


@dataclass
class PaperForScoring:
    venue_normalized: str | None
    level2_score: float
    institutions: list[dict[str, object]]  # keys: in_whitelist, whitelist_priority
    authors_is_tracked: bool


def _inst_score(insts: Iterable[dict[str, object]]) -> float:
    for i in insts:
        if not i.get("in_whitelist"):
            continue
        if i.get("whitelist_priority") == "high":
            return 1.0
        return 0.5
    return 0.0


def _norm_vel(v: float | None) -> float:
    if v is None:
        return 0.0
    return min(v / 10.0, 1.0)


def level3_tier(
    paper: PaperForScoring,
    rules: TierRules,
    signals: Signals,
) -> tuple[str, float]:
    if paper.venue_normalized and paper.venue_normalized in rules.A_venues:
        return "A", 1.0

    components = {
        "level2_similarity": paper.level2_score or 0.0,
        "institution_whitelist": _inst_score(paper.institutions),
        "citation_velocity": _norm_vel(signals.citation_velocity),
        "pwc_has_code": 1.0 if signals.pwc_has_code else 0.0,
        "hf_daily_papers": 1.0 if signals.hf_daily_papers else 0.0,
        "tracked_author": 1.0 if paper.authors_is_tracked else 0.0,
    }
    w = rules.B.weights
    score = sum(w.get(k, 0.0) * v for k, v in components.items())
    if score >= rules.B.threshold:
        return "B", float(score)
    return "C", float(score)
