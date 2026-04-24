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


def test_anchor_cache_embeds_topics_and_seeds(
    isolate_runtime: Path, monkeypatch
) -> None:
    from paperpulse.filter import embedding as emb_module
    from paperpulse.filter.anchors import AnchorCache
    from tests.fixtures.bge_m3_stub import StubEmbedder

    monkeypatch.setattr(emb_module, "_backend", StubEmbedder())

    cfg_dir = isolate_runtime.parent / "config"
    _seed(
        cfg_dir,
        "topics",
        "topics:\n"
        "  - name: \"LLM Agents for Finance\"\n"
        "    slug: \"llm-agents-finance\"\n"
        "    side: \"crosscut\"\n"
        "    description_en: \"Agents trading with LLMs\"\n"
        "    description_zh: \"LLM 交易 agent\"\n"
        "    weight: 1.5\n",
    )
    _seed(
        cfg_dir,
        "seeds",
        "seed_papers:\n"
        "  - id: s1\n    title: \"Deep hedging\"\n    abstract: \"policy network\"\n"
        "    base_weight: 1.0\n"
        "user_must_read_papers: []\n"
        "seed_meta: {}\n",
    )

    store = ConfigStore()
    store.load_all()
    cache = AnchorCache(store)
    cache.rebuild()

    assert "llm-agents-finance" in cache.topic_labels()
    assert any(label.startswith("seed:") for label in cache.labels())
    vecs = cache.vectors_for_scoring()
    assert vecs.shape == (2, 1024)  # 1 topic + 1 seed
    weights = cache.weights_for_scoring()
    assert len(weights) == 2
    # Topic weight 1.5, seed weight 1.0 preserved in order
    assert weights[0] == 1.5
    assert weights[1] == 1.0


def test_anchor_cache_handles_empty_yaml(
    isolate_runtime: Path, monkeypatch
) -> None:
    from paperpulse.filter import embedding as emb_module
    from paperpulse.filter.anchors import AnchorCache
    from tests.fixtures.bge_m3_stub import StubEmbedder

    monkeypatch.setattr(emb_module, "_backend", StubEmbedder())

    store = ConfigStore()
    store.load_all()
    cache = AnchorCache(store)
    cache.rebuild()
    assert cache.vectors_for_scoring().shape == (0, 1024)
    assert cache.labels() == []
