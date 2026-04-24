# PaperPulse Phase 2: Entity Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For every ingested paper, populate `paper_authors` and `paper_institutions` tables so 80%+ of papers have at least one resolved institution. Drives Phase 3 (filter L3 institution-whitelist signal) and the Institutions / Authors UI pages.

**Architecture (per spec §9):** Three-path affiliation pipeline:
1. **Primary**: OpenAlex `works/doi:{doi}` or `works/arxiv:{id}` → returns `authorships[].institutions[]` with ROR ids
2. **Fallback A (arxiv only)**: fetch ar5iv HTML → BeautifulSoup parse `<span class="ltx_role_institutetext">`
3. **Fallback B**: mark `affiliation_source='unverified'` + push to retry queue (APScheduler runs every 4h, retries OpenAlex after 48h)

Authors are resolved via OpenAlex IDs (preferred) → ORCID → fuzzy name match. Institutions via ROR (Research Organization Registry) id from a 50MB local dump (loaded once at startup into a name→id trie).

**Tech Stack additions:**
- `beautifulsoup4` + `lxml` (ar5iv HTML parsing)
- `apscheduler` (retry queue scheduler) — already in spec §15
- ROR data dump v1.x (zenodo.org/record/...) — committed as `resources/ror_v1_subset.json.gz`

**Source-of-truth references:**
- Spec §9 (entity extraction), §6.2-§6.4 (institutions/authors/relations), §16.2 (degrade), §18 PR #2.1-#2.7
- UI: `design-reference/design/src/pages/Institutions.tsx`, `Authors.tsx`

**Out of scope (deferred):**
- PI inference (`spec §9.4`) — leave `is_pi_likely=false` for all; revisit Phase 5
- Author tracking UI write-back (`POST /authors/{id}/track`) — Phase 3
- Institution / Author detail side-panels — Phase 7
- Citation count / h-index sync — needs Semantic Scholar (Phase 8+)

---

## Pre-flight

- [ ] **Pre-1: Add Phase 2 deps**

```bash
cd /Users/barca/Dev/paperpulse/backend
export PATH="$HOME/.local/bin:$PATH"
uv add beautifulsoup4 lxml apscheduler types-beautifulsoup4
uv sync
```

- [ ] **Pre-2: Capture OpenAlex fixture** (work with rich authorships, e.g. BloombergGPT)

```bash
mkdir -p backend/tests/fixtures/openalex
curl -sSL --user-agent "PaperPulse/0.1 (mailto:rigi.jx@gmail.com)" \
  "https://api.openalex.org/works/https://doi.org/10.48550/arXiv.2303.17564" \
  -o backend/tests/fixtures/openalex/work_bloomberggpt.json
test -s backend/tests/fixtures/openalex/work_bloomberggpt.json
```

- [ ] **Pre-3: Capture ar5iv fixture**

```bash
mkdir -p backend/tests/fixtures/ar5iv
curl -sSL --user-agent "PaperPulse/0.1 (rigi.jx@gmail.com)" \
  "https://ar5iv.labs.arxiv.org/html/2303.17564" \
  -o backend/tests/fixtures/ar5iv/paper_bloomberggpt.html
test -s backend/tests/fixtures/ar5iv/paper_bloomberggpt.html
```

- [ ] **Pre-4: Capture a small ROR dump subset** (full dump is 50MB — for tests we keep ~100 records hand-picked)

```bash
mkdir -p resources backend/tests/fixtures/ror
# Full dump (production startup load):
curl -sSL "https://zenodo.org/api/records?q=conceptrecid%3A6347574&size=1&sort=mostrecent" \
  | python3 -c "import sys,json; r=json.load(sys.stdin)['hits']['hits'][0]; print(r['files'][0]['links']['self'])" \
  > /tmp/ror_url.txt
curl -sSL "$(cat /tmp/ror_url.txt)" -o /tmp/ror_dump.zip
# Extract just v1.json (about 50MB raw, ~10MB gzipped)
unzip -p /tmp/ror_dump.zip "*v1.json" | gzip > resources/ror_v1.json.gz
ls -la resources/ror_v1.json.gz
```

If the unzip step fails (ROR's release format may have changed), fall back to:
```bash
curl -sSL "https://api.ror.org/organizations?page=1" -o resources/ror_seed.json
echo "TODO: replace with full dump in PR #2.1.x" >> docs/spec-questions.md
```

For the test fixture, hand-curate ~10 institutions covering: Stanford, MIT, Bloomberg L.P., NUS, JPMorgan Chase, ECB, Federal Reserve Board, Tsinghua, ByteDance, NBER. Saved as `backend/tests/fixtures/ror/ror_subset.json`:

```json
[
  {"id": "https://ror.org/00f54p054", "name": "Stanford University", "aliases": [], "country": {"country_code": "US"}, "addresses": [{"city": "Stanford", "lat": 37.4, "lng": -122.2}], "types": ["Education"]},
  {"id": "https://ror.org/042nb2s44", "name": "Massachusetts Institute of Technology", "aliases": ["MIT"], "country": {"country_code": "US"}, "addresses": [{"city": "Cambridge", "lat": 42.4, "lng": -71.1}], "types": ["Education"]},
  {"id": "https://ror.org/01f5ytq51", "name": "Bloomberg L.P.", "aliases": ["Bloomberg"], "country": {"country_code": "US"}, "addresses": [{"city": "New York"}], "types": ["Company"]},
  {"id": "https://ror.org/01tgyzw49", "name": "National University of Singapore", "aliases": ["NUS"], "country": {"country_code": "SG"}, "addresses": [{"city": "Singapore"}], "types": ["Education"]},
  {"id": "https://ror.org/01n6r0e97", "name": "JPMorgan Chase (United States)", "aliases": ["JPMorgan Chase", "JPM"], "country": {"country_code": "US"}, "addresses": [{"city": "New York"}], "types": ["Company"]},
  {"id": "https://ror.org/01eze0w76", "name": "European Central Bank", "aliases": ["ECB"], "country": {"country_code": "DE"}, "addresses": [{"city": "Frankfurt"}], "types": ["Government"]},
  {"id": "https://ror.org/00bz58a44", "name": "Federal Reserve Board", "aliases": ["FRB"], "country": {"country_code": "US"}, "addresses": [{"city": "Washington"}], "types": ["Government"]},
  {"id": "https://ror.org/03cve4549", "name": "Tsinghua University", "aliases": ["清华大学"], "country": {"country_code": "CN"}, "addresses": [{"city": "Beijing"}], "types": ["Education"]},
  {"id": "https://ror.org/02bzsnm15", "name": "ByteDance (China)", "aliases": ["ByteDance"], "country": {"country_code": "CN"}, "addresses": [{"city": "Beijing"}], "types": ["Company"]},
  {"id": "https://ror.org/03ccazx70", "name": "National Bureau of Economic Research", "aliases": ["NBER"], "country": {"country_code": "US"}, "addresses": [{"city": "Cambridge"}], "types": ["Nonprofit"]}
]
```

---

## PR #2.1: ROR dump loader + institutions table seeding

**Files:**
- Create: `backend/paperpulse/entity/__init__.py`, `backend/paperpulse/entity/ror.py`
- Create: `backend/tests/fixtures/ror/ror_subset.json` (per Pre-4 hand-curated 10 records)
- Create: `backend/tests/unit/test_ror_loader.py`

- [ ] **2.1.1: Write `entity/__init__.py`** (empty)
- [ ] **2.1.2: Write `entity/ror.py`**

```python
"""ROR (Research Organization Registry) dump loader + lookup.

Loads the official ROR JSON dump (v1 schema) into:
  - in-memory dict by ROR id (for exact id resolution)
  - in-memory trie / lowercased name dict (for exact name match)
  - alias index (lowercased alias → ROR id)
  - rapidfuzz process for fuzzy match

The full dump is ~50MB compressed; the loader is lazy (called once at startup
or on demand) so unit tests can use a 10-record fixture in <1ms.
"""

from __future__ import annotations

import gzip
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

from rapidfuzz import process

from paperpulse.paths import repo_root

_log = logging.getLogger(__name__)


@dataclass
class RorRecord:
    ror_id: str
    name: str
    aliases: list[str]
    country_code: str | None
    city: str | None
    lat: float | None
    lng: float | None
    type: str | None  # 'university'|'big_tech'|'bank'|'central_bank'|'gov'|'nonprofit'|'company'|None


_TYPE_MAP = {
    "Education": "university",
    "Government": "gov",
    "Company": "company",
    "Nonprofit": "nonprofit",
    "Healthcare": "healthcare",
    "Facility": "facility",
    "Archive": "archive",
    "Other": "other",
}


def _record_from_raw(raw: dict[str, Any]) -> RorRecord:
    addrs = raw.get("addresses") or []
    addr = addrs[0] if addrs else {}
    raw_types = raw.get("types") or []
    type_ = _TYPE_MAP.get(raw_types[0] if raw_types else "", None)
    country = (raw.get("country") or {}).get("country_code")
    return RorRecord(
        ror_id=raw["id"],
        name=raw.get("name", ""),
        aliases=[a for a in (raw.get("aliases") or []) if a],
        country_code=country,
        city=addr.get("city"),
        lat=addr.get("lat"),
        lng=addr.get("lng"),
        type=type_,
    )


class RorIndex:
    def __init__(self) -> None:
        self._lock = Lock()
        self._by_id: dict[str, RorRecord] = {}
        self._by_lower_name: dict[str, str] = {}  # lc_name → ror_id
        self._by_alias: dict[str, str] = {}
        self._all_names: list[tuple[str, str]] = []  # (lc_name_or_alias, ror_id)

    def load_records(self, records: list[RorRecord]) -> None:
        with self._lock:
            for r in records:
                self._by_id[r.ror_id] = r
                self._by_lower_name[r.name.lower()] = r.ror_id
                for a in r.aliases:
                    self._by_alias[a.lower()] = r.ror_id
                self._all_names.append((r.name.lower(), r.ror_id))
                for a in r.aliases:
                    self._all_names.append((a.lower(), r.ror_id))
            _log.info("ROR index loaded: %d records, %d names+aliases",
                      len(self._by_id), len(self._all_names))

    def get(self, ror_id: str) -> RorRecord | None:
        return self._by_id.get(ror_id)

    def exact_match(self, name: str) -> RorRecord | None:
        lc = name.strip().lower()
        rid = self._by_lower_name.get(lc) or self._by_alias.get(lc)
        return self._by_id.get(rid) if rid else None

    def fuzzy_match(self, name: str, score_cutoff: float = 90.0) -> RorRecord | None:
        lc = name.strip().lower()
        names = [n for n, _ in self._all_names]
        result = process.extractOne(lc, names, score_cutoff=score_cutoff)
        if not result:
            return None
        _, score, idx = result
        ror_id = self._all_names[idx][1]
        return self._by_id.get(ror_id)

    def __len__(self) -> int:
        return len(self._by_id)


# Process-wide singleton.
_index: RorIndex | None = None


def get_index() -> RorIndex:
    global _index
    if _index is None:
        _index = RorIndex()
        _load_default(_index)
    return _index


def reset_index() -> None:
    global _index
    _index = None


def _load_default(index: RorIndex) -> None:
    """Try to load resources/ror_v1.json.gz; fall back to fixture if missing."""
    candidates = [
        repo_root() / "resources" / "ror_v1.json.gz",
        repo_root() / "backend" / "tests" / "fixtures" / "ror" / "ror_subset.json",
    ]
    for path in candidates:
        if path.exists():
            _log.info("loading ROR dump from %s", path)
            opener = gzip.open if path.suffix == ".gz" else open
            with opener(path, "rt", encoding="utf-8") as f:
                raw = json.load(f)
            records = [_record_from_raw(r) for r in raw]
            index.load_records(records)
            return
    _log.warning("no ROR dump found at any of: %s", [str(p) for p in candidates])


def upsert_to_db(records: list[RorRecord]) -> int:
    """Mirror ROR records into the institutions table (used Phase 2 onward)."""
    from paperpulse.db.duckdb_client import execute

    n = 0
    for r in records:
        execute(
            "INSERT INTO institutions (id, ror_id, name, aliases, country_code, "
            "city, lat, lng, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
            [r.ror_id, r.ror_id, r.name, json.dumps(r.aliases),
             r.country_code, r.city, r.lat, r.lng, r.type],
        )
        n += 1
    return n
```

- [ ] **2.1.3: Write `tests/unit/test_ror_loader.py`**

```python
"""ROR loader exact + fuzzy + DB upsert."""
from __future__ import annotations

import json
from pathlib import Path

from paperpulse.db.duckdb_client import fetchall, get_connection
from paperpulse.entity.ror import RorIndex, _record_from_raw, upsert_to_db

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "ror" / "ror_subset.json"


def _load_fixture_records():
    raw = json.loads(FIXTURE.read_text())
    return [_record_from_raw(r) for r in raw]


def test_exact_name_match() -> None:
    idx = RorIndex()
    idx.load_records(_load_fixture_records())
    assert idx.exact_match("Stanford University") is not None
    assert idx.exact_match("stanford university") is not None  # case-insensitive
    assert idx.exact_match("Nonexistent") is None


def test_alias_match() -> None:
    idx = RorIndex()
    idx.load_records(_load_fixture_records())
    bg = idx.exact_match("Bloomberg")  # alias of Bloomberg L.P.
    assert bg is not None
    assert bg.name == "Bloomberg L.P."


def test_fuzzy_match_handles_minor_typos() -> None:
    idx = RorIndex()
    idx.load_records(_load_fixture_records())
    res = idx.fuzzy_match("Massachusetts Institute of Tech")  # truncated
    assert res is not None
    assert res.ror_id == "https://ror.org/042nb2s44"


def test_fuzzy_match_returns_none_below_cutoff() -> None:
    idx = RorIndex()
    idx.load_records(_load_fixture_records())
    assert idx.fuzzy_match("Hogwarts School of Witchcraft") is None


def test_upsert_to_db_writes_institutions_rows() -> None:
    get_connection()
    records = _load_fixture_records()
    n = upsert_to_db(records)
    assert n == len(records)
    rows = fetchall("SELECT name FROM institutions WHERE ror_id LIKE 'https://ror.org/%'")
    assert len(rows) == len(records)
```

- [ ] **2.1.4: Run tests**: `make test-unit` — expect all green
- [ ] **2.1.5: Commit `feat(entity): PR #2.1 ROR dump loader + institutions seeding`**

---

## PR #2.2: OpenAlex enricher (primary affiliation path)

**Files:**
- Create: `backend/paperpulse/entity/openalex.py`
- Create: `backend/tests/unit/test_openalex.py`

- [ ] **2.2.1: Write `entity/openalex.py`**

```python
"""OpenAlex enricher — primary affiliation path per spec §9.2.

OpenAlex is a free metadata registry. Lookup by DOI or arXiv id returns
authorships including institution ROR ids. Polite usage: include
``mailto`` query param.
"""

from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request
from dataclasses import dataclass

_log = logging.getLogger(__name__)
_BASE = "https://api.openalex.org"
_MAILTO = "rigi.jx@gmail.com"
_UA = f"PaperPulse/0.1 (mailto:{_MAILTO})"


@dataclass
class OpenAlexAffiliation:
    author_name: str
    author_openalex_id: str | None
    author_orcid: str | None
    institution_ror_ids: list[str]
    institution_names: list[str]
    is_corresponding: bool


def _http_get_json(url: str, timeout: int = 15) -> dict | None:
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data: dict = json.load(resp)
            return data
    except Exception as e:
        _log.warning("openalex GET %s failed: %s", url, e)
        return None


def lookup_by_doi(doi: str) -> dict | None:
    enc = urllib.parse.quote(doi, safe="")
    return _http_get_json(f"{_BASE}/works/https://doi.org/{enc}?mailto={_MAILTO}")


def lookup_by_arxiv(arxiv_id: str) -> dict | None:
    bare = arxiv_id.split("v")[0] if "v" in arxiv_id else arxiv_id
    # OpenAlex indexes arxiv as DOI 10.48550/arXiv.<id>
    return lookup_by_doi(f"10.48550/arXiv.{bare}")


def extract_affiliations(work: dict) -> list[OpenAlexAffiliation]:
    out: list[OpenAlexAffiliation] = []
    for a in work.get("authorships", []):
        author = a.get("author") or {}
        institutions = a.get("institutions") or []
        out.append(
            OpenAlexAffiliation(
                author_name=author.get("display_name", ""),
                author_openalex_id=author.get("id"),
                author_orcid=author.get("orcid"),
                institution_ror_ids=[i.get("ror") for i in institutions if i.get("ror")],
                institution_names=[i.get("display_name", "") for i in institutions],
                is_corresponding=bool(a.get("is_corresponding")),
            )
        )
    return out
```

- [ ] **2.2.2: Write `tests/unit/test_openalex.py`** — fixture-based, no network

```python
"""OpenAlex extraction from saved fixture."""
from __future__ import annotations

import json
from pathlib import Path

from paperpulse.entity.openalex import extract_affiliations

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "openalex" / "work_bloomberggpt.json"


def test_extract_finds_authors_and_institutions() -> None:
    work = json.loads(FIXTURE.read_text())
    affs = extract_affiliations(work)
    assert len(affs) > 0
    # BloombergGPT has at least one Bloomberg-affiliated author
    bloomberg = [a for a in affs if any("bloomberg" in n.lower() for n in a.institution_names)]
    assert len(bloomberg) > 0
```

- [ ] **2.2.3: Run tests + live smoke**

```bash
cd backend && uv run pytest tests/unit/test_openalex.py -v
uv run python -c "
from paperpulse.entity.openalex import lookup_by_arxiv, extract_affiliations
w = lookup_by_arxiv('2303.17564')
print(extract_affiliations(w)[:2])"
```

- [ ] **2.2.4: Commit `feat(entity): PR #2.2 OpenAlex enricher (primary affiliation path)`**

---

## PR #2.3: ar5iv HTML fallback parser

**Files:**
- Create: `backend/paperpulse/entity/ar5iv.py`
- Create: `backend/tests/unit/test_ar5iv.py`

- [ ] **2.3.1: Write `entity/ar5iv.py`**

```python
"""ar5iv HTML parser — fallback affiliation path per spec §9.2.

ar5iv (https://ar5iv.labs.arxiv.org/html/<arxiv_id>) renders LaTeX papers
as HTML. Affiliations live in <span class="ltx_role_institutetext"> or
<span class="ltx_role_affiliation">. Author-affiliation linkage uses
footnote markers (1, 2, 3 / †, *).
"""

from __future__ import annotations

import logging
import urllib.request
from dataclasses import dataclass

from bs4 import BeautifulSoup

_log = logging.getLogger(__name__)
_UA = "PaperPulse/0.1 (mailto:rigi.jx@gmail.com)"


@dataclass
class Ar5ivAffiliation:
    text: str  # raw text e.g. "Bloomberg L.P., New York, NY"


def parse(html: bytes | str) -> list[Ar5ivAffiliation]:
    soup = BeautifulSoup(html, "lxml")
    out: list[Ar5ivAffiliation] = []
    seen: set[str] = set()
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
```

- [ ] **2.3.2: Write `tests/unit/test_ar5iv.py`** — fixture-based

```python
"""ar5iv parser against saved BloombergGPT fixture."""
from __future__ import annotations

from pathlib import Path

from paperpulse.entity.ar5iv import parse

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "ar5iv" / "paper_bloomberggpt.html"


def test_parse_finds_at_least_one_affiliation() -> None:
    html = FIXTURE.read_bytes()
    affs = parse(html)
    assert len(affs) >= 1


def test_parse_extracts_bloomberg_text() -> None:
    affs = parse(FIXTURE.read_bytes())
    blob = " ".join(a.text for a in affs).lower()
    assert "bloomberg" in blob
```

- [ ] **2.3.3: Run tests + commit `feat(entity): PR #2.3 ar5iv HTML fallback parser`**

---

## PR #2.4: Author normalization

**Files:**
- Create: `backend/paperpulse/entity/author.py`
- Create: `backend/tests/unit/test_author_normalize.py`

- [ ] **2.4.1: Write `entity/author.py`**

```python
"""Author normalization per spec §9.1.

Resolution order:
  1. ORCID exact (if present)
  2. OpenAlex id exact
  3. Fuzzy name + co-author overlap
  4. Create new manual author (id = 'manual:<sha1(name)>')
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass

from rapidfuzz import fuzz

from paperpulse.db.duckdb_client import execute, fetchall

_log = logging.getLogger(__name__)


@dataclass
class ResolvedAuthor:
    author_id: str
    name: str
    openalex_id: str | None
    orcid: str | None
    is_new: bool


def _manual_id(name: str) -> str:
    return "manual:author:" + hashlib.sha1(name.lower().encode()).hexdigest()[:12]


def find_or_create(
    *,
    name: str,
    openalex_id: str | None = None,
    orcid: str | None = None,
) -> ResolvedAuthor:
    # 1. ORCID
    if orcid:
        rows = fetchall("SELECT id, name, openalex_id, orcid FROM authors WHERE orcid = ?", [orcid])
        if rows:
            return ResolvedAuthor(rows[0][0], rows[0][1], rows[0][2], rows[0][3], False)
    # 2. OpenAlex
    if openalex_id:
        rows = fetchall(
            "SELECT id, name, openalex_id, orcid FROM authors WHERE openalex_id = ?",
            [openalex_id],
        )
        if rows:
            return ResolvedAuthor(rows[0][0], rows[0][1], rows[0][2], rows[0][3], False)
    # 3. Fuzzy by name (within ±10 char length)
    candidates = fetchall(
        "SELECT id, name, openalex_id, orcid FROM authors WHERE LENGTH(name) BETWEEN ? AND ?",
        [max(1, len(name) - 10), len(name) + 10],
    )
    best_score = 0.0
    best_row: tuple | None = None
    for row in candidates:
        s = fuzz.ratio(name.lower(), str(row[1]).lower())
        if s > best_score:
            best_score = s
            best_row = row
    if best_row and best_score >= 92:
        return ResolvedAuthor(best_row[0], best_row[1], best_row[2], best_row[3], False)
    # 4. New
    new_id = openalex_id or _manual_id(name)
    execute(
        "INSERT INTO authors (id, name, openalex_id, orcid) VALUES (?, ?, ?, ?)",
        [new_id, name, openalex_id, orcid],
    )
    return ResolvedAuthor(new_id, name, openalex_id, orcid, True)


def link_paper_author(
    paper_id: str,
    author_id: str,
    *,
    order: int,
    is_first: bool,
    is_last: bool,
    is_corresponding: bool,
    institution_ids: list[str],
) -> None:
    execute(
        "INSERT INTO paper_authors (paper_id, author_id, author_order, is_first, "
        "is_last, is_corresponding, affiliation_ids) "
        "VALUES (?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT (paper_id, author_id) DO UPDATE SET author_order = EXCLUDED.author_order",
        [paper_id, author_id, order, is_first, is_last, is_corresponding,
         json.dumps(institution_ids)],
    )
```

- [ ] **2.4.2: Tests**: `find_or_create` returns same id on repeat, dedups by ORCID, dedups by OpenAlex id, creates new for unknown
- [ ] **2.4.3: Commit `feat(entity): PR #2.4 author normalization`**

---

## PR #2.5: Institution normalization (ROR-driven) + paper_institutions linkage

**Files:**
- Create: `backend/paperpulse/entity/institution.py`
- Create: `backend/tests/unit/test_institution_normalize.py`

- [ ] **2.5.1: Write `entity/institution.py`**

```python
"""Institution normalization per spec §9.2 step 4 (post-extraction).

Resolution:
  1. ROR id exact (from OpenAlex)
  2. ROR name exact match
  3. ROR alias exact match
  4. ROR fuzzy match >= 92
  5. Create unverified row (id = 'manual:inst:<sha1>')
"""

from __future__ import annotations

import hashlib
import json
import logging

from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.entity.ror import get_index

_log = logging.getLogger(__name__)


def _manual_id(name: str) -> str:
    return "manual:inst:" + hashlib.sha1(name.lower().encode()).hexdigest()[:12]


def resolve(*, ror_id: str | None = None, name: str | None = None) -> str | None:
    """Return institution.id (creating a row if needed). None if no signal."""
    idx = get_index()
    if ror_id:
        rec = idx.get(ror_id)
        if rec:
            _ensure_row(rec.ror_id, rec.name, json.dumps(rec.aliases),
                        rec.country_code, rec.city, rec.lat, rec.lng, rec.type, rec.ror_id)
            return rec.ror_id
    if name:
        rec = idx.exact_match(name) or idx.fuzzy_match(name, score_cutoff=92)
        if rec:
            _ensure_row(rec.ror_id, rec.name, json.dumps(rec.aliases),
                        rec.country_code, rec.city, rec.lat, rec.lng, rec.type, rec.ror_id)
            return rec.ror_id
        # Unverified manual row
        manual = _manual_id(name)
        _ensure_row(manual, name, "[]", None, None, None, None, None, None)
        return manual
    return None


def _ensure_row(
    inst_id: str, name: str, aliases_json: str,
    country: str | None, city: str | None, lat: float | None, lng: float | None,
    type_: str | None, ror_id: str | None,
) -> None:
    execute(
        "INSERT INTO institutions (id, ror_id, name, aliases, country_code, "
        "city, lat, lng, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
        [inst_id, ror_id, name, aliases_json, country, city, lat, lng, type_],
    )


def link_paper_institution(
    paper_id: str, institution_id: str,
    *, has_first_author: bool, has_last_author: bool,
) -> None:
    rows = fetchall(
        "SELECT author_count FROM paper_institutions WHERE paper_id = ? AND institution_id = ?",
        [paper_id, institution_id],
    )
    if rows:
        execute(
            "UPDATE paper_institutions SET author_count = author_count + 1, "
            "has_first_author = has_first_author OR ?, "
            "has_last_author = has_last_author OR ? "
            "WHERE paper_id = ? AND institution_id = ?",
            [has_first_author, has_last_author, paper_id, institution_id],
        )
    else:
        execute(
            "INSERT INTO paper_institutions (paper_id, institution_id, author_count, "
            "has_first_author, has_last_author) VALUES (?, ?, 1, ?, ?)",
            [paper_id, institution_id, has_first_author, has_last_author],
        )
```

- [ ] **2.5.2: Tests**: resolve by ROR id / name / alias / fuzzy / fallback to manual; link counter increments correctly
- [ ] **2.5.3: Commit `feat(entity): PR #2.5 institution normalization + ROR matching`**

---

## PR #2.6: Affiliation orchestrator + retry queue + scheduler

**Files:**
- Create: `backend/paperpulse/entity/affiliation_pipeline.py`
- Create: `backend/paperpulse/scheduler.py`
- Create: `backend/tests/integration/test_affiliation_pipeline.py`
- Modify: `backend/paperpulse/main.py` (start scheduler in lifespan)

- [ ] **2.6.1: Write `affiliation_pipeline.py`** — wires OpenAlex → ar5iv → unverified

```python
"""Three-path affiliation orchestrator per spec §9.2.

Public API:
    enrich_paper_affiliations(paper_id) -> source label
    process_retry_queue() -> count
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.entity import ar5iv, author, institution, openalex

_log = logging.getLogger(__name__)


def enrich_paper_affiliations(paper_id: str) -> str:
    """Fill paper_authors + paper_institutions for one paper.

    Returns the affiliation_source label written back to the papers row:
    'openalex' | 'ar5iv' | 'unverified'
    """
    rows = fetchall(
        "SELECT doi, arxiv_id, source, authors FROM papers WHERE id = ?", [paper_id]
    )
    if not rows:
        return "unverified"
    doi, arxiv_id, source_name, authors_json = rows[0]

    # Path 1: OpenAlex
    work = None
    if doi:
        work = openalex.lookup_by_doi(doi)
    if not work and arxiv_id:
        work = openalex.lookup_by_arxiv(arxiv_id)

    affs: list[openalex.OpenAlexAffiliation] = []
    if work:
        affs = openalex.extract_affiliations(work)

    if affs:
        _persist_openalex(paper_id, affs)
        _mark_source(paper_id, "openalex")
        return "openalex"

    # Path 2: ar5iv (arxiv-only)
    if source_name == "arxiv" and arxiv_id:
        ar5iv_affs = ar5iv.fetch_and_parse(arxiv_id)
        if ar5iv_affs:
            _persist_ar5iv(paper_id, authors_json, ar5iv_affs)
            _mark_source(paper_id, "ar5iv")
            return "ar5iv"

    # Path 3: queue retry, mark unverified
    _mark_source(paper_id, "unverified")
    _enqueue_retry(paper_id, delay_hours=48)
    return "unverified"


def _persist_openalex(paper_id: str, affs: list[openalex.OpenAlexAffiliation]) -> None:
    n = len(affs)
    for i, a in enumerate(affs):
        au = author.find_or_create(
            name=a.author_name, openalex_id=a.author_openalex_id, orcid=a.author_orcid
        )
        inst_ids = [
            institution.resolve(ror_id=rid) for rid in a.institution_ror_ids
        ]
        # Some openalex authorships have name but no ror — fall back to display_name
        if not inst_ids and a.institution_names:
            for nm in a.institution_names:
                inst_ids.append(institution.resolve(name=nm))
        inst_ids = [i for i in inst_ids if i]
        author.link_paper_author(
            paper_id, au.author_id,
            order=i, is_first=(i == 0), is_last=(i == n - 1),
            is_corresponding=a.is_corresponding,
            institution_ids=inst_ids,
        )
        for j, iid in enumerate(inst_ids):
            institution.link_paper_institution(
                paper_id, iid,
                has_first_author=(i == 0),
                has_last_author=(i == n - 1),
            )


def _persist_ar5iv(paper_id: str, authors_json: str, affs: list[ar5iv.Ar5ivAffiliation]) -> None:
    """Author-affiliation linkage from ar5iv is heuristic; we attach ALL parsed
    affiliations to ALL authors when the order is unclear. Better than nothing
    for the L3 institution-whitelist signal in Phase 3."""
    import json as _json
    raw_authors = _json.loads(authors_json) if authors_json else []
    n = len(raw_authors) or 1
    inst_ids = [institution.resolve(name=a.text) for a in affs]
    inst_ids = [i for i in inst_ids if i]
    for i, au_dict in enumerate(raw_authors):
        au = author.find_or_create(name=au_dict.get("name", ""))
        author.link_paper_author(
            paper_id, au.author_id,
            order=i, is_first=(i == 0), is_last=(i == n - 1),
            is_corresponding=False,
            institution_ids=inst_ids,
        )
        for iid in inst_ids:
            institution.link_paper_institution(
                paper_id, iid,
                has_first_author=(i == 0),
                has_last_author=(i == n - 1),
            )


def _mark_source(paper_id: str, source: str) -> None:
    execute(
        "UPDATE papers SET affiliation_source = ?, affiliation_fetched_at = ? "
        "WHERE id = ?",
        [source, datetime.now(), paper_id],
    )


def _enqueue_retry(paper_id: str, *, delay_hours: int) -> None:
    next_attempt = datetime.now() + timedelta(hours=delay_hours)
    execute(
        "INSERT INTO affiliation_retry_queue (paper_id, next_attempt_at, attempts) "
        "VALUES (?, ?, 0) ON CONFLICT (paper_id) DO UPDATE SET "
        "next_attempt_at = EXCLUDED.next_attempt_at",
        [paper_id, next_attempt],
    )


def process_retry_queue(*, max_per_run: int = 50) -> int:
    rows = fetchall(
        "SELECT paper_id FROM affiliation_retry_queue WHERE next_attempt_at <= ? "
        "AND attempts < 5 ORDER BY next_attempt_at LIMIT ?",
        [datetime.now(), max_per_run],
    )
    n = 0
    for (pid,) in rows:
        result = enrich_paper_affiliations(pid)
        if result != "unverified":
            execute("DELETE FROM affiliation_retry_queue WHERE paper_id = ?", [pid])
        else:
            execute(
                "UPDATE affiliation_retry_queue SET attempts = attempts + 1 WHERE paper_id = ?",
                [pid],
            )
        n += 1
    return n
```

- [ ] **2.6.2: Add `affiliation_retry_queue` table to schema.sql**

```sql
CREATE TABLE IF NOT EXISTS affiliation_retry_queue (
    paper_id        TEXT PRIMARY KEY,
    next_attempt_at TIMESTAMP NOT NULL,
    attempts        INTEGER DEFAULT 0
);
```

- [ ] **2.6.3: Write `paperpulse/scheduler.py`**

```python
"""APScheduler wrapper. Phase 2 only registers the affiliation retry job;
Phase 3+ adds daily ingest, weekly digest, signal refresh, etc.
"""
from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from paperpulse.entity.affiliation_pipeline import process_retry_queue

_log = logging.getLogger(__name__)
_sched: BackgroundScheduler | None = None


def start() -> None:
    global _sched
    if _sched is not None:
        return
    s = BackgroundScheduler(timezone="Asia/Singapore")
    s.add_job(process_retry_queue, IntervalTrigger(hours=4), id="affiliation_retry")
    s.start()
    _sched = s
    _log.info("scheduler started")


def stop() -> None:
    global _sched
    if _sched is not None:
        _sched.shutdown(wait=False)
        _sched = None
```

- [ ] **2.6.4: Wire scheduler into `main.py` lifespan** (start after config, stop before)
- [ ] **2.6.5: Integration test using fixture-backed openalex**:

```python
# Patch openalex.lookup_by_arxiv to return the fixture; verify enrich_paper_affiliations
# inserts paper_authors + paper_institutions rows and marks source='openalex'.
```

- [ ] **2.6.6: Commit `feat(entity): PR #2.6 affiliation pipeline + retry queue + scheduler`**

---

## PR #2.7: Institutions / Authors API + UI pages migration

**Files:**
- Create: `backend/paperpulse/api/institutions.py`, `authors.py`
- Modify: `backend/paperpulse/api/router.py`
- Create: `backend/tests/integration/test_inst_author_api.py`
- Replace: `src/pages/Institutions.tsx`, `src/pages/Authors.tsx` (migrate from design-reference)
- Create: `src/hooks/useInstitutions.ts`, `useAuthors.ts`
- Modify: `src/lib/api.ts` and `types.ts` to add Institution / Author

- [ ] **2.7.1: Backend API**

```python
# backend/paperpulse/api/institutions.py
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel
from paperpulse.db.duckdb_client import fetchall

router = APIRouter(prefix="/api/v1/institutions", tags=["institutions"])


class InstitutionOut(BaseModel):
    id: str
    name: str
    country_code: str | None
    city: str | None
    type: str | None
    ror_id: str | None
    in_whitelist: bool
    paper_count_30d: int


@router.get("", response_model=list[InstitutionOut])
async def list_institutions(window_days: int = 30, limit: int = 50) -> list[InstitutionOut]:
    rows = fetchall(
        "SELECT i.id, i.name, i.country_code, i.city, i.type, i.ror_id, i.in_whitelist, "
        "       COUNT(DISTINCT pi.paper_id) AS n "
        "FROM institutions i "
        "LEFT JOIN paper_institutions pi ON pi.institution_id = i.id "
        "LEFT JOIN papers p ON p.id = pi.paper_id "
        "  AND p.published_at >= CURRENT_DATE - INTERVAL (?) DAY "
        "GROUP BY i.id, i.name, i.country_code, i.city, i.type, i.ror_id, i.in_whitelist "
        "ORDER BY n DESC, i.name "
        "LIMIT ?",
        [window_days, limit],
    )
    return [
        InstitutionOut(
            id=r[0], name=r[1], country_code=r[2], city=r[3], type=r[4],
            ror_id=r[5], in_whitelist=bool(r[6]), paper_count_30d=int(r[7]),
        )
        for r in rows
    ]
```

(Authors API mirror — same pattern.)

- [ ] **2.7.2: Mount routers** in `router.py`
- [ ] **2.7.3: Integration tests** (seed papers + paper_institutions, assert API returns counts)
- [ ] **2.7.4: Frontend types + hooks + api.ts methods**
- [ ] **2.7.5: Migrate `src/pages/Institutions.tsx`** from `design-reference/design/src/pages/Institutions.tsx` — strip mock imports, replace with `useInstitutions()`
- [ ] **2.7.6: Migrate `src/pages/Authors.tsx`** similarly
- [ ] **2.7.7: Live smoke**: re-run ingest (already have 2082 arxiv papers) → run `enrich_paper_affiliations` for first 100 → verify Institutions page shows real institutions

- [ ] **2.7.8: Commit `feat(ui): PR #2.7 Institutions/Authors API + UI migration; closes Phase 2`**

---

## Phase 2 DoD

- [ ] `make all` green (lint + typecheck + 27 + new tests)
- [ ] Run `enrich_paper_affiliations` on first 100 of the 2082 arxiv papers → manual count: ≥ 80% have `affiliation_source != 'unverified'`
- [ ] Institutions page shows ≥ 20 distinct institutions with non-zero paper counts
- [ ] Authors page shows ≥ 100 distinct authors
- [ ] All institutions resolved via OpenAlex have valid ROR ids (spot-check 5 by clicking through to ror.org)
