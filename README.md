# PaperPulse

Local-first desktop app that tracks, filters, and analyses AI × Finance papers.
Tauri 2 + React 18 + Python (FastAPI) sidecar + DuckDB.

> Status: in active development against `docs/paperpulse_spec_v1_1.md` (v1.1, frozen).

## Quick start

```bash
# install dependencies
make install

# launch desktop app (Tauri spawns the Python sidecar automatically)
make dev

# run only the backend (useful for backend-only iteration)
make sidecar
```

## Development

See `CLAUDE.md` and `docs/paperpulse_spec_v1_1.md` §18 for the per-PR roadmap.

## Tests

```bash
make all       # lint + typecheck + test
make test      # tests only
make test-unit
```
