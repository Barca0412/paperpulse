"""Phase 1 minimal subset of spec §14.8 — exposes a manual ingest trigger."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from paperpulse.config import get_store
from paperpulse.ingest.arxiv import ArxivSource
from paperpulse.ingest.base import Source
from paperpulse.ingest.nber import NberSource
from paperpulse.ingest.runner import run_source

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


class IngestRequest(BaseModel):
    sources: list[str] | None = None  # default: all enabled


class IngestResponse(BaseModel):
    queued: list[str]


def _build_sources(names: list[str] | None) -> list[Source]:
    cfg = get_store().sources.get("sources", {})
    arxiv_cfg = cfg.get("arxiv", {})
    nber_cfg = cfg.get("nber", {})
    enabled = {
        "arxiv": bool(arxiv_cfg.get("enabled", False)),
        "nber": bool(nber_cfg.get("enabled", False)),
    }
    requested = names if names is not None else [n for n, on in enabled.items() if on]
    out: list[Source] = []
    for n in requested:
        if n == "arxiv" and enabled["arxiv"]:
            out.append(
                ArxivSource(
                    categories=list(arxiv_cfg.get("categories", ["cs.LG"])),
                    max_results=int(arxiv_cfg.get("max_results_per_run", 200)),
                )
            )
        elif n == "nber" and enabled["nber"]:
            out.append(NberSource())
    return out


def _run_all(sources: list[Source]) -> None:
    for s in sources:
        run_source(s)


@router.post("/ingest/run-now", response_model=IngestResponse)
async def ingest_run_now(req: IngestRequest, bg: BackgroundTasks) -> IngestResponse:
    sources = _build_sources(req.sources)
    bg.add_task(_run_all, sources)
    return IngestResponse(queued=[s.name for s in sources])
