"""Smoke tests for the public HTTP surface."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_hello_returns_ok(client: TestClient) -> None:
    resp = client.get("/api/v1/hello")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"]
