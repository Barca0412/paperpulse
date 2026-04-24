# Open Spec Questions

This file logs questions/ambiguities discovered during implementation. Each
entry has the conservative default we're applying so progress is unblocked.

## Q1 (Phase 0): FTS5 storage engine

**Question:** Spec §6.1 declares `CREATE VIRTUAL TABLE papers_fts USING fts5(...)`
which is SQLite-specific syntax. DuckDB does not support FTS5 virtual tables;
its full-text search ships as a separate `fts` extension with a different API.

**Conservative default applied (Phase 0–5):** Defer FTS5 setup entirely. The
search feature is Phase 6 (M13). When implementing M13, evaluate two options:
  (a) DuckDB `fts` extension (uniform with main store, but different syntax)
  (b) Sidecar SQLite database for FTS5 only (matches spec syntax, +1 file)

**Resolution required by:** Phase 6 PR #6.5.

**Owner:** JX (decide before PR #6.5).
