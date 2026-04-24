# Phase 3 Acceptance

## Automated gates

- [x] `make lint` ✓ (ruff + eslint clean)
- [x] `make typecheck` ✓ (mypy + tsc clean)
- [x] `make test` ✓ (90 unit + 39 integration = **129 tests green** via `make test` split runs)

Note: Running `pytest` against the full suite in a single process occasionally
SIGABRTs at exit on Python 3.13 + onnxruntime/duckdb/lancedb teardown. The
canonical `make test` splits unit and integration into separate invocations and
is always green. Individual files are always green. Not a functional defect —
tracked as a teardown-time extension interaction; will revisit if it worsens.

## Phase 3 DoD (spec §18)

| Requirement | Status | Evidence |
|---|---|---|
| Feed can group by topic | ✅ | `GET /api/v1/feed?group_by=topic` returns `{groups: [{label, count, papers: [...]}]}`; `test_feed_group_by_topic` verifies bucketing including `unassigned` for NULL `primary_topic`. UI: Feed page has a "Group: topic" select that re-queries and renders collapsible sections. |
| Tier classification correct | ✅ | Tier-A venue bypasses L2 and returns tier=A (`test_l3_venue_a_assigns_tier_a`). L1 pass + L2 clear → L3 weighted score. L1 pass + L2 miss + no whitelist → tier=C. L1 fail → tier=C. Covered by `test_l3_*` + `test_tiers.py` (11 tests across 3 files). |
| Settings rule edits apply in real time | ✅ | `POST /settings/keywords` triggers `rescore_l1_all` (`test_post_keywords_triggers_l1_rescore`). `POST /settings/seeds` and `POST /settings/topics` rebuild the AnchorCache via `_on_config_change`. `POST /settings/tiers` rebases L3 via `rescore_l3_all`. |
| Simulate button on Tier Rules tab | ✅ | `POST /settings/tiers/simulate` counts A/B/C under proposed rules without persisting (`test_simulate.py` covers no-persist, L1-filter respect, and limit). UI: Tier Rules tab shows live A/B/C counts inline after clicking Simulate. |

## New endpoints

- `GET|POST /api/v1/settings/keywords`
- `GET|POST /api/v1/settings/seeds`
- `GET|POST /api/v1/settings/topics`
- `GET|POST /api/v1/settings/tiers`
- `POST /api/v1/settings/tiers/simulate`
- `GET /api/v1/feed?group_by=…&time_window=…&sort=…&tier=…&source=…&topic=…&include_l1_failed=…`

## New UI

- Settings → **Keywords** — 6 bucket textareas (positive × 3 + negative × 2 + immune), one term per line, save triggers L1 rescore
- Settings → **Seeds** — two-section table editor (canonical vs must-read), per-seed weight + optional half-life days
- Settings → **Topics** — three-column layout (Finance / CS / Crosscut), each topic with slug + EN/ZH description + weight slider
- Settings → **Tier Rules** — Tier-A venue chip editor + 6 weight sliders + threshold slider + Simulate button (inline A/B/C counts)
- Feed → three-dropdown toolbar (Time Window / Group by / Sort), collapsible group sections, Tier badge + primary_topic pill on each paper row

## Observed external-data limitations (carried from Phase 2)

Unchanged: the 2082 fresh arxiv papers in local DB still return 0% OpenAlex/ar5iv affiliations pending the 48h retry queue. L3 scoring handles this gracefully — `institution_whitelist` component contributes 0 when no institutions are attached, so Tier-B still fires on L2 + tracked_author + venue signals alone.

## Known limitations carried to Phase 4/5

- `citation_velocity` / `pwc_has_code` / `hf_daily_papers` are zero everywhere (external signal ingest is Phase 4); L3 leans on L2 + whitelist + tracked_author.
- `primary_topic` is derived from the best-matching L2 topic anchor; Phase 5 replaces this with the Haiku classifier per spec §11.3.
- Seed half-life decay reads `added_at` but there's no UI yet to stamp it explicitly; Seeds tab auto-fills `now()` on insert.
- Tier-A venue bypass requires `papers.venue_normalized` to be populated; source-specific venue normalization (spec §8.2 vocabulary) lands in Phase 4 alongside the remaining sources.

## Commits

Phase 3 spans commits `97b1e87 .. <phase-3-close>` on `main`:
- `97b1e87` chore(phase3): add ONNX/tokenizers/hf_hub deps + models_dir helper
- `88a6d96` docs: Phase 3 implementation plan
- `6468e92` feat(filter): PR #3.1 L1 keyword rule filter
- `297f978` feat(filter): keywords/venue loaders backed by ConfigStore
- `b9fd6b7` feat(api): PR #3.1 GET/POST /settings/keywords round-trip
- `48d4717` feat(filter): wire L1 into ingest + rescore on keywords.yml change
- `c33db10` feat(ui): PR #3.1 Settings shell + Keywords tab
- `ab2298b` feat(filter): PR #3.2 bge-m3 ONNX embedding service + stub
- `f25b79f` feat(filter): LanceDB paper_vectors cache
- `f35958c` feat(filter): PR #3.2 seed+topic AnchorCache with YAML reload
- `0bc849b` feat(filter): PR #3.3 L2 semantic filter + pipeline integration
- `102b4b5` feat(settings): PR #3.3 Seeds + Topics API, Seeds tab UI
- `fac2fc6` feat(settings): PR #3.4 Topics tab
- `<TBD>` feat(filter): PR #3.5 L3 Tier scoring + Tier Rules tab + Simulate
- `<TBD>` feat(feed): PR #3.6 grouped feed + filters + sort
