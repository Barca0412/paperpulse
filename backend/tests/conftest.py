"""pytest fixtures shared across the backend test suite."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from paperpulse import config as config_module
from paperpulse import db
from paperpulse.main import create_app

_KNOWN_CONFIG_FILES = [
    "sources",
    "keywords",
    "seeds",
    "topics",
    "institutions",
    "authors",
    "tiers",
    "conferences",
    "app",
]


@pytest.fixture(autouse=True)
def isolate_runtime(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Each test gets its own data dir, config dir, and DB connection."""
    data = tmp_path / "data"
    cfg = tmp_path / "config"
    cfg.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("PAPERPULSE_DATA_DIR", str(data))
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(cfg))

    # Seed each known config file with an empty mapping so loaders don't warn.
    for name in _KNOWN_CONFIG_FILES:
        (cfg / f"{name}.yml").write_text("{}\n", encoding="utf-8")

    db.duckdb_client.reset_connection()
    config_module.reset_store()
    yield data
    config_module.reset_store()
    db.duckdb_client.reset_connection()


@pytest.fixture
def app() -> FastAPI:
    return create_app()


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c
