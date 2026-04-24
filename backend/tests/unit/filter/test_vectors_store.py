"""LanceDB paper_vectors cache round-trip."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from paperpulse.filter.vectors_store import PaperVectorStore


def test_store_roundtrip(isolate_runtime: Path) -> None:
    store = PaperVectorStore()
    vec = np.random.rand(1024).astype(np.float32)
    store.put("paper_abc", "hash1", vec)
    got = store.get("paper_abc")
    assert got is not None
    assert got.paper_id == "paper_abc"
    assert got.text_hash == "hash1"
    assert got.vector.shape == (1024,)
    assert np.allclose(got.vector, vec, atol=1e-5)


def test_store_miss_returns_none(isolate_runtime: Path) -> None:
    store = PaperVectorStore()
    assert store.get("nonexistent") is None


def test_store_upsert_replaces(isolate_runtime: Path) -> None:
    store = PaperVectorStore()
    v1 = np.ones(1024, dtype=np.float32)
    v2 = np.zeros(1024, dtype=np.float32)
    v2[0] = 1.0
    store.put("p1", "h1", v1)
    store.put("p1", "h2", v2)  # update
    got = store.get("p1")
    assert got is not None
    assert got.text_hash == "h2"
    assert np.allclose(got.vector, v2, atol=1e-5)
