"""L2 semantic filter pure-function tests. Spec §10.2."""
from __future__ import annotations

import numpy as np

from paperpulse.filter.semantic import L2Config, level2_filter


def test_semantic_match_above_threshold() -> None:
    paper_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    anchors = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    weights = np.array([1.0], dtype=np.float32)
    ok, score, label = level2_filter(
        paper_vec,
        anchors,
        weights,
        ["topic:llm"],
        text="some llm paper",
        keywords_strong_negative=[],
        keywords_weak_negative=[],
        keywords_immune=[],
        config=L2Config(similarity_threshold=0.5),
    )
    assert ok is True
    assert score >= 0.99
    assert label == "topic:llm"


def test_below_threshold_fails() -> None:
    paper_vec = np.array([1.0, 0.0], dtype=np.float32)
    anchors = np.array([[0.0, 1.0]], dtype=np.float32)  # orthogonal
    weights = np.array([1.0], dtype=np.float32)
    ok, score, _ = level2_filter(
        paper_vec,
        anchors,
        weights,
        ["topic:other"],
        text="",
        keywords_strong_negative=[],
        keywords_weak_negative=[],
        keywords_immune=[],
        config=L2Config(similarity_threshold=0.5),
    )
    assert ok is False
    assert score < 0.5


def test_strong_negative_penalizes_x0p3() -> None:
    paper_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    anchors = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    weights = np.array([1.0], dtype=np.float32)
    ok, score, _ = level2_filter(
        paper_vec,
        anchors,
        weights,
        ["topic:llm"],
        text="we benchmark an image classification dataset",
        keywords_strong_negative=["image classification"],
        keywords_weak_negative=[],
        keywords_immune=[],
        config=L2Config(similarity_threshold=0.5),
    )
    assert abs(score - 0.3) < 1e-4
    assert ok is False


def test_weak_negative_penalizes_x0p7() -> None:
    paper_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    anchors = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    weights = np.array([1.0], dtype=np.float32)
    _, score, _ = level2_filter(
        paper_vec,
        anchors,
        weights,
        ["topic:llm"],
        text="a paper about recommender systems",
        keywords_strong_negative=[],
        keywords_weak_negative=["recommender system"],
        keywords_immune=[],
        config=L2Config(similarity_threshold=0.5),
    )
    assert abs(score - 0.7) < 1e-4


def test_immune_overrides_negative() -> None:
    paper_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    anchors = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    weights = np.array([1.0], dtype=np.float32)
    ok, score, _ = level2_filter(
        paper_vec,
        anchors,
        weights,
        ["topic:llm"],
        text="image classification in finance",
        keywords_strong_negative=["image classification"],
        keywords_weak_negative=[],
        keywords_immune=["finance"],
        config=L2Config(similarity_threshold=0.5),
    )
    assert ok is True
    assert score >= 0.99


def test_weight_scales_score() -> None:
    paper_vec = np.array([1.0, 0.0], dtype=np.float32)
    anchors = np.array([[1.0, 0.0]], dtype=np.float32)
    weights = np.array([1.5], dtype=np.float32)
    _, score, _ = level2_filter(
        paper_vec,
        anchors,
        weights,
        ["topic:boost"],
        text="",
        keywords_strong_negative=[],
        keywords_weak_negative=[],
        keywords_immune=[],
        config=L2Config(similarity_threshold=0.5),
    )
    assert abs(score - 1.5) < 1e-4


def test_empty_anchors_returns_false_zero() -> None:
    ok, score, label = level2_filter(
        np.array([1.0], dtype=np.float32),
        np.zeros((0, 1), dtype=np.float32),
        np.zeros((0,), dtype=np.float32),
        [],
        text="",
        keywords_strong_negative=[],
        keywords_weak_negative=[],
        keywords_immune=[],
        config=L2Config(similarity_threshold=0.5),
    )
    assert ok is False
    assert score == 0.0
    assert label is None


def test_best_label_returned() -> None:
    paper_vec = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    anchors = np.array(
        [
            [0.5, 0.5, 0.0],
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
        ],
        dtype=np.float32,
    )
    weights = np.array([1.0, 1.0, 1.0], dtype=np.float32)
    labels = ["weak", "exact", "orthogonal"]
    _, _, label = level2_filter(
        paper_vec,
        anchors,
        weights,
        labels,
        text="",
        keywords_strong_negative=[],
        keywords_weak_negative=[],
        keywords_immune=[],
        config=L2Config(similarity_threshold=0.3),
    )
    assert label == "exact"
