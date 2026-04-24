"""arXiv source — parses the Atom feed returned by export.arxiv.org/api/query.

Spec §8.2: 3-second polite delay + record updated high-watermark + ar5iv URL.
We use stdlib xml.etree to avoid pulling in lxml.

Note: arxiv.org redirects http → https (301 since 2024+), so we use https
directly.
"""

from __future__ import annotations

import logging
import time
import urllib.parse
import urllib.request
from collections.abc import Iterator
from datetime import datetime
from xml.etree import ElementTree as ET

from paperpulse.ingest.base import RawPaper, Source

_log = logging.getLogger(__name__)
_NS = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
_ARXIV_API = "https://export.arxiv.org/api/query"


def _text(elem: ET.Element | None) -> str | None:
    if elem is None or elem.text is None:
        return None
    return elem.text.strip() or None


def _bare_arxiv_id(raw_id: str) -> str:
    """``http://arxiv.org/abs/2511.01234v1`` → ``2511.01234v1``. Keep version suffix."""
    if "/abs/" in raw_id:
        return raw_id.rsplit("/abs/", 1)[1]
    return raw_id


def parse_atom_feed(xml_bytes: bytes) -> Iterator[RawPaper]:
    root = ET.fromstring(xml_bytes)
    for entry in root.findall("a:entry", _NS):
        raw_id = _text(entry.find("a:id", _NS)) or ""
        arxiv_id = _bare_arxiv_id(raw_id)
        title = _text(entry.find("a:title", _NS)) or ""
        summary = _text(entry.find("a:summary", _NS))
        published = _text(entry.find("a:published", _NS))
        updated = _text(entry.find("a:updated", _NS))
        authors: list[dict[str, str]] = []
        for au in entry.findall("a:author", _NS):
            name = _text(au.find("a:name", _NS))
            if name:
                authors.append({"name": name})
        pdf_url: str | None = None
        for link in entry.findall("a:link", _NS):
            if link.get("title") == "pdf":
                pdf_url = link.get("href")
        yield RawPaper(
            source="arxiv",
            source_id=arxiv_id,
            title=" ".join(title.split()),
            abstract=summary,
            authors_raw=authors,
            venue_raw=None,
            published_at=(
                datetime.fromisoformat(published.replace("Z", "+00:00"))
                if published
                else None
            ),
            updated_at=(
                datetime.fromisoformat(updated.replace("Z", "+00:00")) if updated else None
            ),
            doi=None,
            arxiv_id=arxiv_id,
            pdf_url=pdf_url,
            html_url=f"https://ar5iv.labs.arxiv.org/html/{arxiv_id}",
            extra={"raw_atom_id": raw_id},
        )


class ArxivSource(Source):
    name = "arxiv"

    def __init__(
        self,
        categories: list[str],
        *,
        max_results: int = 200,
        polite_delay_seconds: float = 3.0,
        user_agent: str = "PaperPulse/0.1 (research tool; rigi.jx@gmail.com)",
        timeout_seconds: int = 30,
    ) -> None:
        self.categories = categories
        self.max_results = max_results
        self.polite_delay_seconds = polite_delay_seconds
        self.user_agent = user_agent
        self.timeout_seconds = timeout_seconds

    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]:
        # Phase 1: ignore `since` and just grab the most recent N papers per
        # category (sorted by submittedDate desc). Incremental high-watermark
        # logic ships with the dedup PR (#1.3) using ingest_runs.
        for cat in self.categories:
            yield from self._fetch_category(cat)
            if self.polite_delay_seconds:
                time.sleep(self.polite_delay_seconds)

    def _fetch_category(self, category: str) -> Iterator[RawPaper]:
        params = {
            "search_query": f"cat:{category}",
            "start": 0,
            "max_results": self.max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
        url = f"{_ARXIV_API}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        _log.info("fetching arxiv category=%s url=%s", category, url)
        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
            xml_bytes = resp.read()
        yield from parse_atom_feed(xml_bytes)

    def health_check(self) -> bool:
        try:
            req = urllib.request.Request(
                _ARXIV_API + "?search_query=cat:cs.LG&max_results=1",
                headers={"User-Agent": self.user_agent},
            )
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                return bool(resp.status == 200)
        except Exception:
            _log.exception("arxiv health check failed")
            return False
