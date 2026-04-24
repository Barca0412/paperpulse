"""Loaders that translate ConfigStore YAML into typed filter inputs.

YAML-only loaders (keywords, venues) stay cheap and pure.
AnchorCache holds embedded seeds + topics in memory, rebuilt when
seeds.yml or topics.yml changes.
"""
from __future__ import annotations

import datetime as _dt
import logging
import math
from typing import Any

import numpy as np

from paperpulse.config import ConfigStore
from paperpulse.filter import embedding as _emb
from paperpulse.filter.keywords import Keywords
from paperpulse.filter.tiers import BScore, TierRules

_log = logging.getLogger(__name__)


def load_keywords(store: ConfigStore) -> Keywords:
    cfg = store.get("keywords") or {}
    pos = cfg.get("positive") or {}
    return Keywords(
        positive_cs_core=list(pos.get("cs_core") or []),
        positive_finance_core=list(pos.get("finance_core") or []),
        positive_crosscut=list(pos.get("crosscut") or []),
        strong_negative=list(cfg.get("strong_negative") or []),
        weak_negative=list(cfg.get("weak_negative") or []),
        immune=list(cfg.get("immune") or []),
    )


def load_tier_a_venues(store: ConfigStore) -> set[str]:
    cfg = store.get("tiers") or {}
    venues = (cfg.get("tier_rules") or {}).get("A", {}).get("venues") or []
    return set(venues)


def load_tier_rules(store: ConfigStore) -> TierRules:
    cfg = (store.get("tiers") or {}).get("tier_rules") or {}
    a = cfg.get("A") or {}
    b = cfg.get("B_score") or {}
    return TierRules(
        A_venues=set(a.get("venues") or []),
        B=BScore(
            weights=dict(b.get("weights") or {}),
            threshold=float(b.get("threshold") or 0.5),
        ),
    )


def _effective_weight(seed: dict[str, Any]) -> float:
    base = float(seed.get("base_weight") or 1.0)
    hl = seed.get("half_life_days")
    added = seed.get("added_at")
    if hl is None or added is None:
        return base
    try:
        added_dt = _dt.datetime.fromisoformat(str(added))
    except (TypeError, ValueError):
        return base
    if added_dt.tzinfo is None:
        added_dt = added_dt.replace(tzinfo=_dt.UTC)
    age = (_dt.datetime.now(_dt.UTC) - added_dt).days
    return base * math.exp(-math.log(2) * age / float(hl))


class AnchorCache:
    """In-memory store of seed + topic embeddings + weights.

    Rebuilt on seeds.yml / topics.yml change. Access is O(1); rebuild
    embeds ~10-50 items in one batch call (<1s on CPU).
    """

    def __init__(self, store: ConfigStore) -> None:
        self._store = store
        self._vectors: np.ndarray = np.zeros((0, 1024), dtype=np.float32)
        self._weights: np.ndarray = np.zeros((0,), dtype=np.float32)
        self._labels: list[str] = []
        self._label_types: list[str] = []  # "seed" | "topic"

    def rebuild(self) -> None:
        topics = (self._store.get("topics") or {}).get("topics") or []
        seeds = self._store.get("seeds") or {}
        seed_papers = seeds.get("seed_papers") or []
        user_must = seeds.get("user_must_read_papers") or []

        texts: list[str] = []
        labels: list[str] = []
        label_types: list[str] = []
        weights: list[float] = []

        for t in topics:
            parts = [
                str(t.get("name") or ""),
                str(t.get("description_en") or ""),
                str(t.get("description_zh") or ""),
            ]
            texts.append("\n".join(p for p in parts if p))
            labels.append(str(t.get("slug") or t.get("name") or "?"))
            label_types.append("topic")
            weights.append(float(t.get("weight") or 1.0))

        for s in seed_papers:
            title = str(s.get("title") or "")
            abstract = str(s.get("abstract") or "")
            texts.append(_emb.paper_input_text(title, abstract))
            label_id = s.get("id") or title[:40]
            labels.append(f"seed:{label_id}")
            label_types.append("seed")
            weights.append(float(s.get("base_weight") or 1.0))

        for s in user_must:
            title = str(s.get("title") or "")
            abstract = str(s.get("abstract") or "")
            texts.append(_emb.paper_input_text(title, abstract))
            label_id = s.get("id") or title[:40]
            labels.append(f"user_seed:{label_id}")
            label_types.append("seed")
            weights.append(_effective_weight(s))

        if texts:
            self._vectors = _emb.embed(texts)
        else:
            self._vectors = np.zeros((0, 1024), dtype=np.float32)
        self._weights = np.asarray(weights, dtype=np.float32)
        self._labels = labels
        self._label_types = label_types
        _log.info(
            "AnchorCache rebuilt: %d topics + %d seeds",
            sum(1 for t in self._label_types if t == "topic"),
            sum(1 for t in self._label_types if t == "seed"),
        )

    def topic_labels(self) -> list[str]:
        return [
            label
            for label, t in zip(self._labels, self._label_types, strict=True)
            if t == "topic"
        ]

    def vectors_for_scoring(self) -> np.ndarray:
        return self._vectors

    def weights_for_scoring(self) -> np.ndarray:
        return self._weights

    def labels(self) -> list[str]:
        return self._labels

    def label_types(self) -> list[str]:
        return self._label_types
