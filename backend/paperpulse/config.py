"""YAML config loader with hot-reload via watchdog.

Public surface:
    cfg = ConfigStore()
    cfg.load_all()                   # populate
    cfg.start_watching()             # begin watching config_dir() for changes
    cfg.app                           # parsed app.yml as dict
    cfg.subscribe(lambda name: ...)  # called when a config file changes
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

import yaml
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from paperpulse.paths import config_dir

_log = logging.getLogger(__name__)

_KNOWN_FILES = {
    "sources",
    "keywords",
    "seeds",
    "topics",
    "institutions",
    "authors",
    "tiers",
    "conferences",
    "app",
}


class ConfigStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._values: dict[str, dict[str, Any]] = {}
        self._subscribers: list[Callable[[str], None]] = []
        self._observer: Any = None

    # --- loading ----------------------------------------------------

    def load_all(self) -> None:
        with self._lock:
            for name in _KNOWN_FILES:
                self._load_one(name)

    def reload(self, name: str) -> None:
        if name not in _KNOWN_FILES:
            _log.debug("ignoring unknown config file: %s", name)
            return
        with self._lock:
            self._load_one(name)
        for cb in list(self._subscribers):
            try:
                cb(name)
            except Exception:
                _log.exception("config subscriber raised on reload of %s", name)

    def _load_one(self, name: str) -> None:
        path = config_dir() / f"{name}.yml"
        if not path.exists():
            _log.warning("config file missing: %s", path)
            self._values[name] = {}
            return
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        if not isinstance(data, dict):
            raise ValueError(f"{path}: top-level must be a mapping, got {type(data)}")
        self._values[name] = data
        _log.info("loaded config %s (%d top-level keys)", name, len(data))

    # --- accessors --------------------------------------------------

    def get(self, name: str) -> dict[str, Any]:
        with self._lock:
            return dict(self._values.get(name, {}))

    @property
    def app(self) -> dict[str, Any]:
        return self.get("app")

    @property
    def sources(self) -> dict[str, Any]:
        return self.get("sources")

    # --- watching ---------------------------------------------------

    def subscribe(self, cb: Callable[[str], None]) -> None:
        self._subscribers.append(cb)

    def start_watching(self) -> None:
        if self._observer is not None:
            return
        observer = Observer()
        observer.schedule(_Handler(self), str(config_dir()), recursive=False)
        observer.start()
        self._observer = observer
        _log.info("config watcher started on %s", config_dir())

    def stop_watching(self) -> None:
        if self._observer is not None:
            self._observer.stop()
            self._observer.join(timeout=2)
            self._observer = None


class _Handler(FileSystemEventHandler):
    def __init__(self, store: ConfigStore) -> None:
        self.store = store

    def _maybe_reload(self, path: str) -> None:
        p = Path(path)
        if p.suffix == ".yml" and p.stem in _KNOWN_FILES:
            self.store.reload(p.stem)

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._maybe_reload(str(event.src_path))

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._maybe_reload(str(event.src_path))


# Process-wide singleton, lazily initialised.
_store: ConfigStore | None = None


def get_store() -> ConfigStore:
    global _store
    if _store is None:
        _store = ConfigStore()
        _store.load_all()
    return _store


def reset_store() -> None:
    """Test helper."""
    global _store
    if _store is not None:
        _store.stop_watching()
    _store = None
