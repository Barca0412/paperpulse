# PaperPulse Development Guide for Claude Code

## Source of Truth
- Product & engineering spec: `docs/paperpulse_spec_v1_1.md` (FROZEN at v1.1)
- UI reference (visual/interactive): `design-reference/design/`
- Seed corpus: `docs/seed_set.md`

## Development Order
Follow Phases 0–8 in SPEC §18. Each phase has PRs listed. Do them in order.

## Rules

1. **READ FIRST**: Before any PR, read the relevant SPEC sections and any
   design-reference components you'll touch.

2. **TEST FIRST**: Write tests before implementation (TDD). See SPEC §19.

3. **UI REUSE**: Always check `design-reference/design/src/` before creating
   new UI. Copy, don't recreate. Replace mock imports with real API hooks.
   See SPEC §22 and Appendix E.

4. **NO MOCK DATA**: The mock TS files in `design-reference/design/src/mocks/`
   are placeholders. Your implementation must call real APIs via
   `src/lib/api.ts`. See SPEC Appendix E.

5. **SMALL PRs**: Keep PRs ≤ 500 LOC. Each PR includes code + tests + lint pass.

6. **BEFORE COMMIT**: Run `make all` (lint + typecheck + test). If any fail,
   fix them or revert. Never commit failing tests.

7. **SPEC DEVIATION**: If you discover SPEC is wrong or incomplete, STOP and
   add a note to `docs/spec-questions.md`. Don't silently deviate.

## Key Commands

- `make install`   — Install Node + Python deps
- `make dev`       — Start Tauri + Vite + Python sidecar
- `make sidecar`   — Run only the Python sidecar (uvicorn --reload)
- `make test`      — Run all backend tests
- `make lint`      — ruff + eslint
- `make typecheck` — mypy + tsc
- `make all`       — lint + typecheck + test

## Project Layout
- `src/` — React app (replaces design-reference/src after migration)
- `src-tauri/` — Rust shell, spawns the Python sidecar
- `backend/paperpulse/` — Python sidecar (FastAPI + ingest + filter + enrich)
- `config/` — User-editable YAML (hot-reloaded via watchdog)
- `data/` — Runtime DuckDB + LanceDB files (git-ignored)

## When Stuck
1. Document the question in `docs/spec-questions.md`
2. Pick the most conservative option (preserves user data, preserves existing APIs)
3. Leave a TODO comment referring to the question file
4. Continue
