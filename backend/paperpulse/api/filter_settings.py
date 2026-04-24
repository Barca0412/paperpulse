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
