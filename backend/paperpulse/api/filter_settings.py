"""Settings endpoints for Phase 3 filter rules (keywords / seeds / topics / tiers).

Each endpoint:
 - GET returns current parsed YAML (as dict)
 - POST validates the payload, writes YAML via safe_dump, calls ConfigStore.reload

The watchdog observer also fires on the disk write — both paths converge on
the same in-memory state; the explicit reload() just makes the GET immediately
consistent regardless of watchdog timing.
"""
from __future__ import annotations

from typing import Any

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from paperpulse.config import get_store
from paperpulse.paths import config_dir

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


def _read(name: str) -> dict[str, Any]:
    return dict(get_store().get(name) or {})


def _write(name: str, payload: dict[str, Any]) -> None:
    path = config_dir() / f"{name}.yml"
    text = yaml.safe_dump(payload, sort_keys=False, allow_unicode=True)
    path.write_text(text, encoding="utf-8")
    get_store().reload(name)


# ── Keywords ──────────────────────────────────────────────────────────────


class KeywordsPayload(BaseModel):
    positive: dict[str, list[str]]
    strong_negative: list[str]
    weak_negative: list[str]
    immune: list[str]


@router.get("/keywords")
async def get_keywords() -> dict[str, Any]:
    return _read("keywords")


@router.post("/keywords")
async def post_keywords(payload: KeywordsPayload) -> dict[str, Any]:
    pos = payload.positive
    for k in ("cs_core", "finance_core", "crosscut"):
        if k not in pos:
            raise HTTPException(status_code=422, detail=f"positive.{k} missing")
    _write("keywords", payload.model_dump())
    return _read("keywords")


# ── Seeds ─────────────────────────────────────────────────────────────────


class SeedPaper(BaseModel):
    id: str | None = None
    title: str
    abstract: str | None = None
    doi: str | None = None
    arxiv_id: str | None = None
    base_weight: float = 1.0
    half_life_days: float | None = None
    added_at: str | None = None


class SeedsPayload(BaseModel):
    seed_papers: list[SeedPaper] = []
    user_must_read_papers: list[SeedPaper] = []
    seed_meta: dict[str, Any] = {}


@router.get("/seeds")
async def get_seeds() -> dict[str, Any]:
    return _read("seeds")


@router.post("/seeds")
async def post_seeds(payload: SeedsPayload) -> dict[str, Any]:
    _write("seeds", payload.model_dump())
    return _read("seeds")


# ── Topics ────────────────────────────────────────────────────────────────


class Topic(BaseModel):
    name: str
    slug: str
    side: str  # "cs" | "finance" | "crosscut"
    description_en: str = ""
    description_zh: str = ""
    weight: float = 1.0
    color: str | None = None


class TopicsPayload(BaseModel):
    topics: list[Topic] = []


@router.get("/topics")
async def get_topics() -> dict[str, Any]:
    return _read("topics")


@router.post("/topics")
async def post_topics(payload: TopicsPayload) -> dict[str, Any]:
    _write("topics", payload.model_dump())
    return _read("topics")


# ── Tier rules ────────────────────────────────────────────────────────────


class TierRulesPayload(BaseModel):
    tier_rules: dict[str, Any]


@router.get("/tiers")
async def get_tiers() -> dict[str, Any]:
    return _read("tiers")


@router.post("/tiers")
async def post_tiers(payload: TierRulesPayload) -> dict[str, Any]:
    _write("tiers", payload.model_dump())
    return _read("tiers")


class SimulateTiersPayload(BaseModel):
    A_venues: list[str]
    B_weights: dict[str, float]
    B_threshold: float
    limit: int | None = None


@router.post("/tiers/simulate")
async def simulate_tiers_ep(payload: SimulateTiersPayload) -> dict[str, int]:
    from paperpulse.filter.simulate import simulate_tiers
    from paperpulse.filter.tiers import BScore, TierRules

    rules = TierRules(
        A_venues=set(payload.A_venues),
        B=BScore(weights=dict(payload.B_weights), threshold=payload.B_threshold),
    )
    r = simulate_tiers(rules, limit=payload.limit)
    return {
        "total": r.total,
        "tier_a": r.tier_a,
        "tier_b": r.tier_b,
        "tier_c": r.tier_c,
    }
