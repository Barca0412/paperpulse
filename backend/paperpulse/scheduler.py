"""APScheduler wrapper.

Phase 2 only registers the affiliation retry job (every 4h).
Phase 3+ will add daily ingest, weekly digest, signal refresh, etc. per spec §15.
"""

from __future__ import annotations

import logging
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore[import-untyped]
from apscheduler.triggers.interval import IntervalTrigger  # type: ignore[import-untyped]

from paperpulse.entity.affiliation_pipeline import process_retry_queue

_log = logging.getLogger(__name__)
_sched: Any = None


def start() -> None:
    global _sched
    if _sched is not None:
        return
    s = BackgroundScheduler(timezone="Asia/Singapore")
    s.add_job(process_retry_queue, IntervalTrigger(hours=4), id="affiliation_retry")
    s.start()
    _sched = s
    _log.info("scheduler started (affiliation_retry every 4h)")


def stop() -> None:
    global _sched
    if _sched is not None:
        try:
            _sched.shutdown(wait=False)
        except Exception:
            _log.exception("scheduler shutdown failed")
        _sched = None
