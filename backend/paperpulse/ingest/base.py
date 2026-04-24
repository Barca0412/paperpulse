"""Source abstraction matching SPEC §8.1.

Each ingest source implements ``Source`` and yields ``RawPaper`` instances.
A ``RawPaper`` is the lossless extraction from one upstream record;
normalization into the ``papers`` row happens later in the pipeline.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class RawPaper:
    source: str
    source_id: str
    title: str
    abstract: str | None
    authors_raw: list[dict[str, Any]]
    venue_raw: str | None = None
    published_at: datetime | None = None
    updated_at: datetime | None = None
    doi: str | None = None
    arxiv_id: str | None = None
    pdf_url: str | None = None
    html_url: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


class Source(ABC):
    """Marker interface for a single upstream catalogue."""

    name: str

    @abstractmethod
    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]:
        """Yield ``RawPaper`` instances published >= ``since`` (best-effort)."""

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if the upstream is reachable and parseable."""
