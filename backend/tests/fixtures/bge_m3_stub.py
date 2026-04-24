"""Deterministic fake of bge-m3 for unit tests.

Hashes tokens into a sparse 1024-dim vector then L2-normalizes. Same text
always yields the same vector; texts sharing tokens have nonzero cosine
similarity. Enough to exercise the L2 filter without paying the 1.2GB
bge-m3 download cost in CI.
"""
from __future__ import annotations

import hashlib
from collections.abc import Sequence

import numpy as np


class StubEmbedder:
    DIM = 1024

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        out = np.zeros((len(texts), self.DIM), dtype=np.float32)
        for i, t in enumerate(texts):
            tokens = t.lower().split()
            for tok in tokens:
                h = int.from_bytes(hashlib.sha1(tok.encode()).digest()[:4], "big")
                out[i, h % self.DIM] += 1.0
            n = float(np.linalg.norm(out[i]))
            if n > 0:
                out[i] /= n
            else:
                out[i, 0] = 1.0
        return out
