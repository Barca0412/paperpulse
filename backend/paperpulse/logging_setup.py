"""structlog configuration for the sidecar.

Calling ``setup_logging()`` once at startup is idempotent. JSON output goes
to stderr so it is easy to grep, redirect, or attach to Tauri logs.
"""

from __future__ import annotations

import logging
import os
import sys
from typing import Any

import structlog


def setup_logging(level: str | None = None) -> None:
    lvl_name = (level or os.environ.get("PAPERPULSE_LOG_LEVEL", "INFO")).upper()
    lvl = getattr(logging, lvl_name, logging.INFO)

    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        timestamper,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(lvl),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
        cache_logger_on_first_use=True,
    )

    # Bridge stdlib logging into structlog so libraries (uvicorn, watchdog)
    # also flow through (formatted as JSON for grep-ability).
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(
        logging.Formatter(
            fmt='{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)r}',
            datefmt="%Y-%m-%dT%H:%M:%SZ",
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(lvl)


def get_logger(name: str | None = None) -> Any:
    return structlog.get_logger(name)
