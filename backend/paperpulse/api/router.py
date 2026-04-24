"""Aggregate API router; sub-routers are registered here."""

from __future__ import annotations

from fastapi import APIRouter

from paperpulse.api import authors, feed, filter_settings, hello, institutions, settings

api_router = APIRouter()
api_router.include_router(hello.router)
api_router.include_router(feed.router)
api_router.include_router(settings.router)
api_router.include_router(filter_settings.router)
api_router.include_router(institutions.router)
api_router.include_router(authors.router)
