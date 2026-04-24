"""OpenAlex enricher — primary affiliation path per spec §9.2.

OpenAlex is a free metadata registry. Lookup by DOI or arXiv id returns
``authorships[]`` containing institution ROR ids (when available). Polite
usage requires a ``mailto`` query param.

Caveat: OpenAlex coverage of arXiv preprints is incomplete — many recent
preprints have empty institutions[] even when the work is indexed. The
caller (affiliation_pipeline) is expected to fall through to ar5iv when
``extract_affiliations`` returns no institutions.
"""

from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any

_log = logging.getLogger(__name__)
_BASE = "https://api.openalex.org"
_MAILTO = "rigi.jx@gmail.com"
_UA = f"PaperPulse/0.1 (mailto:{_MAILTO})"


@dataclass
class OpenAlexAffiliation:
    author_name: str
    author_openalex_id: str | None
    author_orcid: str | None
    institution_ror_ids: list[str] = field(default_factory=list)
    institution_names: list[str] = field(default_factory=list)
    is_corresponding: bool = False


def _http_get_json(url: str, timeout: int = 15) -> dict[str, Any] | None:
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data: dict[str, Any] = json.load(resp)
            return data
    except Exception as e:
        _log.warning("openalex GET %s failed: %s", url, e)
        return None


def lookup_by_doi(doi: str) -> dict[str, Any] | None:
    """Fetch an OpenAlex work by DOI. Returns None on any failure (rate limit / 404 / network)."""
    enc = urllib.parse.quote(doi, safe="")
    return _http_get_json(f"{_BASE}/works/https://doi.org/{enc}?mailto={_MAILTO}")


def lookup_by_arxiv(arxiv_id: str) -> dict[str, Any] | None:
    """Fetch by arXiv id. OpenAlex indexes arXiv as DOI ``10.48550/arXiv.<id>``."""
    bare = arxiv_id.split("v")[0] if "v" in arxiv_id else arxiv_id
    return lookup_by_doi(f"10.48550/arXiv.{bare}")


def extract_affiliations(work: dict[str, Any]) -> list[OpenAlexAffiliation]:
    """Pull authorships → list of normalized affiliations.

    Each authorship may have multiple institutions (multi-affiliation researcher).
    institutions[] entries contain ``id`` (OpenAlex), ``ror`` (ROR URL or None),
    and ``display_name``.
    """
    out: list[OpenAlexAffiliation] = []
    for a in work.get("authorships", []) or []:
        author = a.get("author") or {}
        institutions = a.get("institutions") or []
        ror_ids = [i.get("ror") for i in institutions if i.get("ror")]
        names = [i.get("display_name", "") for i in institutions if i.get("display_name")]
        out.append(
            OpenAlexAffiliation(
                author_name=author.get("display_name", ""),
                author_openalex_id=author.get("id"),
                author_orcid=author.get("orcid"),
                institution_ror_ids=ror_ids,
                institution_names=names,
                is_corresponding=bool(a.get("is_corresponding")),
            )
        )
    return out
