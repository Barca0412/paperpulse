"""LanceDB connection. Phase 1 only opens the DB; tables are created in Phase 3."""

from __future__ import annotations

import logging
from typing import Any

import lancedb  # type: ignore[import-untyped]

from paperpulse.paths import lancedb_path

_log = logging.getLogger(__name__)
_db: Any = None


def get_db() -> Any:
    global _db
    if _db is None:
        path = lancedb_path()
        _log.info("opening lancedb at %s", path)
        _db = lancedb.connect(str(path))
    return _db
