"""pytest fixtures shared across the backend test suite."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from paperpulse import db
from paperpulse.main import create_app


@pytest.fixture(autouse=True)
def isolate_runtime(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Each test gets its own data dir + DuckDB connection."""
    data = tmp_path / "data"
    monkeypatch.setenv("PAPERPULSE_DATA_DIR", str(data))
    db.duckdb_client.reset_connection()
    yield data
    db.duckdb_client.reset_connection()


@pytest.fixture
def app() -> FastAPI:
    return create_app()


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c
