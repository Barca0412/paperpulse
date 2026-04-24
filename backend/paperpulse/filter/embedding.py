"""bge-m3 ONNX embedding service.

Lazy-loaded singleton. ``embed(texts)`` returns shape (N, 1024) float32,
L2-normalized. Unit tests inject a stub via ``monkeypatch.setattr(embedding,
"_backend", stub)``.

Model download: first call fetches ``aapot/bge-m3-onnx`` to ``models_dir()``.
Blocking with logged progress — sidecar startup pauses ~30-60s on first launch
(1.2GB model + optional CoreML compile). Set ``PAPERPULSE_EMBED_PROVIDER=cpu``
to force the CPU provider.
"""
from __future__ import annotations

import hashlib
import logging
import os
from collections.abc import Sequence
from pathlib import Path
from typing import Protocol

import numpy as np

from paperpulse.paths import models_dir

_log = logging.getLogger(__name__)
_DIM = 1024
_MODEL_REPO = "aapot/bge-m3-onnx"
_MODEL_FILE = "model.onnx"
_TOKENIZER_FILE = "tokenizer.json"


class _EmbedBackend(Protocol):
    def embed(self, texts: Sequence[str]) -> np.ndarray: ...


class _OnnxBackend:
    def __init__(self) -> None:
        import onnxruntime as ort
        from tokenizers import Tokenizer

        model_dir = models_dir() / "bge-m3"
        model_dir.mkdir(parents=True, exist_ok=True)
        model_path = model_dir / _MODEL_FILE
        tok_path = model_dir / _TOKENIZER_FILE

        if not model_path.exists() or not tok_path.exists():
            self._download(model_dir)

        providers: list[str] = []
        if os.environ.get("PAPERPULSE_EMBED_PROVIDER") != "cpu":
            providers.append("CoreMLExecutionProvider")
        providers.append("CPUExecutionProvider")
        _log.info("loading bge-m3 ONNX, providers=%s", providers)
        self._session = ort.InferenceSession(str(model_path), providers=providers)
        self._tokenizer = Tokenizer.from_file(str(tok_path))
        self._tokenizer.enable_padding()
        self._tokenizer.enable_truncation(max_length=8192)

    @staticmethod
    def _download(model_dir: Path) -> None:
        from huggingface_hub import hf_hub_download

        _log.info("downloading bge-m3 ONNX to %s (one-time, ~1.2GB)", model_dir)
        for f in (_MODEL_FILE, _TOKENIZER_FILE):
            hf_hub_download(
                repo_id=_MODEL_REPO,
                filename=f,
                local_dir=str(model_dir),
            )

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, _DIM), dtype=np.float32)
        encs = self._tokenizer.encode_batch(list(texts))
        input_ids = np.array([e.ids for e in encs], dtype=np.int64)
        attention_mask = np.array([e.attention_mask for e in encs], dtype=np.int64)
        outputs = self._session.run(
            None,
            {"input_ids": input_ids, "attention_mask": attention_mask},
        )
        emb = outputs[0].astype(np.float32)
        norms = np.linalg.norm(emb, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return emb / norms


_backend: _EmbedBackend | None = None


def _get_backend() -> _EmbedBackend:
    global _backend
    if _backend is None:
        _backend = _OnnxBackend()
    return _backend


def embed(texts: Sequence[str]) -> np.ndarray:
    """Return (N, 1024) L2-normalized embeddings."""
    return _get_backend().embed(list(texts))


def warmup() -> None:
    """Pay download + CoreML compile cost eagerly (called from sidecar startup)."""
    _get_backend().embed(["warmup"])


def text_hash(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def paper_input_text(title: str, abstract: str | None) -> str:
    return f"{title}\n\n{(abstract or '')[:1500]}"
