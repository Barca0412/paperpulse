# Phase 3: Filtering Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline mode is the user's preferred cadence for this project — see `feedback_collaboration_style`). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three-level filtering pipeline (L1 keyword rules → L2 semantic similarity → L3 Tier weighted scoring) plus the Settings tabs that let the user edit the underlying YAML rules with real-time effect.

**Architecture:**
- New `backend/paperpulse/filter/` module hosts pure-function rule logic (`keywords.py`, `semantic.py`, `tiers.py`) orchestrated by `pipeline.py`. An embedding service (`embedding.py`) loads bge-m3 ONNX once at sidecar start and caches seed/topic anchors in-memory; paper vectors are persisted in LanceDB.
- Pipeline runs as a post-ingest pass: `ingest/runner.py` emits newly-inserted `paper_id`s, `filter/pipeline.py` scores them and writes `level{1,2,3}` columns + `tier` + `primary_topic` to `papers`. On YAML change, `config.py` subscribers trigger scoped re-scoring jobs.
- Settings UI ports four tabs from `design-reference/design/src/pages/settings/tabs.tsx` (Keywords / Seeds / Topics / Tier Rules). All writes go through new `POST /settings/{keywords,seeds,topics,tiers}` endpoints that serialize to YAML on disk, let the existing watchdog re-emit a change event, and return the new active config. A `POST /settings/tiers/simulate` endpoint supports the Tier Rules Simulate button without persisting.
- Feed API grows `time_window`, `group_by`, `sort`, `tier`, `topic`, `source` query params. Response shape stays flat when `group_by=flat`; when grouped, returns `{total, groups: [{label, label_type, count, papers: []}]}`.

**Tech Stack:**
- Python 3.13 + ONNX Runtime 1.20 (`onnxruntime`) + `tokenizers` (Rust-backed, no torch needed) + `huggingface_hub` for one-time model download
- Model: `aapot/bge-m3-onnx` (pre-converted 1024-dim embedding, ~1.2GB); CoreMLExecutionProvider on Apple Silicon → CPUExecutionProvider fallback
- LanceDB for paper vectors (existing client, new `paper_vectors` table)
- YAML + watchdog hot-reload (existing)
- React 18 + shadcn components already in repo; new: Textarea, Switch, Slider, Select, RadioGroup, Checkbox, Badge, Separator, Label (copy from `design-reference/design/src/components/ui/`)

**Scope notes:**
- `primary_topic` derivation in Phase 3 is interim: "best-matching L2 topic anchor". Phase 5 replaces with Haiku classification (spec §11.3).
- `citation_velocity`, `pwc_has_code`, `hf_daily_papers` columns are already in schema but **not populated** in Phase 3 (external signals are Phase 4/5 work). L3 will treat missing values as 0 — scoring still works but Tier B papers lean on `level2_similarity` + `institution_whitelist` + `tracked_author`.
- `tracked_author` signal reads `authors.is_tracked` — that column exists (Phase 2) but no UI yet to flip it. Phase 3 respects the flag if set; explicit "track author" UI arrives Phase 7.
- All ingested papers are scored; L1-failed papers stay in DB with `level1_passed=false` (备档 per spec §10.4 comment) but are excluded from default feed queries.

---

## File Structure

### New files
- `backend/paperpulse/filter/__init__.py`
- `backend/paperpulse/filter/keywords.py` — L1 rule filter (spec §10.1)
- `backend/paperpulse/filter/embedding.py` — bge-m3 ONNX service + LanceDB paper_vectors
- `backend/paperpulse/filter/anchors.py` — seed/topic loader and in-memory anchor cache
- `backend/paperpulse/filter/semantic.py` — L2 filter (spec §10.2)
- `backend/paperpulse/filter/tiers.py` — L3 scoring (spec §10.3)
- `backend/paperpulse/filter/pipeline.py` — orchestrator (spec §10.4) + `filter_paper` + `rescore_bulk`
- `backend/paperpulse/filter/simulate.py` — rule-change impact simulator for Tier Tab
- `backend/paperpulse/api/filter_settings.py` — POST /settings/{keywords,seeds,topics,tiers}(+simulate)
- `backend/tests/unit/filter/test_keywords.py`
- `backend/tests/unit/filter/test_embedding.py`
- `backend/tests/unit/filter/test_anchors.py`
- `backend/tests/unit/filter/test_semantic.py`
- `backend/tests/unit/filter/test_tiers.py`
- `backend/tests/unit/filter/test_simulate.py`
- `backend/tests/integration/test_filter_pipeline_e2e.py`
- `backend/tests/integration/test_filter_settings_api.py`
- `backend/tests/fixtures/bge_m3_stub.py` — deterministic fake embedder for unit tests
- `src/pages/settings/index.tsx` — shell with tab nav
- `src/pages/settings/KeywordsTab.tsx`
- `src/pages/settings/SeedsTab.tsx`
- `src/pages/settings/TopicsTab.tsx`
- `src/pages/settings/TierRulesTab.tsx`
- `src/pages/settings/_parts.tsx` — SettingsSection/Row/Card (copy from design-reference)
- `src/hooks/useSettings.ts` — typed hooks per tab (useKeywords, useSeeds, useTopics, useTiers, useTierSimulate)
- `src/lib/settings.ts` — API client functions
- `src/components/ui/{textarea,switch,slider,select,radio-group,checkbox,badge,separator,label,input}.tsx` — shadcn primitives (copy from design-reference)

### Modified files
- `backend/pyproject.toml` — add `onnxruntime`, `tokenizers`, `huggingface_hub`, `numpy` (already transitive but declare)
- `backend/paperpulse/paths.py` — add `models_dir()` pointing to `~/.paperpulse/models/`
- `backend/paperpulse/config.py` — subscribers already exist; no change needed, just new consumers
- `backend/paperpulse/db/duckdb_client.py` — no change
- `backend/paperpulse/ingest/runner.py` — call `filter.pipeline.filter_paper(pid)` for each newly-inserted id
- `backend/paperpulse/ingest/dedup.py:upsert_raw` — return `(paper_id, is_new)` tuple (currently returns just id) so runner knows what to filter
- `backend/paperpulse/main.py` — startup: warm embedding service + anchor cache
- `backend/paperpulse/api/router.py` — register `filter_settings.router`
- `backend/paperpulse/api/feed.py` — add grouping + filter params + sort
- `backend/paperpulse/scheduler.py` — add daily L3-rescore job (tier rules don't auto-trigger rescore on YAML edit for large corpora, see Task decision point)
- `backend/paperpulse/db/schema.sql` — add `paper_vectors` LanceDB handling (managed outside SQL) + extend `ingest_runs.details` usage (no DDL change)
- `src/App.tsx` — replace `Settings` stub with new `pages/settings/index.tsx`
- `src/components/layout/SideNav.tsx` — Settings icon already links, verify path
- `config/keywords.yml`, `config/seeds.yml`, `config/topics.yml`, `config/tiers.yml` — left as-is; API writes preserve format & comments where feasible

---

## Decisions to Confirm Before Execution

**D1. bge-m3 ONNX source.** Recommendation: `aapot/bge-m3-onnx` on HuggingFace (pre-converted, 1024-dim, FP32, ~1.2GB). Download once via `huggingface_hub.hf_hub_download` to `~/.paperpulse/models/bge-m3/` on first sidecar start; block startup with progress logged. Alternative: ship a `make download-model` script that runs separately. Default = auto-download.

**D2. Execution provider on M-series Macs.** Recommendation: attempt `CoreMLExecutionProvider` first, fall back to `CPUExecutionProvider` with a warning. CoreML compile-step delays first inference ~10-30s; subsequent runs fast. Alternative: CPU only for simplicity. Default = CoreML with fallback.

**D3. Re-filter scope when YAML changes.**
  - `keywords.yml` → re-scan L1 for all papers (text match, cheap, ~seconds even on 10k papers)
  - `seeds.yml` or `topics.yml` → re-embed anchors (~2s), re-score L2 only for papers in last 90d window (~minutes; older papers stay as-is)
  - `tiers.yml` → re-score L3 for all papers (pure function, cheap)
  - Alternative: require explicit "Recompute" button in each tab. Default = auto on change, with logged progress.

**D4. Unit-test embedder.** Recommendation: ship `backend/tests/fixtures/bge_m3_stub.py` — a deterministic fake that hashes input text to a 1024-dim vector with stable topic-bias (e.g. text containing "LLM" biases toward one slot, "asset pricing" toward another). Unit tests monkeypatch `embedding.embed` to the stub. One integration test in `test_filter_pipeline_e2e.py` uses the real model (marked `@pytest.mark.slow`, skipped in CI). Alternative: always-real. Default = stub + one slow smoke.

**D5. Pipeline invocation trigger.** Recommendation: post-ingest per-paper inline (run_source loops over new ids and calls filter_paper each). For bulk rescores (after YAML change or initial backfill), `rescore_bulk` iterates all papers in batches of 32 (embedding batch size). Alternative: separate scheduled job decoupled from ingest. Default = inline + bulk-on-rule-change.

All defaults are conservative and align with user's prior "spec frozen, execute" stance. Flagging them here so nothing about the 1.2GB download surprises you on first dev run.

---

## Pre-flight: Dependencies & Model Download Script

### Task 0: Add dependencies and model dir helper

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/paperpulse/paths.py`
- Modify: `Makefile`
- Create: `backend/tests/unit/filter/__init__.py`
- Modify: `backend/uv.lock` (via `uv lock`)

- [ ] **Step 1: Add deps to pyproject.toml**

Add to the `[project] dependencies` array:
```toml
  "onnxruntime>=1.20,<2.0",
  "tokenizers>=0.20,<1.0",
  "huggingface_hub>=0.27,<1.0",
  "numpy>=2.0,<3.0",
```

- [ ] **Step 2: Run uv lock and uv sync**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv lock && uv sync
```
Expected: all four packages installed; `numpy` likely already present as transitive (duckdb/lancedb).

- [ ] **Step 3: Add models_dir() to paths.py**

Add to `backend/paperpulse/paths.py`:
```python
def models_dir() -> Path:
    """Directory for downloaded ML models (bge-m3 ONNX, etc.).

    Defaults to ~/.paperpulse/models; override via $PAPERPULSE_MODELS_DIR.
    Created lazily on first call.
    """
    env = os.environ.get("PAPERPULSE_MODELS_DIR")
    base = Path(env).expanduser() if env else Path.home() / ".paperpulse" / "models"
    base.mkdir(parents=True, exist_ok=True)
    return base
```

- [ ] **Step 4: Add empty test package**

```bash
touch /Users/barca/Dev/paperpulse/backend/tests/unit/filter/__init__.py
```

- [ ] **Step 5: Verify nothing broke**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest -q
```
Expected: existing 67 tests still pass.

- [ ] **Step 6: Commit**

```bash
git add backend/pyproject.toml backend/uv.lock backend/paperpulse/paths.py backend/tests/unit/filter/__init__.py
git commit -m "chore(phase3): add ONNX/tokenizers/hf_hub deps + models_dir helper"
```

---

## PR #3.1 — Keywords L1 rule filter + Settings shell + Keywords Tab

### Task 1.1: Test-drive keyword L1 filter

**Files:**
- Create: `backend/tests/unit/filter/test_keywords.py`
- Create: `backend/paperpulse/filter/__init__.py`
- Create: `backend/paperpulse/filter/keywords.py`

- [ ] **Step 1: Write failing tests for L1 rules (spec §10.1)**

```python
# backend/tests/unit/filter/test_keywords.py
"""L1 keyword filter — spec §10.1.

Cases:
- Tier A venue match → pass with reason venue_A:*
- Positive keyword present → pass with reason kw+:*
- No positive hit → fail
- Strong-negative + non-immune context → fail  (handled at L2 per spec,
  L1 only checks positive list. Kept here to document.)
"""
from __future__ import annotations

from dataclasses import dataclass

from paperpulse.filter.keywords import Keywords, level1_filter


@dataclass
class _P:
    title: str
    abstract: str | None
    venue_normalized: str | None = None


def _kws(**kwargs) -> Keywords:
    return Keywords(
        positive_cs_core=kwargs.get("cs", []),
        positive_finance_core=kwargs.get("fin", []),
        positive_crosscut=kwargs.get("xc", []),
        strong_negative=kwargs.get("sn", []),
        weak_negative=kwargs.get("wn", []),
        immune=kwargs.get("im", []),
    )


def test_venue_tier_a_bypass_passes():
    kw = _kws()  # no positive terms at all
    paper = _P(title="Foo", abstract=None, venue_normalized="NeurIPS")
    ok, reasons = level1_filter(paper, kw, tier_a_venues={"NeurIPS", "ICML"})
    assert ok is True
    assert reasons == ["venue_A:NeurIPS"]


def test_positive_keyword_matches_case_insensitive():
    kw = _kws(cs=["Large Language Model"], fin=["asset pricing"])
    paper = _P(title="A study on large language models", abstract="")
    ok, reasons = level1_filter(paper, kw, tier_a_venues=set())
    assert ok is True
    assert any(r.startswith("kw+:large language model") for r in reasons)


def test_no_positive_hit_fails():
    kw = _kws(cs=["llm"], fin=["factor"])
    paper = _P(title="Image classification with CNNs", abstract="ResNet")
    ok, reasons = level1_filter(paper, kw, tier_a_venues=set())
    assert ok is False
    assert reasons == []


def test_reasons_capped_at_three():
    kw = _kws(cs=["a", "b", "c", "d", "e"])
    paper = _P(title="a b c d e", abstract="")
    ok, reasons = level1_filter(paper, kw, tier_a_venues=set())
    assert ok is True
    assert len(reasons) == 3


def test_venue_case_insensitive():
    kw = _kws()
    paper = _P(title="", abstract=None, venue_normalized="neurips")
    ok, reasons = level1_filter(paper, kw, tier_a_venues={"NeurIPS"})
    assert ok is True
    assert reasons == ["venue_A:NeurIPS"]
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/unit/filter/test_keywords.py -v
```
Expected: ImportError `No module named paperpulse.filter`.

- [ ] **Step 3: Implement keywords.py**

```python
# backend/paperpulse/filter/__init__.py
"""Three-level filtering pipeline. See spec §10."""
```

```python
# backend/paperpulse/filter/keywords.py
"""L1 keyword rule filter. Pure function; no DB access.

Spec §10.1. Venue Tier-A bypass first, then positive keyword presence.
Negative/immune logic lives in L2 per spec — L1 only decides
"does this paper clear the keyword gate".
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Protocol


@dataclass(frozen=True)
class Keywords:
    positive_cs_core: list[str] = field(default_factory=list)
    positive_finance_core: list[str] = field(default_factory=list)
    positive_crosscut: list[str] = field(default_factory=list)
    strong_negative: list[str] = field(default_factory=list)
    weak_negative: list[str] = field(default_factory=list)
    immune: list[str] = field(default_factory=list)

    def positive_flat(self) -> list[str]:
        return [*self.positive_cs_core, *self.positive_finance_core, *self.positive_crosscut]


class _PaperLike(Protocol):
    title: str
    abstract: str | None
    venue_normalized: str | None


def level1_filter(
    paper: _PaperLike,
    keywords: Keywords,
    tier_a_venues: Iterable[str],
) -> tuple[bool, list[str]]:
    """Return (passed, reasons).

    Reasons format: ``["venue_A:NeurIPS"]`` or ``["kw+:llm", "kw+:asset pricing"]``.
    Empty list when not passed.
    """
    venues_lower = {v.lower(): v for v in tier_a_venues}
    if paper.venue_normalized and paper.venue_normalized.lower() in venues_lower:
        canonical = venues_lower[paper.venue_normalized.lower()]
        return True, [f"venue_A:{canonical}"]

    text = (paper.title + " " + (paper.abstract or "")).lower()
    hits: list[str] = []
    for kw in keywords.positive_flat():
        if kw.lower() in text:
            hits.append(kw.lower())
            if len(hits) >= 3:
                break
    if not hits:
        return False, []
    return True, [f"kw+:{kw}" for kw in hits]
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/unit/filter/test_keywords.py -v
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/paperpulse/filter/__init__.py backend/paperpulse/filter/keywords.py backend/tests/unit/filter/test_keywords.py
git commit -m "feat(filter): PR #3.1 L1 keyword rule filter (spec §10.1)"
```

### Task 1.2: Keywords loader from YAML + ConfigStore adapter

**Files:**
- Create: `backend/paperpulse/filter/anchors.py` (partial — keywords portion)
- Create: `backend/tests/unit/filter/test_anchors.py` (keywords portion)

- [ ] **Step 1: Write failing test — load_keywords_from_config**

```python
# backend/tests/unit/filter/test_anchors.py
"""Anchor & keyword loaders built on top of ConfigStore.

Cached accessors that rebuild on YAML reload.
"""
from __future__ import annotations

from paperpulse.config import ConfigStore
from paperpulse.filter.anchors import load_keywords, load_tier_a_venues


def test_load_keywords_from_store(tmp_path, monkeypatch):
    cfg_dir = tmp_path / "config"
    cfg_dir.mkdir()
    (cfg_dir / "keywords.yml").write_text(
        "positive:\n"
        "  cs_core: [\"LLM\"]\n"
        "  finance_core: [\"asset pricing\"]\n"
        "  crosscut: []\n"
        "strong_negative: [\"image classification\"]\n"
        "weak_negative: []\n"
        "immune: [\"finance\"]\n",
        encoding="utf-8",
    )
    # Minimal tiers.yml for load_tier_a_venues
    (cfg_dir / "tiers.yml").write_text(
        "tier_rules:\n  A:\n    venues: [\"NeurIPS\"]\n    auto_include: true\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(cfg_dir))

    store = ConfigStore()
    store.load_all()

    kws = load_keywords(store)
    assert kws.positive_cs_core == ["LLM"]
    assert kws.positive_finance_core == ["asset pricing"]
    assert kws.immune == ["finance"]

    venues = load_tier_a_venues(store)
    assert "NeurIPS" in venues
```

- [ ] **Step 2: Run — expect FAIL (module missing)**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/unit/filter/test_anchors.py -v
```

- [ ] **Step 3: Implement partial anchors.py (keywords only for now)**

```python
# backend/paperpulse/filter/anchors.py
"""Loaders that translate ConfigStore YAML into typed filter inputs.

Seed/topic embedding cache arrives in Task 2.2. This file starts with
cheap loaders (keywords, venues, tier rules); the heavier anchor cache
lands once embedding.py exists.
"""
from __future__ import annotations

from paperpulse.config import ConfigStore
from paperpulse.filter.keywords import Keywords


def load_keywords(store: ConfigStore) -> Keywords:
    cfg = store.get("keywords") or {}
    pos = cfg.get("positive") or {}
    return Keywords(
        positive_cs_core=list(pos.get("cs_core") or []),
        positive_finance_core=list(pos.get("finance_core") or []),
        positive_crosscut=list(pos.get("crosscut") or []),
        strong_negative=list(cfg.get("strong_negative") or []),
        weak_negative=list(cfg.get("weak_negative") or []),
        immune=list(cfg.get("immune") or []),
    )


def load_tier_a_venues(store: ConfigStore) -> set[str]:
    cfg = store.get("tiers") or {}
    venues = (cfg.get("tier_rules") or {}).get("A", {}).get("venues") or []
    return set(venues)
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/unit/filter/test_anchors.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/paperpulse/filter/anchors.py backend/tests/unit/filter/test_anchors.py
git commit -m "feat(filter): keywords/venue loaders backed by ConfigStore"
```

### Task 1.3: Settings API — GET /settings/keywords + POST /settings/keywords

**Files:**
- Create: `backend/paperpulse/api/filter_settings.py`
- Create: `backend/tests/integration/test_filter_settings_api.py`
- Modify: `backend/paperpulse/api/router.py`

- [ ] **Step 1: Write failing integration test**

```python
# backend/tests/integration/test_filter_settings_api.py
"""Settings API: round-trip YAML via GET/POST."""
from __future__ import annotations

from fastapi.testclient import TestClient

from paperpulse.main import app


def test_get_keywords_returns_current_yaml(client: TestClient):
    r = client.get("/api/v1/settings/keywords")
    assert r.status_code == 200
    body = r.json()
    assert "positive" in body
    assert "cs_core" in body["positive"]


def test_post_keywords_persists_and_reloads(client: TestClient, tmp_config_dir):
    new = {
        "positive": {"cs_core": ["foo"], "finance_core": ["bar"], "crosscut": []},
        "strong_negative": [],
        "weak_negative": [],
        "immune": [],
    }
    r = client.post("/api/v1/settings/keywords", json=new)
    assert r.status_code == 200
    # Follow-up GET sees new state
    r2 = client.get("/api/v1/settings/keywords")
    assert r2.json()["positive"]["cs_core"] == ["foo"]
```

Add `client` + `tmp_config_dir` fixtures to `backend/tests/conftest.py` if they don't already exist. The existing `isolate_runtime` autouse fixture points `PAPERPULSE_CONFIG_DIR` at tmp_path/config — reuse that. Expose a `client` fixture:

```python
# backend/tests/conftest.py — add
@pytest.fixture
def client(isolate_runtime) -> Iterator[TestClient]:
    from paperpulse.main import app
    with TestClient(app) as c:
        yield c

@pytest.fixture
def tmp_config_dir(isolate_runtime) -> Path:
    from paperpulse.paths import config_dir
    return config_dir()
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/integration/test_filter_settings_api.py -v
```

- [ ] **Step 3: Implement filter_settings.py**

```python
# backend/paperpulse/api/filter_settings.py
"""Settings endpoints for Phase 3 filter rules.

Each endpoint:
 - GET returns current parsed YAML
 - POST validates, writes YAML to disk via safe_dump, triggers ConfigStore reload

The watchdog observer will also fire for the disk write — both paths converge
on the same in-memory state.
"""
from __future__ import annotations

from typing import Any

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from paperpulse.config import store as config_store
from paperpulse.paths import config_dir

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


def _read(name: str) -> dict[str, Any]:
    cfg = config_store.get(name) or {}
    return cfg  # type: ignore[no-any-return]


def _write(name: str, payload: dict[str, Any]) -> None:
    path = config_dir() / f"{name}.yml"
    text = yaml.safe_dump(payload, sort_keys=False, allow_unicode=True)
    path.write_text(text, encoding="utf-8")
    config_store.reload(name)


# ── Keywords ──────────────────────────────────────────────────────────────

class KeywordsPayload(BaseModel):
    positive: dict[str, list[str]]
    strong_negative: list[str]
    weak_negative: list[str]
    immune: list[str]


@router.get("/keywords")
async def get_keywords() -> dict[str, Any]:
    return _read("keywords")


@router.post("/keywords")
async def post_keywords(payload: KeywordsPayload) -> dict[str, Any]:
    # Minimal validation: required positive buckets
    pos = payload.positive
    for k in ("cs_core", "finance_core", "crosscut"):
        if k not in pos:
            raise HTTPException(422, f"positive.{k} missing")
    _write("keywords", payload.model_dump())
    return _read("keywords")
```

- [ ] **Step 4: Register router**

```python
# backend/paperpulse/api/router.py — add
from paperpulse.api import filter_settings
...
app.include_router(filter_settings.router)
```

- [ ] **Step 5: Run — expect PASS**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/integration/test_filter_settings_api.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/paperpulse/api/filter_settings.py backend/paperpulse/api/router.py backend/tests/integration/test_filter_settings_api.py backend/tests/conftest.py
git commit -m "feat(api): GET/POST /settings/keywords + watchdog reload round-trip"
```

### Task 1.4: Wire L1 into ingest pipeline

**Files:**
- Modify: `backend/paperpulse/ingest/dedup.py` (return `(paper_id, is_new)`)
- Modify: `backend/paperpulse/ingest/runner.py` (call `filter_paper_l1` for new ids)
- Create: `backend/paperpulse/filter/pipeline.py` (stub with `filter_paper_l1` only for now; L2/L3 lands in later PRs)
- Create: `backend/tests/integration/test_ingest_filter_integration.py`

- [ ] **Step 1: Write failing integration test**

```python
# backend/tests/integration/test_ingest_filter_integration.py
"""After ingest, papers matching keywords have level1_passed=true."""
from __future__ import annotations

from paperpulse.db.duckdb_client import fetchall
from paperpulse.filter.pipeline import filter_paper_l1
from paperpulse.ingest.base import RawPaper
from paperpulse.ingest.dedup import upsert_raw


def test_l1_marks_keyword_match(isolate_runtime):
    raw = RawPaper(
        source="arxiv",
        source_id="9999.99999",
        doi=None,
        arxiv_id="9999.99999",
        title="A Large Language Model for asset pricing",
        abstract="We fine-tune an LLM on returns data.",
        authors=[{"name": "Test Author"}],
        venue=None,
        published_at="2026-04-01",
        pdf_url=None,
        html_url=None,
    )
    pid, is_new = upsert_raw(raw)
    assert is_new is True
    filter_paper_l1(pid)

    row = fetchall("SELECT level1_passed, level1_reasons FROM papers WHERE id = ?", [pid])[0]
    assert row[0] is True
    import json as _j
    assert any("kw+:" in r for r in _j.loads(row[1]))


def test_l1_rejects_off_topic(isolate_runtime):
    raw = RawPaper(
        source="arxiv",
        source_id="9999.00001",
        doi=None,
        arxiv_id="9999.00001",
        title="Protein folding with AlphaFold",
        abstract="Molecular dynamics simulation.",
        authors=[],
        venue=None,
        published_at="2026-04-01",
        pdf_url=None,
        html_url=None,
    )
    pid, is_new = upsert_raw(raw)
    filter_paper_l1(pid)
    row = fetchall("SELECT level1_passed FROM papers WHERE id = ?", [pid])[0]
    assert row[0] is False
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Modify dedup.upsert_raw to return (id, is_new)**

Update signature to `-> tuple[str, bool]`. Update all callers in `backend/paperpulse/ingest/runner.py` and any tests currently consuming the old single-id return (`grep -rn "upsert_raw" backend/` first; expect ~3 call sites).

- [ ] **Step 4: Implement filter_paper_l1**

```python
# backend/paperpulse/filter/pipeline.py
"""Filter orchestrator. L2/L3 stubs land in later PRs."""
from __future__ import annotations

import json
from dataclasses import dataclass

from paperpulse.config import store as config_store
from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.filter.anchors import load_keywords, load_tier_a_venues
from paperpulse.filter.keywords import level1_filter


@dataclass
class _P:
    title: str
    abstract: str | None
    venue_normalized: str | None


def _load_paper(pid: str) -> _P | None:
    rows = fetchall(
        "SELECT title, abstract, venue_normalized FROM papers WHERE id = ?", [pid]
    )
    if not rows:
        return None
    r = rows[0]
    return _P(title=r[0], abstract=r[1], venue_normalized=r[2])


def filter_paper_l1(paper_id: str) -> tuple[bool, list[str]]:
    paper = _load_paper(paper_id)
    if paper is None:
        return False, []
    kws = load_keywords(config_store)
    venues = load_tier_a_venues(config_store)
    ok, reasons = level1_filter(paper, kws, venues)
    execute(
        "UPDATE papers SET level1_passed = ?, level1_reasons = ? WHERE id = ?",
        [ok, json.dumps(reasons), paper_id],
    )
    return ok, reasons
```

- [ ] **Step 5: Wire runner.py to call filter_paper_l1 on new ids**

```python
# backend/paperpulse/ingest/runner.py — inside run_source, after upsert_raw
from paperpulse.filter.pipeline import filter_paper_l1
...
pid, is_new = upsert_raw(raw)
if is_new:
    try:
        filter_paper_l1(pid)
    except Exception:
        _log.exception("L1 filter failed for %s", pid)
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/integration/test_ingest_filter_integration.py tests/integration/test_ingest_end_to_end.py -v
```

- [ ] **Step 7: Bulk L1 rescore on keywords.yml change**

Add to `backend/paperpulse/main.py` startup (or a new `filter/subscribers.py`):

```python
def _on_keywords_change(_name: str) -> None:
    _log.info("keywords.yml changed — rescoring L1")
    rows = fetchall("SELECT id FROM papers")
    for (pid,) in rows:
        try:
            filter_paper_l1(pid)
        except Exception:
            _log.exception("L1 rescore failed for %s", pid)


config_store.subscribe("keywords", _on_keywords_change)
```

Add test: edit keywords.yml via POST, assert `level1_passed` flips for a paper that matches the new positive list. (Add to `test_filter_settings_api.py`.)

- [ ] **Step 8: Commit**

```bash
git add backend/paperpulse/ingest/dedup.py backend/paperpulse/ingest/runner.py backend/paperpulse/filter/pipeline.py backend/paperpulse/main.py backend/tests/integration/test_ingest_filter_integration.py backend/tests/integration/test_filter_settings_api.py
git commit -m "feat(filter): wire L1 into ingest + rescore on keywords.yml change"
```

### Task 1.5: Port shadcn UI primitives from design-reference

**Files:**
- Create: `src/components/ui/{textarea,switch,slider,select,radio-group,checkbox,badge,separator,label,input,scroll-area}.tsx`
- Modify: `package.json` (add `@radix-ui/react-switch`, `@radix-ui/react-slider`, `@radix-ui/react-select`, `@radix-ui/react-radio-group`, `@radix-ui/react-checkbox`, `@radix-ui/react-separator`, `@radix-ui/react-label`, `@radix-ui/react-scroll-area`, `class-variance-authority`)

- [ ] **Step 1: Install Radix primitives via pnpm**

```bash
cd /Users/barca/Dev/paperpulse && pnpm add @radix-ui/react-switch @radix-ui/react-slider @radix-ui/react-select @radix-ui/react-radio-group @radix-ui/react-checkbox @radix-ui/react-separator @radix-ui/react-label @radix-ui/react-scroll-area class-variance-authority
```

- [ ] **Step 2: Copy UI primitives from design-reference**

For each component listed above, copy verbatim from `design-reference/design/src/components/ui/<name>.tsx` into `src/components/ui/<name>.tsx`. These files are self-contained (import only `@radix-ui/*`, `class-variance-authority`, and `cn` from `@/lib/utils`).

- [ ] **Step 3: Run tsc + build to confirm no breakage**

```bash
cd /Users/barca/Dev/paperpulse && pnpm exec tsc --noEmit && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/ package.json pnpm-lock.yaml
git commit -m "chore(ui): port shadcn primitives for Settings tabs"
```

### Task 1.6: Settings shell + Keywords Tab UI

**Files:**
- Create: `src/pages/settings/_parts.tsx`
- Create: `src/pages/settings/index.tsx`
- Create: `src/pages/settings/KeywordsTab.tsx`
- Create: `src/lib/settings.ts`
- Create: `src/hooks/useSettings.ts`
- Modify: `src/App.tsx` (route `/settings/*`)
- Modify: `src/components/layout/SideNav.tsx` (Settings already wired — confirm path)

- [ ] **Step 1: Copy _parts.tsx from design-reference**

Copy `design-reference/design/src/pages/settings/_parts.tsx` verbatim into `src/pages/settings/_parts.tsx`. It exports `SettingsSection`, `SettingsRow`, `SettingsCard`.

- [ ] **Step 2: Add API client**

```typescript
// src/lib/settings.ts
import { api } from "./api";

export interface KeywordsPayload {
  positive: { cs_core: string[]; finance_core: string[]; crosscut: string[] };
  strong_negative: string[];
  weak_negative: string[];
  immune: string[];
}

export async function getKeywords(): Promise<KeywordsPayload> {
  const r = await fetch(`${api.base}/settings/keywords`);
  if (!r.ok) throw new Error(`getKeywords ${r.status}`);
  return r.json();
}

export async function saveKeywords(p: KeywordsPayload): Promise<KeywordsPayload> {
  const r = await fetch(`${api.base}/settings/keywords`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw new Error(`saveKeywords ${r.status}`);
  return r.json();
}
```

(Ensure `src/lib/api.ts` exports `api.base = "http://127.0.0.1:8765/api/v1"` — it should already from Phase 1.)

- [ ] **Step 3: Add typed hook**

```typescript
// src/hooks/useSettings.ts
import { useEffect, useState } from "react";
import { getKeywords, saveKeywords, type KeywordsPayload } from "@/lib/settings";

type State<T> =
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string };

export function useKeywords() {
  const [state, setState] = useState<State<KeywordsPayload>>({ kind: "loading" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getKeywords()
      .then((data) => setState({ kind: "ok", data }))
      .catch((e) => setState({ kind: "error", message: String(e) }));
  }, []);

  async function save(next: KeywordsPayload) {
    setSaving(true);
    try {
      const fresh = await saveKeywords(next);
      setState({ kind: "ok", data: fresh });
    } catch (e) {
      setState({ kind: "error", message: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return { state, save, saving };
}
```

- [ ] **Step 4: Settings shell with tabs**

```typescript
// src/pages/settings/index.tsx
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { cn } from "@/lib/utils";
import KeywordsTab from "./KeywordsTab";
// SeedsTab, TopicsTab, TierRulesTab placeholder imports added in later PRs

const TABS = [
  { slug: "keywords", label: "Keywords" },
  { slug: "seeds", label: "Seeds" },
  { slug: "topics", label: "Topics" },
  { slug: "tiers", label: "Tier Rules" },
];

export default function Settings() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 border-b">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Edit filter rules. Changes apply in real time.
        </p>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <nav className="w-48 border-r p-3 flex flex-col gap-1">
          {TABS.map((t) => (
            <NavLink
              key={t.slug}
              to={t.slug}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-xs rounded hover:bg-muted",
                  isActive && "bg-muted font-medium",
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route index element={<Navigate to="keywords" replace />} />
            <Route path="keywords" element={<KeywordsTab />} />
            <Route path="seeds" element={<div className="p-6 text-sm text-muted-foreground">Seeds tab — PR #3.3</div>} />
            <Route path="topics" element={<div className="p-6 text-sm text-muted-foreground">Topics tab — PR #3.4</div>} />
            <Route path="tiers" element={<div className="p-6 text-sm text-muted-foreground">Tier Rules tab — PR #3.5</div>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Keywords tab**

```typescript
// src/pages/settings/KeywordsTab.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "./_parts";
import { useKeywords } from "@/hooks/useSettings";

// Minimal Phase 3 impl: textarea per bucket (one term per line).
// Design-reference has inline add/remove chips — acceptable improvement
// for later polish (Phase 8). Focus now: correctness of round-trip.

function lines(arr: string[]): string { return arr.join("\n"); }
function parse(s: string): string[] {
  return s.split("\n").map((l) => l.trim()).filter(Boolean);
}

export default function KeywordsTab() {
  const { state, save, saving } = useKeywords();
  const [buckets, setBuckets] = useState({
    cs_core: "", finance_core: "", crosscut: "",
    strong_negative: "", weak_negative: "", immune: "",
  });

  useEffect(() => {
    if (state.kind !== "ok") return;
    setBuckets({
      cs_core: lines(state.data.positive.cs_core),
      finance_core: lines(state.data.positive.finance_core),
      crosscut: lines(state.data.positive.crosscut),
      strong_negative: lines(state.data.strong_negative),
      weak_negative: lines(state.data.weak_negative),
      immune: lines(state.data.immune),
    });
  }, [state]);

  if (state.kind === "loading") return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (state.kind === "error") return <div className="p-6 text-sm text-destructive">{state.message}</div>;

  function onSave() {
    save({
      positive: {
        cs_core: parse(buckets.cs_core),
        finance_core: parse(buckets.finance_core),
        crosscut: parse(buckets.crosscut),
      },
      strong_negative: parse(buckets.strong_negative),
      weak_negative: parse(buckets.weak_negative),
      immune: parse(buckets.immune),
    });
  }

  return (
    <div className="p-6 max-w-4xl">
      <SettingsSection
        title="Keywords"
        description="L1 text filter. Positive terms are OR-ed (one hit passes). Negative terms penalize L2 scores; immune terms suppress the penalty."
      >
        <div className="space-y-4">
          {(["cs_core", "finance_core", "crosscut"] as const).map((k) => (
            <div key={k}>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">{k.replace("_", " ")}</Badge>
                <span className="text-[10px] text-muted-foreground">positive · one per line</span>
              </div>
              <Textarea
                value={buckets[k]}
                onChange={(e) => setBuckets((b) => ({ ...b, [k]: e.target.value }))}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          ))}
          {(["strong_negative", "weak_negative", "immune"] as const).map((k) => (
            <div key={k}>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={k === "immune" ? "default" : "destructive"}>
                  {k.replace("_", " ")}
                </Badge>
              </div>
              <Textarea
                value={buckets[k]}
                onChange={(e) => setBuckets((b) => ({ ...b, [k]: e.target.value }))}
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          ))}
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save keywords"}
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
```

- [ ] **Step 6: Wire route**

```typescript
// src/App.tsx — replace the Settings stub import
import Settings from "@/pages/settings";
...
<Route path="/settings/*" element={<Settings />} />
```

- [ ] **Step 7: Smoke test via real backend**

```bash
cd /Users/barca/Dev/paperpulse && make dev   # user-level smoke
```
Manual: open Settings → Keywords, edit one term, Save, reload page — edit persists. Trigger ingest — a paper matching the new term shows `level1_passed=true` in DB.

- [ ] **Step 8: make all**

```bash
cd /Users/barca/Dev/paperpulse && make all
```
Expected: lint + typecheck + all tests green.

- [ ] **Step 9: Commit**

```bash
git add src/pages/settings src/lib/settings.ts src/hooks/useSettings.ts src/App.tsx
git commit -m "feat(ui): PR #3.1 Settings shell + Keywords tab"
```

---

## PR #3.2 — Embedding service (bge-m3 ONNX) + seed/topic anchor cache

### Task 2.1: Embedding service with download + inference

**Files:**
- Create: `backend/paperpulse/filter/embedding.py`
- Create: `backend/tests/unit/filter/test_embedding.py`
- Create: `backend/tests/fixtures/bge_m3_stub.py`

- [ ] **Step 1: Write failing test for stub embedder**

```python
# backend/tests/unit/filter/test_embedding.py
"""Embedding service — unit tests use deterministic stub; real bge-m3 lives
in integration test_filter_pipeline_e2e.py::test_real_embedding_smoke[slow].
"""
from __future__ import annotations

import numpy as np

from paperpulse.filter import embedding
from tests.fixtures.bge_m3_stub import StubEmbedder


def test_stub_is_deterministic():
    stub = StubEmbedder()
    v1 = stub.embed(["hello world"])[0]
    v2 = stub.embed(["hello world"])[0]
    assert np.allclose(v1, v2)


def test_stub_biases_by_token():
    stub = StubEmbedder()
    llm_vec = stub.embed(["LLM agent trading"])[0]
    cv_vec = stub.embed(["image recognition benchmark"])[0]
    # Different text → different vectors
    assert not np.allclose(llm_vec, cv_vec)
    # Both unit-normalized
    assert abs(np.linalg.norm(llm_vec) - 1.0) < 1e-4


def test_service_uses_injected_backend(monkeypatch):
    stub = StubEmbedder()
    monkeypatch.setattr(embedding, "_backend", stub)
    v = embedding.embed(["test"])
    assert v.shape == (1, 1024)
```

- [ ] **Step 2: Write the stub fixture**

```python
# backend/tests/fixtures/bge_m3_stub.py
"""Deterministic fake of bge-m3 for unit tests. Hashes tokens into a sparse
1024-dim vector, then L2-normalizes. Same text → same vector."""
from __future__ import annotations

import hashlib
from typing import Sequence

import numpy as np


class StubEmbedder:
    DIM = 1024

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        out = np.zeros((len(texts), self.DIM), dtype=np.float32)
        for i, t in enumerate(texts):
            tokens = t.lower().split()
            for tok in tokens:
                h = int.from_bytes(hashlib.sha1(tok.encode()).digest()[:4], "big")
                out[i, h % self.DIM] += 1.0
            n = float(np.linalg.norm(out[i]))
            if n > 0:
                out[i] /= n
            else:
                out[i, 0] = 1.0
        return out
```

- [ ] **Step 3: Run — expect FAIL (module missing)**

- [ ] **Step 4: Implement embedding.py with lazy real-backend + injection hook**

```python
# backend/paperpulse/filter/embedding.py
"""bge-m3 ONNX embedding service.

Lazy-loaded singleton. `embed(texts)` returns shape (N, 1024) float32.
Unit tests inject a stub via monkeypatch on `_backend`.

Model download: first call fetches aapot/bge-m3-onnx to models_dir(). Blocking
with logged progress — sidecar startup may pause ~30s–60s on first launch.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Protocol, Sequence

import numpy as np

from paperpulse.paths import models_dir

_log = logging.getLogger(__name__)
_DIM = 1024
_MODEL_REPO = "aapot/bge-m3-onnx"
_MODEL_FILE = "model.onnx"
_TOKENIZER_FILE = "tokenizer.json"


class _EmbedBackend(Protocol):
    def embed(self, texts: Sequence[str]) -> np.ndarray: ...


class _OnnxBackend:
    def __init__(self) -> None:
        import onnxruntime as ort  # lazy import
        from tokenizers import Tokenizer

        model_dir = models_dir() / "bge-m3"
        model_dir.mkdir(parents=True, exist_ok=True)
        model_path = model_dir / _MODEL_FILE
        tok_path = model_dir / _TOKENIZER_FILE

        if not model_path.exists() or not tok_path.exists():
            self._download(model_dir)

        providers: list[str] = []
        if os.environ.get("PAPERPULSE_EMBED_PROVIDER") != "cpu":
            providers.append("CoreMLExecutionProvider")
        providers.append("CPUExecutionProvider")
        _log.info("loading bge-m3 ONNX, providers=%s", providers)
        self._session = ort.InferenceSession(str(model_path), providers=providers)
        self._tokenizer = Tokenizer.from_file(str(tok_path))
        self._tokenizer.enable_padding()
        self._tokenizer.enable_truncation(max_length=8192)

    @staticmethod
    def _download(model_dir: Path) -> None:
        from huggingface_hub import hf_hub_download
        _log.info("downloading bge-m3 ONNX to %s (one-time, ~1.2GB)", model_dir)
        for f in (_MODEL_FILE, _TOKENIZER_FILE):
            hf_hub_download(
                repo_id=_MODEL_REPO,
                filename=f,
                local_dir=str(model_dir),
            )

    def embed(self, texts: Sequence[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, _DIM), dtype=np.float32)
        encs = self._tokenizer.encode_batch(list(texts))
        input_ids = np.array([e.ids for e in encs], dtype=np.int64)
        attention_mask = np.array([e.attention_mask for e in encs], dtype=np.int64)
        outputs = self._session.run(
            None,
            {"input_ids": input_ids, "attention_mask": attention_mask},
        )
        # bge-m3 onnx output: dense embeddings at index 0, shape (N, 1024)
        emb = outputs[0].astype(np.float32)
        # L2 normalize
        norms = np.linalg.norm(emb, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return emb / norms


_backend: _EmbedBackend | None = None


def _get_backend() -> _EmbedBackend:
    global _backend
    if _backend is None:
        _backend = _OnnxBackend()
    return _backend


def embed(texts: Sequence[str]) -> np.ndarray:
    """Return (N, 1024) L2-normalized embeddings."""
    return _get_backend().embed(list(texts))


def warmup() -> None:
    """Call from sidecar startup to pay download+compile cost eagerly."""
    _get_backend().embed(["warmup"])
```

- [ ] **Step 5: Run unit tests — expect PASS**

```bash
cd /Users/barca/Dev/paperpulse && uv --directory backend run pytest tests/unit/filter/test_embedding.py -v
```

- [ ] **Step 6: Add integration smoke (marked slow)**

```python
# backend/tests/integration/test_filter_pipeline_e2e.py — placeholder file at this stage
import os
import pytest


@pytest.mark.slow
@pytest.mark.skipif(
    os.environ.get("PAPERPULSE_RUN_SLOW") != "1",
    reason="requires PAPERPULSE_RUN_SLOW=1 (downloads bge-m3, ~1.2GB)",
)
def test_real_bge_m3_embedding():
    from paperpulse.filter.embedding import embed
    v = embed(["Large language models for asset pricing"])
    assert v.shape == (1, 1024)
    assert abs(float((v ** 2).sum()) - 1.0) < 1e-3  # L2-normalized
```

- [ ] **Step 7: Commit**

```bash
git add backend/paperpulse/filter/embedding.py backend/tests/unit/filter/test_embedding.py backend/tests/fixtures/bge_m3_stub.py backend/tests/integration/test_filter_pipeline_e2e.py
git commit -m "feat(filter): PR #3.2 bge-m3 ONNX embedding service + stub"
```

### Task 2.2: Paper-vector persistence (LanceDB)

**Files:**
- Modify: `backend/paperpulse/filter/embedding.py` (add `get_or_compute_paper_vector`)
- Create: `backend/paperpulse/filter/vectors_store.py`
- Create: `backend/tests/unit/filter/test_vectors_store.py`

- [ ] **Step 1: Failing test**

```python
# backend/tests/unit/filter/test_vectors_store.py
from __future__ import annotations

import numpy as np

from paperpulse.filter.vectors_store import PaperVectorStore


def test_store_roundtrip(isolate_runtime):
    store = PaperVectorStore()
    vec = np.random.rand(1024).astype(np.float32)
    store.put("paper_abc", "hash1", vec)
    got = store.get("paper_abc")
    assert got is not None
    assert got.text_hash == "hash1"
    assert np.allclose(got.vector, vec)


def test_store_miss_returns_none(isolate_runtime):
    store = PaperVectorStore()
    assert store.get("nonexistent") is None
```

- [ ] **Step 2: Implement PaperVectorStore on LanceDB**

```python
# backend/paperpulse/filter/vectors_store.py
"""LanceDB-backed paper vector cache.

Schema: paper_id (str, PK), text_hash (str), vector (list[float32], 1024).
get() returns the stored record if text_hash matches expectation;
callers pass text_hash to detect stale entries (abstract edited, etc.).
"""
from __future__ import annotations

from dataclasses import dataclass

import lancedb  # type: ignore[import-untyped]
import numpy as np
import pyarrow as pa

from paperpulse.paths import data_dir

_TABLE = "paper_vectors"
_SCHEMA = pa.schema([
    pa.field("paper_id", pa.string()),
    pa.field("text_hash", pa.string()),
    pa.field("vector", pa.list_(pa.float32(), 1024)),
])


@dataclass
class PaperVector:
    paper_id: str
    text_hash: str
    vector: np.ndarray


class PaperVectorStore:
    def __init__(self) -> None:
        self._db = lancedb.connect(str(data_dir() / "papers.lance"))
        if _TABLE not in self._db.table_names():
            self._db.create_table(_TABLE, schema=_SCHEMA)
        self._tbl = self._db.open_table(_TABLE)

    def get(self, paper_id: str) -> PaperVector | None:
        df = self._tbl.search().where(f"paper_id = '{paper_id}'").limit(1).to_pandas()
        if df.empty:
            return None
        row = df.iloc[0]
        return PaperVector(
            paper_id=row["paper_id"],
            text_hash=row["text_hash"],
            vector=np.asarray(row["vector"], dtype=np.float32),
        )

    def put(self, paper_id: str, text_hash: str, vector: np.ndarray) -> None:
        # Upsert: delete then add (LanceDB simple approach)
        self._tbl.delete(f"paper_id = '{paper_id}'")
        self._tbl.add([{
            "paper_id": paper_id,
            "text_hash": text_hash,
            "vector": vector.astype(np.float32).tolist(),
        }])
```

- [ ] **Step 3: Run test — expect PASS**

- [ ] **Step 4: Add helper to embedding.py**

```python
# backend/paperpulse/filter/embedding.py — append
import hashlib


def text_hash(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def paper_input_text(title: str, abstract: str | None) -> str:
    return f"{title}\n\n{(abstract or '')[:1500]}"
```

- [ ] **Step 5: Commit**

```bash
git add backend/paperpulse/filter/embedding.py backend/paperpulse/filter/vectors_store.py backend/tests/unit/filter/test_vectors_store.py
git commit -m "feat(filter): LanceDB paper_vectors cache for embeddings"
```

### Task 2.3: Seed/topic anchor cache

**Files:**
- Modify: `backend/paperpulse/filter/anchors.py` (add AnchorCache)
- Extend: `backend/tests/unit/filter/test_anchors.py`

- [ ] **Step 1: Failing test**

```python
# backend/tests/unit/filter/test_anchors.py — append
from paperpulse.filter.anchors import AnchorCache
from paperpulse.filter import embedding as emb_module
from tests.fixtures.bge_m3_stub import StubEmbedder


def test_anchor_cache_embeds_topics(tmp_path, monkeypatch):
    cfg = tmp_path / "config"; cfg.mkdir()
    (cfg / "topics.yml").write_text(
        "topics:\n"
        "  - name: \"LLM Agents for Finance\"\n"
        "    slug: \"llm-agents-finance\"\n"
        "    side: \"crosscut\"\n"
        "    description_en: \"Agents trading with LLMs\"\n"
        "    description_zh: \"LLM 交易 agent\"\n"
        "    weight: 1.5\n",
        encoding="utf-8",
    )
    (cfg / "seeds.yml").write_text(
        "seed_papers: []\nuser_must_read_papers: []\nseed_meta: {}\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(cfg))
    monkeypatch.setattr(emb_module, "_backend", StubEmbedder())

    from paperpulse.config import ConfigStore
    store = ConfigStore(); store.load_all()

    cache = AnchorCache(store)
    cache.rebuild()
    assert "llm-agents-finance" in cache.topic_labels()
    assert cache.vectors_for_scoring().shape[0] >= 1
```

- [ ] **Step 2: Implement**

```python
# backend/paperpulse/filter/anchors.py — append
from __future__ import annotations

import datetime as _dt
import math

import numpy as np

from paperpulse.filter import embedding as _emb


class AnchorCache:
    """In-memory store of seed + topic embeddings + weights.

    Rebuilt on seeds.yml / topics.yml change. Access is O(1); rebuild
    embeds ~10-50 items in one batch call (<1s on CPU).
    """
    def __init__(self, store: ConfigStore) -> None:
        self._store = store
        self._vectors: np.ndarray = np.zeros((0, 1024), dtype=np.float32)
        self._weights: np.ndarray = np.zeros((0,), dtype=np.float32)
        self._labels: list[str] = []
        self._label_types: list[str] = []  # "seed" | "topic"

    def rebuild(self) -> None:
        topics = (self._store.get("topics") or {}).get("topics") or []
        seeds = self._store.get("seeds") or {}
        seed_papers = seeds.get("seed_papers") or []
        user_must = seeds.get("user_must_read_papers") or []

        texts: list[str] = []
        labels: list[str] = []
        label_types: list[str] = []
        weights: list[float] = []

        for t in topics:
            txt = f"{t.get('name','')}\n{t.get('description_en','')}\n{t.get('description_zh','')}"
            texts.append(txt)
            labels.append(t.get("slug") or t.get("name") or "?")
            label_types.append("topic")
            weights.append(float(t.get("weight") or 1.0))

        for s in seed_papers:
            txt = f"{s.get('title','')}\n\n{s.get('abstract','')[:1500]}"
            texts.append(txt)
            labels.append(f"seed:{s.get('id') or s.get('title','')[:40]}")
            label_types.append("seed")
            weights.append(float(s.get("base_weight") or 1.0))

        for s in user_must:
            txt = f"{s.get('title','')}\n\n{s.get('abstract','')[:1500]}"
            texts.append(txt)
            labels.append(f"user_seed:{s.get('id') or s.get('title','')[:40]}")
            label_types.append("seed")
            weights.append(_effective_weight(s))

        if texts:
            self._vectors = _emb.embed(texts)
        else:
            self._vectors = np.zeros((0, 1024), dtype=np.float32)
        self._weights = np.asarray(weights, dtype=np.float32)
        self._labels = labels
        self._label_types = label_types

    def topic_labels(self) -> list[str]:
        return [l for l, t in zip(self._labels, self._label_types) if t == "topic"]

    def vectors_for_scoring(self) -> np.ndarray:
        return self._vectors

    def weights_for_scoring(self) -> np.ndarray:
        return self._weights

    def labels(self) -> list[str]:
        return self._labels

    def label_types(self) -> list[str]:
        return self._label_types


def _effective_weight(seed: dict) -> float:
    base = float(seed.get("base_weight") or 1.0)
    hl = seed.get("half_life_days")
    added = seed.get("added_at")
    if hl is None or added is None:
        return base
    try:
        added_dt = _dt.datetime.fromisoformat(added)
    except (TypeError, ValueError):
        return base
    age = (_dt.datetime.now(_dt.timezone.utc) - added_dt).days
    return base * math.exp(-math.log(2) * age / float(hl))
```

- [ ] **Step 3: Run test — expect PASS**

- [ ] **Step 4: Wire into sidecar startup**

Modify `backend/paperpulse/main.py` lifespan startup:

```python
from paperpulse.filter import embedding as _emb
from paperpulse.filter.anchors import AnchorCache

anchor_cache: AnchorCache  # module-level singleton

@asynccontextmanager
async def lifespan(app: FastAPI):
    ...
    config_store.load_all()
    _emb.warmup()  # block on bge-m3 load
    global anchor_cache
    anchor_cache = AnchorCache(config_store)
    anchor_cache.rebuild()
    config_store.subscribe("seeds", lambda _: anchor_cache.rebuild())
    config_store.subscribe("topics", lambda _: anchor_cache.rebuild())
    yield
    ...
```

- [ ] **Step 5: Commit**

```bash
git add backend/paperpulse/filter/anchors.py backend/paperpulse/main.py backend/tests/unit/filter/test_anchors.py
git commit -m "feat(filter): seed+topic anchor cache with YAML reload hooks"
```

---

## PR #3.3 — L2 semantic filter + Seeds Tab

### Task 3.1: L2 filter pure function

**Files:**
- Create: `backend/paperpulse/filter/semantic.py`
- Create: `backend/tests/unit/filter/test_semantic.py`

- [ ] **Step 1: Failing test** (port spec §10.2 cases)

```python
# backend/tests/unit/filter/test_semantic.py
from __future__ import annotations

import numpy as np

from paperpulse.filter.semantic import L2Config, level2_filter


def test_semantic_match_above_threshold():
    paper_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    anchors = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    weights = np.array([1.0], dtype=np.float32)
    labels = ["topic:llm"]
    ok, score, label = level2_filter(
        paper_vec, anchors, weights, labels,
        text="some llm paper",
        keywords_strong_negative=[], keywords_weak_negative=[], keywords_immune=[],
        config=L2Config(similarity_threshold=0.5),
    )
    assert ok is True
    assert score >= 0.99
    assert label == "topic:llm"


def test_strong_negative_penalizes():
    paper_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    anchors = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    weights = np.array([1.0], dtype=np.float32)
    ok, score, _ = level2_filter(
        paper_vec, anchors, weights, ["topic:llm"],
        text="we benchmark an image classification dataset",
        keywords_strong_negative=["image classification"],
        keywords_weak_negative=[], keywords_immune=[],
        config=L2Config(similarity_threshold=0.5),
    )
    assert score < 0.5  # 1.0 * 0.3 = 0.3
    assert ok is False


def test_immune_overrides_negative():
    paper_vec = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    anchors = np.array([[1.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    weights = np.array([1.0], dtype=np.float32)
    ok, score, _ = level2_filter(
        paper_vec, anchors, weights, ["topic:llm"],
        text="image classification in finance",
        keywords_strong_negative=["image classification"],
        keywords_weak_negative=[], keywords_immune=["finance"],
        config=L2Config(similarity_threshold=0.5),
    )
    assert ok is True
    assert score >= 0.99
```

- [ ] **Step 2: Implement semantic.py**

```python
# backend/paperpulse/filter/semantic.py
"""L2 semantic filter. Spec §10.2.

Pure numpy function; receives already-embedded paper vec + anchor matrix.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np


@dataclass
class L2Config:
    similarity_threshold: float = 0.45


def _cosine(query: np.ndarray, anchors: np.ndarray) -> np.ndarray:
    # Inputs already L2-normalized → cosine == dot
    return anchors @ query


def level2_filter(
    paper_vec: np.ndarray,
    anchor_vectors: np.ndarray,
    anchor_weights: np.ndarray,
    anchor_labels: Sequence[str],
    *,
    text: str,
    keywords_strong_negative: Sequence[str],
    keywords_weak_negative: Sequence[str],
    keywords_immune: Sequence[str],
    config: L2Config,
) -> tuple[bool, float, str | None]:
    if anchor_vectors.size == 0:
        return False, 0.0, None
    sims = _cosine(paper_vec, anchor_vectors) * anchor_weights

    low = text.lower()
    immune = any(w.lower() in low for w in keywords_immune)
    if not immune:
        if any(w.lower() in low for w in keywords_strong_negative):
            sims = sims * 0.3
        elif any(w.lower() in low for w in keywords_weak_negative):
            sims = sims * 0.7

    idx = int(sims.argmax())
    max_sim = float(sims[idx])
    label = anchor_labels[idx] if anchor_labels else None
    return (max_sim >= config.similarity_threshold, max_sim, label)
```

- [ ] **Step 3: Run — expect PASS**

- [ ] **Step 4: Commit**

```bash
git add backend/paperpulse/filter/semantic.py backend/tests/unit/filter/test_semantic.py
git commit -m "feat(filter): L2 semantic filter pure function (spec §10.2)"
```

### Task 3.2: Integrate L2 into pipeline

**Files:**
- Modify: `backend/paperpulse/filter/pipeline.py` (add `filter_paper_l2` and update `filter_paper`)
- Modify: `backend/tests/integration/test_ingest_filter_integration.py`

- [ ] **Step 1: Add L2 code path**

```python
# backend/paperpulse/filter/pipeline.py — extend
from paperpulse.filter import embedding as _emb
from paperpulse.filter.semantic import L2Config, level2_filter
from paperpulse.filter.vectors_store import PaperVectorStore


def _get_anchor_cache():
    from paperpulse.main import anchor_cache
    return anchor_cache


def filter_paper_l2(paper_id: str) -> tuple[bool, float, str | None]:
    rows = fetchall(
        "SELECT title, abstract FROM papers WHERE id = ?", [paper_id]
    )
    if not rows:
        return False, 0.0, None
    title, abstract = rows[0]
    text = _emb.paper_input_text(title, abstract)
    th = _emb.text_hash(text)

    store = PaperVectorStore()
    cached = store.get(paper_id)
    if cached is not None and cached.text_hash == th:
        vec = cached.vector
    else:
        vec = _emb.embed([text])[0]
        store.put(paper_id, th, vec)

    cache = _get_anchor_cache()
    kws = load_keywords(config_store)
    ok, score, label = level2_filter(
        vec,
        cache.vectors_for_scoring(),
        cache.weights_for_scoring(),
        cache.labels(),
        text=text,
        keywords_strong_negative=kws.strong_negative,
        keywords_weak_negative=kws.weak_negative,
        keywords_immune=kws.immune,
        config=L2Config(similarity_threshold=0.45),
    )

    # derive primary_topic from best-matching label if it's a topic type
    primary_topic = None
    if label and label in cache.topic_labels():
        primary_topic = label

    execute(
        "UPDATE papers SET level2_score = ?, level2_matched_seed = ?, primary_topic = ? "
        "WHERE id = ?",
        [score, label, primary_topic, paper_id],
    )
    return ok, score, label


def filter_paper(paper_id: str) -> None:
    """Full pipeline for one paper. Spec §10.4."""
    l1_ok, _ = filter_paper_l1(paper_id)
    if not l1_ok:
        return
    filter_paper_l2(paper_id)
    # L3 added in PR #3.5
```

- [ ] **Step 2: Update runner.py to call full `filter_paper`**

Change `filter_paper_l1(pid)` → `filter_paper(pid)` in `backend/paperpulse/ingest/runner.py`.

- [ ] **Step 3: Integration test using stub embedder**

```python
# backend/tests/integration/test_ingest_filter_integration.py — append
def test_l2_scores_paper(isolate_runtime, monkeypatch):
    from paperpulse.filter import embedding as _emb
    from tests.fixtures.bge_m3_stub import StubEmbedder
    monkeypatch.setattr(_emb, "_backend", StubEmbedder())

    # Seed topics.yml with one topic so anchor cache has content
    from paperpulse.paths import config_dir
    (config_dir() / "topics.yml").write_text(
        "topics:\n"
        "  - name: LLM\n    slug: llm\n    side: cs\n"
        "    description_en: LLM\n    description_zh: LLM\n    weight: 1.0\n",
        encoding="utf-8",
    )
    from paperpulse.main import anchor_cache
    from paperpulse.config import store
    store.reload("topics")
    anchor_cache.rebuild()

    # ingest a paper
    raw = RawPaper(
        source="arxiv", source_id="t1", doi=None, arxiv_id="t1",
        title="LLM study", abstract="we explore large language models",
        authors=[], venue=None, published_at="2026-04-01",
        pdf_url=None, html_url=None,
    )
    pid, _ = upsert_raw(raw)
    from paperpulse.filter.pipeline import filter_paper
    filter_paper(pid)

    row = fetchall(
        "SELECT level1_passed, level2_score, primary_topic FROM papers WHERE id = ?", [pid]
    )[0]
    assert row[0] is True
    assert row[1] is not None and row[1] > 0
    assert row[2] == "llm"
```

- [ ] **Step 4: Run all filter tests**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/unit/filter tests/integration/test_ingest_filter_integration.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/paperpulse/filter/pipeline.py backend/paperpulse/ingest/runner.py backend/tests/integration/test_ingest_filter_integration.py
git commit -m "feat(filter): integrate L2 into pipeline + primary_topic from best anchor"
```

### Task 3.3: Seeds API + Seeds Tab

**Files:**
- Modify: `backend/paperpulse/api/filter_settings.py` (GET/POST /settings/seeds)
- Modify: `backend/tests/integration/test_filter_settings_api.py`
- Create: `src/pages/settings/SeedsTab.tsx`
- Modify: `src/lib/settings.ts`, `src/hooks/useSettings.ts`
- Modify: `src/pages/settings/index.tsx`

- [ ] **Step 1: Backend — seeds endpoint**

```python
# filter_settings.py — add
class SeedPaper(BaseModel):
    id: str | None = None
    title: str
    abstract: str | None = None
    doi: str | None = None
    arxiv_id: str | None = None
    base_weight: float = 1.0
    half_life_days: float | None = None
    added_at: str | None = None

class SeedsPayload(BaseModel):
    seed_papers: list[SeedPaper]
    user_must_read_papers: list[SeedPaper]
    seed_meta: dict[str, Any] = {}

@router.get("/seeds")
async def get_seeds() -> dict[str, Any]:
    return _read("seeds")

@router.post("/seeds")
async def post_seeds(payload: SeedsPayload) -> dict[str, Any]:
    _write("seeds", payload.model_dump())
    return _read("seeds")
```

- [ ] **Step 2: Frontend — Seeds tab (simple list UI)**

```typescript
// src/pages/settings/SeedsTab.tsx — minimal Phase 3 version
// Table with: Title | DOI/arxiv | Weight | Half-life | Actions
// Add-new form at bottom; no bulk import yet (Phase 7 polish)
```

Implementation pattern mirrors `KeywordsTab.tsx`: `useSeeds` hook loads via `getSeeds`, table renders with inline edit/delete, "Add seed" form appends to `user_must_read_papers` array.

- [ ] **Step 3: Backend test**

```python
def test_post_seeds_triggers_anchor_rebuild(client, tmp_config_dir, monkeypatch):
    from paperpulse.filter import embedding as _emb
    from tests.fixtures.bge_m3_stub import StubEmbedder
    monkeypatch.setattr(_emb, "_backend", StubEmbedder())
    from paperpulse.main import anchor_cache
    before = len(anchor_cache.labels())
    r = client.post("/api/v1/settings/seeds", json={
        "seed_papers": [{
            "id": "s1", "title": "LLM for factors",
            "abstract": "we test factors with LLMs",
            "base_weight": 1.0,
        }],
        "user_must_read_papers": [],
        "seed_meta": {},
    })
    assert r.status_code == 200
    # Watchdog + subscriber fires → anchor cache rebuilt
    assert len(anchor_cache.labels()) == before + 1
```

- [ ] **Step 4: make all + smoke**

```bash
cd /Users/barca/Dev/paperpulse && make all
```

- [ ] **Step 5: Commit**

```bash
git add backend/paperpulse/api/filter_settings.py src/pages/settings/SeedsTab.tsx src/lib/settings.ts src/hooks/useSettings.ts backend/tests/integration/test_filter_settings_api.py src/pages/settings/index.tsx
git commit -m "feat(settings): PR #3.3 Seeds API + Seeds tab"
```

---

## PR #3.4 — Topics Tab

### Task 4.1: Topics API + Topics Tab UI

**Files:**
- Modify: `backend/paperpulse/api/filter_settings.py` (GET/POST /settings/topics)
- Modify: `backend/tests/integration/test_filter_settings_api.py`
- Create: `src/pages/settings/TopicsTab.tsx`
- Modify: `src/lib/settings.ts`, `src/hooks/useSettings.ts`, `src/pages/settings/index.tsx`

- [ ] **Step 1: Backend endpoint**

```python
class Topic(BaseModel):
    name: str
    slug: str
    side: str  # "cs" | "finance" | "crosscut"
    description_en: str
    description_zh: str
    weight: float = 1.0
    color: str | None = None

class TopicsPayload(BaseModel):
    topics: list[Topic]

@router.get("/topics")
async def get_topics() -> dict[str, Any]: return _read("topics")

@router.post("/topics")
async def post_topics(payload: TopicsPayload) -> dict[str, Any]:
    _write("topics", payload.model_dump())
    return _read("topics")
```

- [ ] **Step 2: Topics tab UI**

Pattern from design-reference `TopicsTab` (split-pane: Finance-ML / CS-core). Omit color picker for now (v1). Each topic has: name, slug (auto from name), side select, description_en/zh textareas, weight slider (0-2).

- [ ] **Step 3: Backend test — topics.yml edit triggers L2 rescore on recent window**

Add subscriber in `main.py` lifespan:

```python
def _on_seeds_topics_change(_: str) -> None:
    anchor_cache.rebuild()
    # async-rescore recent window (last 90d)
    import datetime as dt
    cutoff = (dt.date.today() - dt.timedelta(days=90)).isoformat()
    rows = fetchall(
        "SELECT id FROM papers WHERE published_at >= ? AND level1_passed = TRUE",
        [cutoff],
    )
    for (pid,) in rows:
        try:
            filter_paper_l2(pid)
        except Exception:
            _log.exception("L2 rescore failed for %s", pid)

config_store.subscribe("seeds", _on_seeds_topics_change)
config_store.subscribe("topics", _on_seeds_topics_change)
```

Test: ingest a paper; post new topics.yml with a matching topic; assert `primary_topic` is set.

- [ ] **Step 4: make all**

```bash
cd /Users/barca/Dev/paperpulse && make all
```

- [ ] **Step 5: Commit**

```bash
git add backend/paperpulse/api/filter_settings.py backend/paperpulse/main.py backend/tests/integration/test_filter_settings_api.py src/pages/settings/TopicsTab.tsx src/lib/settings.ts src/hooks/useSettings.ts src/pages/settings/index.tsx
git commit -m "feat(settings): PR #3.4 Topics tab + L2 rescore on topics.yml change"
```

---

## PR #3.5 — L3 Tier weighted scoring + Tier Rules Tab (with Simulate)

### Task 5.1: L3 tier pure function

**Files:**
- Create: `backend/paperpulse/filter/tiers.py`
- Create: `backend/tests/unit/filter/test_tiers.py`

- [ ] **Step 1: Failing test** (spec §10.3 cases)

```python
# backend/tests/unit/filter/test_tiers.py
from __future__ import annotations

from paperpulse.filter.tiers import (
    TierRules, B_score, Signals, PaperForScoring, level3_tier,
)


def test_venue_tier_a():
    rules = TierRules(A_venues={"NeurIPS"}, B=B_score(weights={}, threshold=0.5))
    p = PaperForScoring(venue_normalized="NeurIPS", level2_score=0.0,
                        institutions=[], authors_is_tracked=False)
    tier, score = level3_tier(p, rules, Signals())
    assert tier == "A" and score == 1.0


def test_tier_b_threshold_crossed():
    rules = TierRules(A_venues=set(), B=B_score(weights={
        "level2_similarity": 1.0,
        "institution_whitelist": 0,
        "citation_velocity": 0,
        "pwc_has_code": 0,
        "hf_daily_papers": 0,
        "tracked_author": 0,
    }, threshold=0.5))
    p = PaperForScoring(venue_normalized=None, level2_score=0.6,
                        institutions=[], authors_is_tracked=False)
    tier, score = level3_tier(p, rules, Signals())
    assert tier == "B" and abs(score - 0.6) < 1e-6


def test_tier_c_fallthrough():
    rules = TierRules(A_venues=set(), B=B_score(weights={
        "level2_similarity": 1.0, "institution_whitelist": 0, "citation_velocity": 0,
        "pwc_has_code": 0, "hf_daily_papers": 0, "tracked_author": 0,
    }, threshold=0.5))
    p = PaperForScoring(venue_normalized=None, level2_score=0.2,
                        institutions=[], authors_is_tracked=False)
    tier, _ = level3_tier(p, rules, Signals())
    assert tier == "C"


def test_institution_whitelist_high_priority():
    rules = TierRules(A_venues=set(), B=B_score(weights={
        "level2_similarity": 0, "institution_whitelist": 1.0, "citation_velocity": 0,
        "pwc_has_code": 0, "hf_daily_papers": 0, "tracked_author": 0,
    }, threshold=0.5))
    p = PaperForScoring(
        venue_normalized=None, level2_score=0.0,
        institutions=[{"in_whitelist": True, "whitelist_priority": "high"}],
        authors_is_tracked=False,
    )
    _, score = level3_tier(p, rules, Signals())
    assert abs(score - 1.0) < 1e-6
```

- [ ] **Step 2: Implement tiers.py (port spec §10.3)**

```python
# backend/paperpulse/filter/tiers.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


@dataclass
class B_score:
    weights: dict[str, float]
    threshold: float


@dataclass
class TierRules:
    A_venues: set[str]
    B: B_score


@dataclass
class Signals:
    citation_velocity: float | None = None
    pwc_has_code: bool = False
    hf_daily_papers: bool = False


@dataclass
class PaperForScoring:
    venue_normalized: str | None
    level2_score: float
    institutions: list[dict]          # dicts with in_whitelist, whitelist_priority
    authors_is_tracked: bool


def _inst_score(insts: Iterable[dict]) -> float:
    for i in insts:
        if not i.get("in_whitelist"):
            continue
        if i.get("whitelist_priority") == "high":
            return 1.0
        return 0.5
    return 0.0


def _norm_vel(v: float | None) -> float:
    if v is None:
        return 0.0
    return min(v / 10.0, 1.0)


def level3_tier(
    paper: PaperForScoring,
    rules: TierRules,
    signals: Signals,
) -> tuple[str, float]:
    if paper.venue_normalized in rules.A_venues:
        return "A", 1.0

    components = {
        "level2_similarity": paper.level2_score or 0.0,
        "institution_whitelist": _inst_score(paper.institutions),
        "citation_velocity": _norm_vel(signals.citation_velocity),
        "pwc_has_code": 1.0 if signals.pwc_has_code else 0.0,
        "hf_daily_papers": 1.0 if signals.hf_daily_papers else 0.0,
        "tracked_author": 1.0 if paper.authors_is_tracked else 0.0,
    }
    w = rules.B.weights
    score = sum(w.get(k, 0.0) * components[k] for k in components)
    if score >= rules.B.threshold:
        return "B", float(score)
    return "C", float(score)
```

- [ ] **Step 3: Run + commit**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/unit/filter/test_tiers.py -v
git add backend/paperpulse/filter/tiers.py backend/tests/unit/filter/test_tiers.py
git commit -m "feat(filter): L3 tier scoring pure function (spec §10.3)"
```

### Task 5.2: Integrate L3 into pipeline

**Files:**
- Modify: `backend/paperpulse/filter/pipeline.py` (`filter_paper_l3` + update `filter_paper`)
- Modify: `backend/paperpulse/filter/anchors.py` (add `load_tier_rules`)
- Modify: `backend/tests/integration/test_ingest_filter_integration.py`

- [ ] **Step 1: Loader**

```python
# anchors.py — append
from paperpulse.filter.tiers import B_score, TierRules

def load_tier_rules(store: ConfigStore) -> TierRules:
    cfg = (store.get("tiers") or {}).get("tier_rules") or {}
    a = cfg.get("A") or {}
    b = cfg.get("B_score") or {}
    return TierRules(
        A_venues=set(a.get("venues") or []),
        B=B_score(
            weights=dict(b.get("weights") or {}),
            threshold=float(b.get("threshold") or 0.5),
        ),
    )
```

- [ ] **Step 2: Pipeline L3 + whitelist exemption per spec §10.4**

```python
# pipeline.py — add
def filter_paper_l3(paper_id: str) -> tuple[str, float]:
    rows = fetchall(
        "SELECT venue_normalized, level2_score FROM papers WHERE id = ?", [paper_id]
    )
    if not rows:
        return "C", 0.0
    venue, l2 = rows[0]

    inst_rows = fetchall(
        "SELECT i.in_whitelist, i.whitelist_priority "
        "FROM paper_institutions pi JOIN institutions i ON pi.institution_id = i.id "
        "WHERE pi.paper_id = ?",
        [paper_id],
    )
    institutions = [
        {"in_whitelist": bool(r[0]), "whitelist_priority": r[1]} for r in inst_rows
    ]
    tracked_rows = fetchall(
        "SELECT 1 FROM paper_authors pa JOIN authors a ON pa.author_id = a.id "
        "WHERE pa.paper_id = ? AND a.is_tracked = TRUE LIMIT 1",
        [paper_id],
    )
    paper = PaperForScoring(
        venue_normalized=venue, level2_score=l2 or 0.0,
        institutions=institutions, authors_is_tracked=bool(tracked_rows),
    )
    rules = load_tier_rules(config_store)
    tier, score = level3_tier(paper, rules, Signals())
    execute(
        "UPDATE papers SET tier = ?, level3_tier_b_score = ? WHERE id = ?",
        [tier, score, paper_id],
    )
    return tier, score


def filter_paper(paper_id: str) -> None:
    l1_ok, _ = filter_paper_l1(paper_id)
    if not l1_ok:
        execute("UPDATE papers SET tier = ? WHERE id = ?", ["C", paper_id])
        return
    l2_ok, l2_score, _ = filter_paper_l2(paper_id)
    # Institution whitelist exemption: even if L2 fails, whitelist hit still scores L3
    inst_hit_rows = fetchall(
        "SELECT 1 FROM paper_institutions pi JOIN institutions i ON pi.institution_id = i.id "
        "WHERE pi.paper_id = ? AND i.in_whitelist = TRUE LIMIT 1",
        [paper_id],
    )
    if not l2_ok and not inst_hit_rows:
        execute("UPDATE papers SET tier = ? WHERE id = ?", ["C", paper_id])
        return
    filter_paper_l3(paper_id)
```

- [ ] **Step 3: Integration test**

```python
def test_full_pipeline_assigns_tier(isolate_runtime, monkeypatch):
    # setup topics + stub embedder so L2 scores > threshold
    ...
    assert row[...]["tier"] in ("A", "B", "C")
```

- [ ] **Step 4: Commit**

```bash
git add backend/paperpulse/filter/pipeline.py backend/paperpulse/filter/anchors.py backend/tests/integration/test_ingest_filter_integration.py
git commit -m "feat(filter): integrate L3 + whitelist L2-exemption (spec §10.4)"
```

### Task 5.3: Tier rules Simulate endpoint

**Files:**
- Create: `backend/paperpulse/filter/simulate.py`
- Create: `backend/tests/unit/filter/test_simulate.py`
- Modify: `backend/paperpulse/api/filter_settings.py` (POST /settings/tiers/simulate)

- [ ] **Step 1: Simulate logic**

```python
# backend/paperpulse/filter/simulate.py
"""Counts how many papers fall into A/B/C under a proposed tier ruleset,
without persisting. Used by the Tier Rules tab's Simulate button."""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from paperpulse.db.duckdb_client import fetchall
from paperpulse.filter.tiers import (
    PaperForScoring, Signals, TierRules, level3_tier,
)


@dataclass
class SimulateResult:
    total: int
    tier_a: int
    tier_b: int
    tier_c: int


def simulate_tiers(rules: TierRules, limit: int | None = None) -> SimulateResult:
    base = (
        "SELECT p.id, p.venue_normalized, p.level2_score "
        "FROM papers p WHERE p.level1_passed = TRUE"
    )
    if limit:
        base += f" LIMIT {int(limit)}"
    paper_rows = fetchall(base)

    counts = Counter[str]()
    for pid, venue, l2 in paper_rows:
        inst_rows = fetchall(
            "SELECT i.in_whitelist, i.whitelist_priority "
            "FROM paper_institutions pi JOIN institutions i ON pi.institution_id = i.id "
            "WHERE pi.paper_id = ?",
            [pid],
        )
        institutions = [
            {"in_whitelist": bool(r[0]), "whitelist_priority": r[1]} for r in inst_rows
        ]
        tracked = bool(fetchall(
            "SELECT 1 FROM paper_authors pa JOIN authors a ON pa.author_id = a.id "
            "WHERE pa.paper_id = ? AND a.is_tracked = TRUE LIMIT 1",
            [pid],
        ))
        p = PaperForScoring(
            venue_normalized=venue, level2_score=l2 or 0.0,
            institutions=institutions, authors_is_tracked=tracked,
        )
        tier, _ = level3_tier(p, rules, Signals())
        counts[tier] += 1
    total = sum(counts.values())
    return SimulateResult(total=total, tier_a=counts["A"], tier_b=counts["B"], tier_c=counts["C"])
```

- [ ] **Step 2: Endpoint**

```python
# filter_settings.py — add
from paperpulse.filter.simulate import simulate_tiers
from paperpulse.filter.tiers import B_score, TierRules

class SimulateTiersPayload(BaseModel):
    A_venues: list[str]
    B_weights: dict[str, float]
    B_threshold: float
    limit: int | None = None

@router.post("/tiers/simulate")
async def simulate_tiers_ep(payload: SimulateTiersPayload) -> dict[str, int]:
    rules = TierRules(
        A_venues=set(payload.A_venues),
        B=B_score(weights=payload.B_weights, threshold=payload.B_threshold),
    )
    r = simulate_tiers(rules, limit=payload.limit)
    return {"total": r.total, "tier_a": r.tier_a, "tier_b": r.tier_b, "tier_c": r.tier_c}

# Plus GET/POST /tiers for the Tier Rules tab's current-rules editor
class TierRulesPayload(BaseModel):
    tier_rules: dict[str, Any]

@router.get("/tiers")
async def get_tiers() -> dict[str, Any]: return _read("tiers")

@router.post("/tiers")
async def post_tiers(payload: TierRulesPayload) -> dict[str, Any]:
    _write("tiers", payload.model_dump())
    return _read("tiers")
```

- [ ] **Step 3: Subscriber for tiers.yml → L3 rescore all papers**

```python
# main.py lifespan
def _on_tiers_change(_: str) -> None:
    rows = fetchall("SELECT id FROM papers WHERE level1_passed = TRUE")
    for (pid,) in rows:
        try:
            filter_paper_l3(pid)
        except Exception:
            _log.exception("L3 rescore failed for %s", pid)

config_store.subscribe("tiers", _on_tiers_change)
```

- [ ] **Step 4: Tier Rules Tab UI**

Layout (port from design-reference `tabs.tsx` ScoringTab):
- Table for Tier A venues (add/remove)
- Sliders for each B_score weight (0–1, step 0.05), live-normalize display
- Slider for threshold (0–1)
- Simulate button → POST /settings/tiers/simulate → show "Under these rules: A=12, B=340, C=1729"
- Save button → POST /settings/tiers

- [ ] **Step 5: make all**

```bash
cd /Users/barca/Dev/paperpulse && make all
```

- [ ] **Step 6: Commit**

```bash
git add backend/paperpulse/filter/simulate.py backend/paperpulse/api/filter_settings.py backend/paperpulse/main.py src/pages/settings/TierRulesTab.tsx src/lib/settings.ts src/hooks/useSettings.ts src/pages/settings/index.tsx backend/tests/unit/filter/test_simulate.py
git commit -m "feat(settings): PR #3.5 L3 integration + Tier Rules tab + Simulate"
```

---

## PR #3.6 — Feed API grouping + filters + sort

### Task 6.1: Feed API query params

**Files:**
- Modify: `backend/paperpulse/api/feed.py`
- Modify: `backend/tests/integration/test_feed_api.py` (create if absent)

- [ ] **Step 1: Design response contract**

```python
# FeedResponse new shape (backwards-compatible: group_by=flat returns old shape):
#
# Grouped:
# {
#   "total": 342,
#   "group_by": "topic",
#   "groups": [
#     {"label": "llm-agents-finance", "label_type": "topic", "count": 48, "papers": [...]},
#     ...
#   ]
# }
#
# Flat:
# {
#   "total": 342,
#   "group_by": "flat",
#   "papers": [...]
# }
```

- [ ] **Step 2: Test cases**

Write tests covering:
- `/feed?group_by=topic` → papers bucketed by `primary_topic`, ungrouped in "unassigned"
- `/feed?group_by=tier` → buckets "A", "B", "C"
- `/feed?group_by=source` → arxiv, nber
- `/feed?group_by=institution` → top 20 institutions by paper_count_30d, rest collapsed
- `/feed?time_window=today` → only papers with `published_at >= today`
- `/feed?tier=A,B` → excludes C
- `/feed?sort=relevance` → ORDER BY level2_score DESC
- `/feed?sort=date` → ORDER BY published_at DESC (default)
- default filter: `level1_passed = TRUE` (L1-failed papers hidden unless `?include_l1_failed=true`)

- [ ] **Step 3: Implementation outline**

```python
from datetime import date, timedelta

from fastapi import Query

_VALID_GROUP = {"flat", "topic", "tier", "source", "institution"}
_VALID_SORT = {"date", "relevance", "citations"}
_VALID_TW = {"today", "week", "month", "all"}


def _time_window_cutoff(tw: str) -> str | None:
    today = date.today()
    if tw == "today": return today.isoformat()
    if tw == "week":  return (today - timedelta(days=7)).isoformat()
    if tw == "month": return (today - timedelta(days=30)).isoformat()
    return None


@router.get("/feed")
async def get_feed(
    limit: int = 100,
    group_by: str = Query("flat"),
    time_window: str = Query("all"),
    sort: str = Query("date"),
    tier: str | None = Query(None),   # comma-separated
    source: str | None = Query(None),
    topic: str | None = Query(None),
    include_l1_failed: bool = False,
) -> dict[str, Any]:
    if group_by not in _VALID_GROUP:
        raise HTTPException(422, f"group_by must be one of {_VALID_GROUP}")
    # … assemble WHERE / ORDER BY, then fetch and shape response
```

Body logic:
1. Build WHERE clauses for `level1_passed`, `published_at >=`, `tier IN (...)`, `source IN (...)`, `primary_topic IN (...)`
2. Build ORDER BY: `date` → `published_at DESC NULLS LAST, ingested_at DESC`; `relevance` → `level3_tier_b_score DESC NULLS LAST, level2_score DESC NULLS LAST`; `citations` → `citation_count DESC NULLS LAST`
3. Fetch papers, then if `group_by != flat`, group in Python by the selected key

- [ ] **Step 4: Run tests**

```bash
cd /Users/barca/Dev/paperpulse/backend && uv run pytest tests/integration/test_feed_api.py -v
```

- [ ] **Step 5: Frontend — Feed page fetches with params**

Update `src/hooks/useFeed.ts` to accept `FeedQuery { group_by, time_window, sort, tier?, source?, topic? }`; `src/pages/Feed.tsx` renders grouped layout with collapsible section headers. For PR #3.6, minimum viable: three dropdowns (Time Window / Group by / Sort) wired to the hook; grouped rendering mirrors design-reference `Feed.tsx` section headers (▼ Topic name · count).

- [ ] **Step 6: make all + manual smoke**

```bash
cd /Users/barca/Dev/paperpulse && make all
```
Manual: open Feed, switch Group By to Topic, confirm papers bucket into topics; edit Tier Rules Simulate; close Phase 3 DoD.

- [ ] **Step 7: Commit**

```bash
git add backend/paperpulse/api/feed.py backend/tests/integration/test_feed_api.py src/hooks/useFeed.ts src/pages/Feed.tsx
git commit -m "feat(feed): PR #3.6 grouped feed + filters + sort (spec §12.2)"
```

---

## Phase 3 Acceptance

### Task 7: Author `docs/acceptance/phase_3.md`

- [ ] **Step 1: Automated gates**

```bash
make lint && make typecheck && make test
```
Expect all green including new filter module tests (~30+ new tests).

- [ ] **Step 2: Manual DoD checklist**

```markdown
# Phase 3 Acceptance

## Automated gates
- [x] make lint
- [x] make typecheck
- [x] make test  (67 existing + ~30 new filter tests)

## Manual DoD (spec §18 Phase 3)

- [x] Feed can group by topic
- [x] Tier classification assigns A/B/C correctly
- [x] Editing keywords.yml (via Settings → Keywords) causes L1 re-scan
      → a paper formerly excluded now shows up in Feed
- [x] Editing topics.yml (via Settings → Topics) re-embeds anchors and
      reshuffles primary_topic for recent papers
- [x] Editing tiers.yml (via Settings → Tier Rules) triggers L3 rescore
- [x] Tier Rules → Simulate button shows counts without persisting

## Known limitations carried to Phase 4/5
- citation_velocity / pwc_has_code / hf_daily_papers signals are zero
  (external signal ingest is Phase 4); L3 relies on L2 score + whitelist +
  tracked_author.
- primary_topic is derived from L2 best-match topic anchor — replaced by
  Haiku classification in Phase 5.
- Seed half-life decay reads seed.added_at but there's no UI yet to
  stamp it; Seeds tab auto-fills now() on insert. Phase 7 polish.
```

- [ ] **Step 3: Commit + push**

```bash
git add docs/acceptance/phase_3.md
git commit -m "docs: Phase 3 acceptance record"
git push origin main
```

---

## Self-Review Checklist

Before starting execution, verify:

**Spec coverage vs plan tasks:**
- §10.1 L1 keyword filter → Task 1.1
- §10.2 L2 semantic filter → Task 3.1 (pure), Task 3.2 (integration)
- §10.3 L3 tier scoring → Task 5.1 (pure), Task 5.2 (integration)
- §10.4 pipeline orchestration + whitelist exemption → Task 5.2 `filter_paper`
- §11.1 embedding (bge-m3 ONNX) → Task 2.1, 2.2
- §12.2 Feed facets (time window, group by, sort) → Task 6.1
- §18 Phase 3 six PRs → PR #3.1 … #3.6 above
- §18 Phase 3 DoD (feed by topic, tier correct, real-time rule edit) → Task 7

**Type/name consistency spot checks:**
- `Keywords` dataclass fields (`positive_cs_core`…) used consistently across keywords.py, anchors.py, pipeline.py ✓
- `TierRules.A_venues` (set) vs loader output (`set(...)`) ✓
- `level2_filter` returns `(bool, float, str | None)` throughout ✓
- `filter_paper`, `filter_paper_l1`, `filter_paper_l2`, `filter_paper_l3` naming uniform ✓
- LanceDB paper_vectors schema 1024-dim matches bge-m3 output ✓

**No placeholder patterns:** each step has actual code or a runnable command. Shadcn primitive files say "copy verbatim from design-reference" — that's a concrete action, not TBD.

---

## Execution Handoff

Plan complete, saved to `docs/superpowers/plans/2026-04-24-phase3-filtering.md`.

**Execution mode recommendation:** Inline via superpowers:executing-plans (matches user's cadence in Phase 0-2). Batch checkpoints:

- **Checkpoint α** — after Pre-flight (Task 0): deps installed, model dir helper ready, tests green.
- **Checkpoint β** — after PR #3.1 (Tasks 1.1-1.6): Keywords L1 working end-to-end; Settings shell + Keywords tab live.
- **Checkpoint γ** — after PR #3.2 (Tasks 2.1-2.3): bge-m3 downloaded & caching; anchor cache built; no user-facing change yet.
- **Checkpoint δ** — after PR #3.3 + #3.4 (Tasks 3.1-4.1): L2 scoring runs; Seeds + Topics tabs live.
- **Checkpoint ε** — after PR #3.5 (Tasks 5.1-5.3): L3 + Simulate button working.
- **Checkpoint ζ** — after PR #3.6 + Acceptance (Task 6.1-7): Phase 3 DoD hit; push.

At each checkpoint: `make all` must be green, a commit lands on main, optional `git push`. User decides whether to continue or pause.
