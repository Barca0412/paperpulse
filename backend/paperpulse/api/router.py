"""Aggregate API router; sub-routers are registered here."""

from __future__ import annotations

from fastapi import APIRouter

from paperpulse.api import hello

api_router = APIRouter()
api_router.include_router(hello.router)
