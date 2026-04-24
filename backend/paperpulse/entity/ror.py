"""ROR (Research Organization Registry) dump loader + lookup.

Loads the official ROR JSON dump (v1 schema) into:
  - in-memory dict by ROR id (for exact id resolution)
  - lowercased name dict (for exact name match)
  - alias index (lowercased alias → ROR id)
  - rapidfuzz-backed fuzzy match over name + alias union

The full dump is ~50MB compressed; the loader is lazy (called once on first
``get_index()``) so unit tests with the 10-record fixture cost <1ms.
"""

from __future__ import annotations

import gzip
import json
import logging
from dataclasses import dataclass
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
    type: str | None  # 'university'|'gov'|'company'|'nonprofit'|...


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
        self._all_names: list[tuple[str, str]] = []  # (lc, ror_id)

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
            _log.info(
                "ROR index loaded: %d records, %d names+aliases",
                len(self._by_id),
                len(self._all_names),
            )

    def get(self, ror_id: str) -> RorRecord | None:
        return self._by_id.get(ror_id)

    def exact_match(self, name: str) -> RorRecord | None:
        lc = name.strip().lower()
        rid = self._by_lower_name.get(lc) or self._by_alias.get(lc)
        return self._by_id.get(rid) if rid else None

    def fuzzy_match(self, name: str, score_cutoff: float = 90.0) -> RorRecord | None:
        lc = name.strip().lower()
        names = [n for n, _ in self._all_names]
        if not names:
            return None
        result = process.extractOne(lc, names, score_cutoff=score_cutoff)
        if not result:
            return None
        _matched, _score, idx = result
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
    """Try to load resources/ror_v1.json.gz; fall back to test fixture if missing.

    Production: drop the full ROR dump (downloadable from zenodo.org/record/...)
    at resources/ror_v1.json.gz for ~120k institutions.
    Dev/CI: the 10-record fixture lets tests pass without the 50MB download.
    """
    candidates = [
        repo_root() / "resources" / "ror_v1.json.gz",
        repo_root() / "backend" / "tests" / "fixtures" / "ror" / "ror_subset.json",
    ]
    for path in candidates:
        if not path.exists():
            continue
        _log.info("loading ROR dump from %s", path)
        if path.suffix == ".gz":
            with gzip.open(path, "rt", encoding="utf-8") as f:
                raw = json.load(f)
        else:
            with path.open("r", encoding="utf-8") as f:
                raw = json.load(f)
        records = [_record_from_raw(r) for r in raw]
        index.load_records(records)
        return
    _log.warning("no ROR dump found at any of: %s", [str(p) for p in candidates])


def upsert_to_db(records: list[RorRecord]) -> int:
    """Mirror ROR records into the institutions table."""
    from paperpulse.db.duckdb_client import execute

    n = 0
    for r in records:
        execute(
            "INSERT INTO institutions (id, ror_id, name, aliases, country_code, "
            "city, lat, lng, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "
            "aliases = EXCLUDED.aliases, country_code = EXCLUDED.country_code",
            [
                r.ror_id,
                r.ror_id,
                r.name,
                json.dumps(r.aliases),
                r.country_code,
                r.city,
                r.lat,
                r.lng,
                r.type,
            ],
        )
        n += 1
    return n
