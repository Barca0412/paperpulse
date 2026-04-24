"""Thin wrapper around a DuckDB connection with schema bootstrapping."""

from __future__ import annotations

import logging
from pathlib import Path
from threading import Lock
from typing import Any

import duckdb

from paperpulse.paths import duckdb_path

_log = logging.getLogger(__name__)
_SCHEMA_FILE = Path(__file__).parent / "schema.sql"
_lock = Lock()
_conn: duckdb.DuckDBPyConnection | None = None


def get_connection() -> duckdb.DuckDBPyConnection:
    """Return a singleton DuckDB connection. Schema is applied lazily on first call."""
    global _conn
    with _lock:
        if _conn is None:
            path = duckdb_path()
            _log.info("opening duckdb at %s", path)
            _conn = duckdb.connect(str(path))
            _apply_schema(_conn)
        return _conn


def reset_connection() -> None:
    """Test-only helper to drop the singleton (lets tests use temp paths)."""
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
        _conn = None


def _apply_schema(conn: duckdb.DuckDBPyConnection) -> None:
    sql = _SCHEMA_FILE.read_text(encoding="utf-8")
    for stmt in (s.strip() for s in sql.split(";")):
        if stmt:
            conn.execute(stmt)


def execute(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> Any:
    return get_connection().execute(sql, params or [])


def fetchall(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> list[tuple[Any, ...]]:
    rows: list[tuple[Any, ...]] = execute(sql, params).fetchall()
    return rows
