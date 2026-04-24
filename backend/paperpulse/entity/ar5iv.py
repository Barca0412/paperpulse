"""ar5iv HTML parser — fallback affiliation path per spec §9.2.

ar5iv (https://ar5iv.labs.arxiv.org/html/<arxiv_id>) renders LaTeX papers
as HTML. The spec mentions ``ltx_role_institutetext`` selectors but in
practice (verified against BloombergGPT 2303.17564 and other modern arxiv
papers) ar5iv uses a different layout: affiliations live inside
``div.ltx_authors`` as ``<span class="ltx_text" style="font-size:90%;">``
elements that follow ``<br class="ltx_break">`` markers, with a ``<sup>``
footnote prefix linking authors to affiliations.

Strategy: scrape every ``font-size:90%`` span inside ``.ltx_authors`` whose
text isn't itself the author personname. Author-affiliation linkage by
footnote marker is **not** attempted in v1 — when ar5iv is the source we
attach all parsed affiliations to all authors (heuristic, but adequate for
the L3 institution-whitelist signal in Phase 3).
"""

from __future__ import annotations

import logging
import re
import urllib.request
from dataclasses import dataclass

from bs4 import BeautifulSoup, Tag

_log = logging.getLogger(__name__)
_UA = "PaperPulse/0.1 (mailto:rigi.jx@gmail.com)"
_FOOTNOTE_PREFIX_RE = re.compile(r"^[\d†*‡\s,]+")


@dataclass
class Ar5ivAffiliation:
    text: str  # raw text e.g. "Bloomberg, New York, NY USA"


def parse(html: bytes | str) -> list[Ar5ivAffiliation]:
    soup = BeautifulSoup(html, "lxml")
    authors_div = soup.select_one("div.ltx_authors")
    if authors_div is None:
        return []

    out: list[Ar5ivAffiliation] = []
    seen: set[str] = set()
    for span in authors_div.find_all("span"):
        if not isinstance(span, Tag):
            continue
        style = span.get("style", "") or ""
        if "font-size:90%" not in style:
            continue
        text = " ".join(span.get_text(" ", strip=True).split())
        # Strip leading footnote markers ("1 ", "2,3 ", "* ")
        text = _FOOTNOTE_PREFIX_RE.sub("", text).strip()
        if not text:
            continue
        # Skip pure footnote markers (e.g. just "1") that survive the regex
        if text.isdigit() or text in {"*", "†", "‡"}:
            continue
        if text in seen:
            continue
        seen.add(text)
        out.append(Ar5ivAffiliation(text=text))

    # Fallback: try the older spec selectors for backward compatibility with
    # other arxiv vintages.
    if not out:
        for sel in (
            ".ltx_role_institutetext",
            ".ltx_role_affiliation",
            ".ltx_role_address",
        ):
            for elem in soup.select(sel):
                text = " ".join(elem.get_text(" ", strip=True).split())
                if text and text not in seen:
                    seen.add(text)
                    out.append(Ar5ivAffiliation(text=text))
    return out


def fetch_and_parse(arxiv_id: str, *, timeout: int = 15) -> list[Ar5ivAffiliation]:
    bare = arxiv_id.split("v")[0] if "v" in arxiv_id else arxiv_id
    url = f"https://ar5iv.labs.arxiv.org/html/{bare}"
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            html = resp.read()
    except Exception as e:
        _log.warning("ar5iv fetch failed for %s: %s", arxiv_id, e)
        return []
    return parse(html)
