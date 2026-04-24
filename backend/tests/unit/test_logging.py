"""Logging setup is idempotent and produces JSON output."""

from __future__ import annotations

import io
import json
import logging
import sys

import pytest

from paperpulse.logging_setup import get_logger, setup_logging


def test_setup_logging_is_idempotent() -> None:
    setup_logging("DEBUG")
    setup_logging("INFO")
    log = get_logger("test")
    log.info("hello", k=1)


def test_logger_emits_json_with_event(monkeypatch: pytest.MonkeyPatch) -> None:
    buf = io.StringIO()
    monkeypatch.setattr(sys, "stderr", buf)
    setup_logging("INFO")
    log = get_logger("smoke")
    log.info("hello", payload="x")
    out = buf.getvalue().strip().splitlines()[-1]
    parsed = json.loads(out)
    assert parsed["event"] == "hello"
    assert parsed["payload"] == "x"
    assert parsed["level"] == "info"
    # cleanup: reset root logger so other tests aren't affected
    logging.getLogger().handlers.clear()
