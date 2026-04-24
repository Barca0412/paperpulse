"""Feed API. Supports time_window / group_by / sort / tier / source / topic
filters per spec §12.2 / §14.1.

Response shape:
  group_by=flat:    {total, group_by="flat", papers: [...]}
  group_by=<other>: {total, group_by, groups: [{label, label_type, count, papers}]}

L1-failed papers are excluded by default (set include_l1_failed=true to see them).
"""
from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from paperpulse.db.duckdb_client import fetchall

router = APIRouter(prefix="/api/v1", tags=["feed"])

_VALID_GROUP = {"flat", "topic", "tier", "source", "institution"}
_VALID_SORT = {"date", "relevance", "citations"}
_VALID_TIME_WINDOW = {"today", "week", "month", "all"}


def _time_window_cutoff(tw: str) -> str | None:
    today = date.today()
    if tw == "today":
        return today.isoformat()
    if tw == "week":
        return (today - timedelta(days=7)).isoformat()
    if tw == "month":
        return (today - timedelta(days=30)).isoformat()
    return None


def _order_by(sort: str) -> str:
    if sort == "relevance":
        return (
            "ORDER BY COALESCE(level3_tier_b_score, 0) DESC, "
            "COALESCE(level2_score, 0) DESC, published_at DESC NULLS LAST"
        )
    if sort == "citations":
        return "ORDER BY COALESCE(citation_count, 0) DESC, published_at DESC NULLS LAST"
    return "ORDER BY published_at DESC NULLS LAST, ingested_at DESC"


def _csv_list(v: str | None) -> list[str]:
    if not v:
        return []
    return [x.strip() for x in v.split(",") if x.strip()]


_PAPER_COLS = (
    "SELECT id, source, arxiv_id, doi, title, abstract, authors, "
    "CAST(published_at AS VARCHAR), pdf_url, html_url, "
    "tier, primary_topic, relevance_score, tldr_en, tldr_zh, user_status "
    "FROM papers "
)


def _row_to_paper(r: tuple[Any, ...]) -> dict[str, Any]:
    return {
        "id": r[0],
        "source": r[1],
        "arxiv_id": r[2],
        "doi": r[3],
        "title": r[4],
        "abstract": r[5],
        "authors": json.loads(r[6]) if r[6] else [],
        "published_at": r[7],
        "pdf_url": r[8],
        "html_url": r[9],
        "tier": r[10],
        "primary_topic": r[11],
        "relevance_score": r[12],
        "tldr_en": r[13],
        "tldr_zh": r[14],
        "user_status": r[15] or "unread",
    }


def _institution_for(paper_id: str) -> tuple[str, str] | None:
    """First whitelisted institution (priority=high first), else the
    institution with the most authors on the paper. Returns (id, name).
    """
    rows = fetchall(
        "SELECT i.id, i.name, i.in_whitelist, i.whitelist_priority, pi.author_count "
        "FROM paper_institutions pi "
        "JOIN institutions i ON pi.institution_id = i.id "
        "WHERE pi.paper_id = ? "
        "ORDER BY CASE WHEN i.whitelist_priority = 'high' THEN 0 "
        "              WHEN i.in_whitelist THEN 1 ELSE 2 END, "
        "         pi.author_count DESC "
        "LIMIT 1",
        [paper_id],
    )
    if not rows:
        return None
    r = rows[0]
    return str(r[0]), str(r[1])


@router.get("/feed")
async def get_feed(
    limit: int = 100,
    group_by: str = Query("flat"),
    time_window: str = Query("all"),
    sort: str = Query("date"),
    tier: str | None = Query(None),
    source: str | None = Query(None),
    topic: str | None = Query(None),
    include_l1_failed: bool = False,
) -> dict[str, Any]:
    if group_by not in _VALID_GROUP:
        raise HTTPException(422, f"group_by must be one of {_VALID_GROUP}")
    if sort not in _VALID_SORT:
        raise HTTPException(422, f"sort must be one of {_VALID_SORT}")
    if time_window not in _VALID_TIME_WINDOW:
        raise HTTPException(
            422, f"time_window must be one of {_VALID_TIME_WINDOW}"
        )

    where: list[str] = []
    params: list[Any] = []
    if not include_l1_failed:
        where.append("level1_passed = TRUE")

    cutoff = _time_window_cutoff(time_window)
    if cutoff is not None:
        where.append("published_at >= ?")
        params.append(cutoff)

    tiers = _csv_list(tier)
    if tiers:
        placeholders = ",".join(["?"] * len(tiers))
        where.append(f"tier IN ({placeholders})")
        params.extend(tiers)

    sources = _csv_list(source)
    if sources:
        placeholders = ",".join(["?"] * len(sources))
        where.append(f"source IN ({placeholders})")
        params.extend(sources)

    topics = _csv_list(topic)
    if topics:
        placeholders = ",".join(["?"] * len(topics))
        where.append(f"primary_topic IN ({placeholders})")
        params.extend(topics)

    capped = max(1, min(limit, 500))
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    sql = f"{_PAPER_COLS}{where_sql} {_order_by(sort)} LIMIT ?"
    rows = fetchall(sql, [*params, capped])
    papers = [_row_to_paper(r) for r in rows]

    # total (respects the same filters, not the LIMIT)
    total_sql = f"SELECT COUNT(*) FROM papers {where_sql}"
    total = int(fetchall(total_sql, params)[0][0])

    if group_by == "flat":
        return {"total": total, "group_by": "flat", "papers": papers}

    # Grouped responses
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    label_type_by_label: dict[str, str] = {}

    for p in papers:
        if group_by == "topic":
            label = p["primary_topic"] or "unassigned"
            label_type_by_label[label] = "topic"
        elif group_by == "tier":
            label = p["tier"] or "unassigned"
            label_type_by_label[label] = "tier"
        elif group_by == "source":
            label = p["source"] or "unknown"
            label_type_by_label[label] = "source"
        elif group_by == "institution":
            inst = _institution_for(p["id"])
            if inst is None:
                label = "unassigned"
            else:
                label = inst[1]  # institution name
            label_type_by_label[label] = "institution"
        else:  # pragma: no cover
            label = "unassigned"
        buckets[label].append(p)

    groups = [
        {
            "label": k,
            "label_type": label_type_by_label.get(k, group_by),
            "count": len(v),
            "papers": v,
        }
        for k, v in buckets.items()
    ]
    # Stable sort: Tier-A first for group_by=tier, else by count desc
    if group_by == "tier":
        tier_order = {"A": 0, "B": 1, "C": 2, "unassigned": 3}
        groups.sort(key=lambda g: tier_order.get(str(g["label"]), 99))
    else:
        groups.sort(key=lambda g: int(g["count"]), reverse=True)  # type: ignore[arg-type]

    return {
        "total": total,
        "group_by": group_by,
        "groups": groups,
    }
