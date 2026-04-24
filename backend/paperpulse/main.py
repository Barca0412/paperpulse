"""FastAPI entry-point for the PaperPulse Python sidecar.

Run directly:
    uv run uvicorn paperpulse.main:app --host 127.0.0.1 --port 8765
or from Tauri (production):
    Rust spawns the bundled binary with the same args.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from paperpulse.api.router import api_router
from paperpulse.logging_setup import get_logger, setup_logging

setup_logging()
_log = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    from paperpulse.config import get_store

    store = get_store()
    store.start_watching()
    try:
        yield
    finally:
        store.stop_watching()


def create_app() -> FastAPI:
    app = FastAPI(
        title="PaperPulse Sidecar",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:1420", "tauri://localhost"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    @app.exception_handler(Exception)
    async def _unhandled(_req: Request, exc: Exception) -> JSONResponse:
        _log.exception("unhandled exception", error=repr(exc))
        return JSONResponse(
            status_code=500,
            content={"error": "internal_error", "detail": str(exc)},
        )

    return app


app = create_app()


def main() -> None:
    """Entrypoint used when invoked as ``uv run python -m paperpulse.main``."""
    import uvicorn

    uvicorn.run(
        "paperpulse.main:app",
        host="127.0.0.1",
        port=8765,
        log_level="info",
    )


if __name__ == "__main__":
    main()
