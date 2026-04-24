"""Drives a Source through fetch → upsert → record run."""

from __future__ import annotations

import logging
from datetime import datetime

from paperpulse.ingest.base import Source
from paperpulse.ingest.dedup import record_run, upsert_raw

_log = logging.getLogger(__name__)


def run_source(source: Source) -> tuple[int, int]:
    """Fetch all papers from ``source`` and upsert. Returns ``(fetched, new)``."""
    started = datetime.now()
    fetched = 0
    new = 0
    error: str | None = None
    status = "success"
    try:
        for raw in source.fetch():
            fetched += 1
            _, is_new = upsert_raw(raw)
            if is_new:
                new += 1
    except Exception as e:
        _log.exception("ingest run failed for source=%s", source.name)
        error = repr(e)
        status = "failed"
    record_run(
        source.name,
        started_at=started,
        finished_at=datetime.now(),
        status=status,
        papers_fetched=fetched,
        papers_new=new,
        error_message=error,
    )
    return fetched, new
