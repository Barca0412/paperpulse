"""Sanity-check endpoint used by Tauri to detect that the sidecar is alive."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["hello"])


class HelloResponse(BaseModel):
    status: str
    version: str


@router.get("/hello", response_model=HelloResponse)
async def hello() -> HelloResponse:
    from paperpulse import __version__

    return HelloResponse(status="ok", version=__version__)
