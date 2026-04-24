"""Embedding service — unit tests use the deterministic stub.

Real bge-m3 lives in tests/integration/test_real_embedding_smoke.py,
marked @pytest.mark.slow and skipped unless PAPERPULSE_RUN_SLOW=1.
"""
from __future__ import annotations

import numpy as np

from paperpulse.filter import embedding
from tests.fixtures.bge_m3_stub import StubEmbedder


def test_stub_is_deterministic() -> None:
    stub = StubEmbedder()
    v1 = stub.embed(["hello world"])[0]
    v2 = stub.embed(["hello world"])[0]
    assert np.allclose(v1, v2)


def test_stub_normalizes_to_unit_length() -> None:
    stub = StubEmbedder()
    v = stub.embed(["LLM agent trading"])[0]
    assert abs(float(np.linalg.norm(v)) - 1.0) < 1e-4


def test_stub_distinguishes_topics() -> None:
    stub = StubEmbedder()
    llm_vec = stub.embed(["LLM agent trading"])[0]
    cv_vec = stub.embed(["image recognition benchmark"])[0]
    # Disjoint token sets → orthogonal
    cos = float(np.dot(llm_vec, cv_vec))
    assert cos < 0.5


def test_service_uses_injected_backend(monkeypatch) -> None:
    stub = StubEmbedder()
    monkeypatch.setattr(embedding, "_backend", stub)
    v = embedding.embed(["test"])
    assert v.shape == (1, 1024)


def test_empty_input_returns_empty_array(monkeypatch) -> None:
    monkeypatch.setattr(embedding, "_backend", StubEmbedder())
    v = embedding.embed([])
    assert v.shape == (0, 1024)


def test_text_hash_is_stable() -> None:
    h1 = embedding.text_hash("The quick brown fox")
    h2 = embedding.text_hash("The quick brown fox")
    assert h1 == h2
    assert h1 != embedding.text_hash("different")


def test_paper_input_text_truncates_abstract() -> None:
    long = "x" * 5000
    text = embedding.paper_input_text("Title", long)
    # title + "\n\n" + first 1500 chars
    assert text.startswith("Title\n\n")
    assert len(text) == len("Title\n\n") + 1500


def test_paper_input_text_handles_none_abstract() -> None:
    text = embedding.paper_input_text("Title only", None)
    assert text == "Title only\n\n"
