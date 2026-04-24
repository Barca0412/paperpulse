"""Institutions list API (spec §14.7 — subset for Phase 2)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from paperpulse.db.duckdb_client import fetchall

router = APIRouter(prefix="/api/v1/institutions", tags=["institutions"])


class InstitutionOut(BaseModel):
    id: str
    name: str
    country_code: str | None
    city: str | None
    type: str | None
    ror_id: str | None
    in_whitelist: bool
    paper_count_30d: int
    paper_count_total: int


@router.get("", response_model=list[InstitutionOut])
async def list_institutions(
    window_days: int = 30,
    limit: int = 50,
) -> list[InstitutionOut]:
    capped = max(1, min(limit, 500))
    wd = max(1, min(window_days, 365))
    rows = fetchall(
        f"""
        SELECT
            i.id,
            i.name,
            i.country_code,
            i.city,
            i.type,
            i.ror_id,
            i.in_whitelist,
            COUNT(DISTINCT CASE
                WHEN p.published_at >= CURRENT_DATE - INTERVAL '{wd}' DAY
                THEN pi.paper_id
            END) AS n_window,
            COUNT(DISTINCT pi.paper_id) AS n_total
        FROM institutions i
        LEFT JOIN paper_institutions pi ON pi.institution_id = i.id
        LEFT JOIN papers p ON p.id = pi.paper_id
        GROUP BY i.id, i.name, i.country_code, i.city, i.type, i.ror_id, i.in_whitelist
        HAVING COUNT(pi.paper_id) > 0
        ORDER BY n_window DESC, n_total DESC, i.name
        LIMIT ?
        """,
        [capped],
    )
    return [
        InstitutionOut(
            id=r[0],
            name=r[1],
            country_code=r[2],
            city=r[3],
            type=r[4],
            ror_id=r[5],
            in_whitelist=bool(r[6]),
            paper_count_30d=int(r[7]),
            paper_count_total=int(r[8]),
        )
        for r in rows
    ]
