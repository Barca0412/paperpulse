"""ConfigStore: load + reload + watcher."""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from paperpulse.config import ConfigStore


def _write(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")


def test_load_all_reads_known_yaml_files(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(tmp_path))
    _write(tmp_path / "app.yml", "schedule:\n  daily_ingest_time: '07:30'\n")
    _write(tmp_path / "sources.yml", "sources: {arxiv: {enabled: true}}\n")
    for name in [
        "keywords",
        "seeds",
        "topics",
        "institutions",
        "authors",
        "tiers",
        "conferences",
    ]:
        _write(tmp_path / f"{name}.yml", "{}\n")

    store = ConfigStore()
    store.load_all()

    assert store.app["schedule"]["daily_ingest_time"] == "07:30"
    assert store.sources["sources"]["arxiv"]["enabled"] is True


def test_reload_updates_in_memory_value(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(tmp_path))
    for name in [
        "sources",
        "keywords",
        "seeds",
        "topics",
        "institutions",
        "authors",
        "tiers",
        "conferences",
        "app",
    ]:
        _write(tmp_path / f"{name}.yml", "{}\n")
    store = ConfigStore()
    store.load_all()
    assert store.app == {}

    _write(tmp_path / "app.yml", "schedule: {daily_ingest_time: '08:00'}\n")
    store.reload("app")
    assert store.app["schedule"]["daily_ingest_time"] == "08:00"


def test_subscriber_fires_on_file_change(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(tmp_path))
    for name in [
        "sources",
        "keywords",
        "seeds",
        "topics",
        "institutions",
        "authors",
        "tiers",
        "conferences",
        "app",
    ]:
        _write(tmp_path / f"{name}.yml", "{}\n")
    store = ConfigStore()
    store.load_all()
    notified: list[str] = []
    store.subscribe(notified.append)
    store.start_watching()
    try:
        _write(tmp_path / "app.yml", "x: 1\n")
        # Watchdog uses inotify/FSEvents; allow time for the event to bubble.
        for _ in range(40):
            if "app" in notified:
                break
            time.sleep(0.1)
    finally:
        store.stop_watching()
    assert "app" in notified
    assert store.app == {"x": 1}
