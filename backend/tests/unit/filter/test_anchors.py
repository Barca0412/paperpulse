"""Anchor & keyword loaders built on top of ConfigStore.

Cached accessors that rebuild on YAML reload.
"""
from __future__ import annotations

from pathlib import Path

from paperpulse.config import ConfigStore
from paperpulse.filter.anchors import load_keywords, load_tier_a_venues


def _seed(cfg_dir: Path, name: str, contents: str) -> None:
    (cfg_dir / f"{name}.yml").write_text(contents, encoding="utf-8")


def test_load_keywords_from_store(isolate_runtime: Path) -> None:
    cfg_dir = isolate_runtime.parent / "config"
    _seed(
        cfg_dir,
        "keywords",
        "positive:\n"
        "  cs_core: [\"LLM\"]\n"
        "  finance_core: [\"asset pricing\"]\n"
        "  crosscut: []\n"
        "strong_negative: [\"image classification\"]\n"
        "weak_negative: []\n"
        "immune: [\"finance\"]\n",
    )
    _seed(
        cfg_dir,
        "tiers",
        "tier_rules:\n  A:\n    venues: [\"NeurIPS\"]\n    auto_include: true\n",
    )

    store = ConfigStore()
    store.load_all()

    kws = load_keywords(store)
    assert kws.positive_cs_core == ["LLM"]
    assert kws.positive_finance_core == ["asset pricing"]
    assert kws.immune == ["finance"]
    assert kws.strong_negative == ["image classification"]

    venues = load_tier_a_venues(store)
    assert "NeurIPS" in venues


def test_load_keywords_with_empty_yaml(isolate_runtime: Path) -> None:
    # Default fixture seeds each yml with "{}\n" — loaders must survive.
    store = ConfigStore()
    store.load_all()
    kws = load_keywords(store)
    assert kws.positive_cs_core == []
    assert kws.immune == []
    assert load_tier_a_venues(store) == set()
