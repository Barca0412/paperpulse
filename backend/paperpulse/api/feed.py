"""Phase 1 minimal Feed API. Returns up to 100 most recent papers, no filters.

Schema is a strict subset of spec §14.1; group_by/time_window/etc. arrive in PR #6.1.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from paperpulse.db.duckdb_client import fetchall

router = APIRouter(prefix="/api/v1", tags=["feed"])


class PaperOut(BaseModel):
    id: str
    source: str
    arxiv_id: str | None
    doi: str | None
    title: str
    abstract: str | None
    authors: list[dict[str, Any]]
    published_at: str | None
    pdf_url: str | None
    html_url: str | None
    tier: str | None
    primary_topic: str | None
    relevance_score: int | None
    tldr_en: str | None
    tldr_zh: str | None
    user_status: str


class FeedResponse(BaseModel):
    total: int
    papers: list[PaperOut]


@router.get("/feed", response_model=FeedResponse)
async def get_feed(limit: int = 100) -> FeedResponse:
    capped_limit = max(1, min(limit, 500))
    rows = fetchall(
        "SELECT id, source, arxiv_id, doi, title, abstract, authors, "
        "       CAST(published_at AS VARCHAR), pdf_url, html_url, "
        "       tier, primary_topic, relevance_score, tldr_en, tldr_zh, user_status "
        "FROM papers "
        "ORDER BY published_at DESC NULLS LAST, ingested_at DESC "
        "LIMIT ?",
        [capped_limit],
    )
    papers = [
        PaperOut(
            id=r[0],
            source=r[1],
            arxiv_id=r[2],
            doi=r[3],
            title=r[4],
            abstract=r[5],
            authors=json.loads(r[6]) if r[6] else [],
            published_at=r[7],
            pdf_url=r[8],
            html_url=r[9],
            tier=r[10],
            primary_topic=r[11],
            relevance_score=r[12],
            tldr_en=r[13],
            tldr_zh=r[14],
            user_status=r[15] or "unread",
        )
        for r in rows
    ]
    total = fetchall("SELECT COUNT(*) FROM papers")[0][0]
    return FeedResponse(total=int(total), papers=papers)
