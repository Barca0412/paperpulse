"""Filesystem paths for runtime data and config.

In dev: paths point to repo-relative dirs (config/, data/) so changes are visible.
In production (Tauri bundle): the sidecar receives PAPERPULSE_DATA_DIR /
PAPERPULSE_CONFIG_DIR env vars from Rust pointing to ~/Library/Application
Support/PaperPulse/.
"""

from __future__ import annotations

import os
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def config_dir() -> Path:
    env = os.environ.get("PAPERPULSE_CONFIG_DIR")
    return Path(env) if env else repo_root() / "config"


def data_dir() -> Path:
    env = os.environ.get("PAPERPULSE_DATA_DIR")
    p = Path(env) if env else repo_root() / "data"
    p.mkdir(parents=True, exist_ok=True)
    return p


def duckdb_path() -> Path:
    return data_dir() / "paperpulse.duckdb"


def lancedb_path() -> Path:
    return data_dir() / "papers.lance"


def models_dir() -> Path:
    env = os.environ.get("PAPERPULSE_MODELS_DIR")
    base = Path(env).expanduser() if env else Path.home() / ".paperpulse" / "models"
    base.mkdir(parents=True, exist_ok=True)
    return base
