"""NBER source — parses the public NBER 'new working papers' RSS feed.

Spec §8.2: NBER ~200 papers/month, simple RSS at https://www.nber.org/rss/new.xml
"""

from __future__ import annotations

import logging
import re
import urllib.request
from collections.abc import Iterator
from datetime import datetime
from typing import Any

import feedparser  # type: ignore[import-untyped]

from paperpulse.ingest.base import RawPaper, Source

_log = logging.getLogger(__name__)
_RSS_URL = "https://www.nber.org/rss/new.xml"
_NBER_ID_RE = re.compile(r"/papers/(w\d+)")


def _extract_paper_id(link: str) -> str | None:
    m = _NBER_ID_RE.search(link or "")
    return m.group(1) if m else None


def parse_rss(xml_bytes: bytes) -> Iterator[RawPaper]:
    feed = feedparser.parse(xml_bytes)
    for entry in feed.entries:
        link = getattr(entry, "link", "") or ""
        paper_id = _extract_paper_id(link)
        title = (getattr(entry, "title", "") or "").strip()
        if not paper_id or not title:
            continue
        published_struct = getattr(entry, "published_parsed", None)
        published: datetime | None = (
            datetime(*published_struct[:6]) if published_struct else None
        )
        # NBER RSS authors come as a list in `authors` or a single string in `author`.
        authors_raw: list[dict[str, Any]] = []
        for a in getattr(entry, "authors", []) or []:
            name = a.get("name") if isinstance(a, dict) else str(a)
            if name:
                authors_raw.append({"name": name})
        if not authors_raw and getattr(entry, "author", None):
            for raw_name in entry.author.split(","):
                clean = raw_name.strip()
                if clean:
                    authors_raw.append({"name": clean})
        summary = getattr(entry, "summary", None)
        yield RawPaper(
            source="nber",
            source_id=paper_id,
            title=title,
            abstract=summary,
            authors_raw=authors_raw,
            venue_raw="NBER Working Paper",
            published_at=published,
            updated_at=published,
            doi=None,
            arxiv_id=None,
            pdf_url=f"https://www.nber.org/system/files/working_papers/{paper_id}/{paper_id}.pdf",
            html_url=link,
            extra={},
        )


class NberSource(Source):
    name = "nber"

    def __init__(
        self,
        *,
        user_agent: str = "PaperPulse/0.1 (research tool; rigi.jx@gmail.com)",
        timeout_seconds: int = 30,
    ) -> None:
        self.user_agent = user_agent
        self.timeout_seconds = timeout_seconds

    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]:
        req = urllib.request.Request(_RSS_URL, headers={"User-Agent": self.user_agent})
        _log.info("fetching NBER RSS")
        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
            xml_bytes = resp.read()
        yield from parse_rss(xml_bytes)

    def health_check(self) -> bool:
        try:
            req = urllib.request.Request(_RSS_URL, headers={"User-Agent": self.user_agent})
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                return bool(resp.status == 200)
        except Exception:
            _log.exception("NBER health check failed")
            return False
