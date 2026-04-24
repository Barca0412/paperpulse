"""L2 semantic filter. Pure numpy function per spec §10.2.

Receives already-embedded paper vector + anchor matrix. No DB, no config
loading — callers fetch those and pass them in.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np


@dataclass
class L2Config:
    similarity_threshold: float = 0.45


def _cosine(query: np.ndarray, anchors: np.ndarray) -> np.ndarray:
    # Inputs are expected L2-normalized → cosine == dot product.
    result: np.ndarray = anchors @ query
    return result


def level2_filter(
    paper_vec: np.ndarray,
    anchor_vectors: np.ndarray,
    anchor_weights: np.ndarray,
    anchor_labels: Sequence[str],
    *,
    text: str,
    keywords_strong_negative: Sequence[str],
    keywords_weak_negative: Sequence[str],
    keywords_immune: Sequence[str],
    config: L2Config,
) -> tuple[bool, float, str | None]:
    """Return (passed, score, best_label).

    Empty anchor set returns (False, 0.0, None).
    """
    if anchor_vectors.size == 0:
        return False, 0.0, None

    sims = _cosine(paper_vec, anchor_vectors) * anchor_weights

    low = text.lower()
    immune = any(w.lower() in low for w in keywords_immune)
    if not immune:
        if any(w.lower() in low for w in keywords_strong_negative):
            sims = sims * 0.3
        elif any(w.lower() in low for w in keywords_weak_negative):
            sims = sims * 0.7

    idx = int(sims.argmax())
    max_sim = float(sims[idx])
    label = anchor_labels[idx] if anchor_labels else None
    return (max_sim >= config.similarity_threshold, max_sim, label)
