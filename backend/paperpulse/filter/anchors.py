"""Loaders that translate ConfigStore YAML into typed filter inputs.

Seed/topic embedding cache arrives in PR #3.2 (embedding infrastructure);
this file starts with cheap YAML-only loaders (keywords, venues, tier rules).
AnchorCache (with embeddings) is appended once embedding.py exists.
"""
from __future__ import annotations

from paperpulse.config import ConfigStore
from paperpulse.filter.keywords import Keywords


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
