"""Authors list API (spec §14.7 — subset for Phase 2)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from paperpulse.db.duckdb_client import fetchall

router = APIRouter(prefix="/api/v1/authors", tags=["authors"])


class AuthorOut(BaseModel):
    id: str
    name: str
    openalex_id: str | None
    orcid: str | None
    is_tracked: bool
    paper_count_30d: int
    paper_count_total: int


@router.get("", response_model=list[AuthorOut])
async def list_authors(
    window_days: int = 30,
    limit: int = 100,
) -> list[AuthorOut]:
    capped = max(1, min(limit, 500))
    wd = max(1, min(window_days, 365))
    rows = fetchall(
        f"""
        SELECT
            a.id,
            a.name,
            a.openalex_id,
            a.orcid,
            a.is_tracked,
            COUNT(DISTINCT CASE
                WHEN p.published_at >= CURRENT_DATE - INTERVAL '{wd}' DAY
                THEN pa.paper_id
            END) AS n_window,
            COUNT(DISTINCT pa.paper_id) AS n_total
        FROM authors a
        LEFT JOIN paper_authors pa ON pa.author_id = a.id
        LEFT JOIN papers p ON p.id = pa.paper_id
        GROUP BY a.id, a.name, a.openalex_id, a.orcid, a.is_tracked
        HAVING COUNT(pa.paper_id) > 0
        ORDER BY n_window DESC, n_total DESC, a.name
        LIMIT ?
        """,
        [capped],
    )
    return [
        AuthorOut(
            id=r[0],
            name=r[1],
            openalex_id=r[2],
            orcid=r[3],
            is_tracked=bool(r[4]),
            paper_count_30d=int(r[5]),
            paper_count_total=int(r[6]),
        )
        for r in rows
    ]
