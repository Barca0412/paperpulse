# PaperPulse Phase 0 + Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the PaperPulse project skeleton (Tauri 2 shell + React 18 SPA + Python FastAPI sidecar + DuckDB/LanceDB + YAML config + CI), then add a minimal ingest loop that pulls real papers from arXiv and NBER and renders them in the Feed page.

**Architecture:** Tauri 2 spawns a Python FastAPI sidecar at startup (`localhost:8765`). React SPA talks to the sidecar over HTTP. DuckDB stores paper metadata; LanceDB stores embeddings (table created but unused in Phase 1); FTS5 deferred to Phase 6. YAML configs in `config/` are watched by `watchdog` and hot-reloaded. Ingest sources implement a common `Source` ABC; arXiv uses the `arxiv` package (3s polite delay), NBER uses `feedparser` over RSS. Dedup keys on DOI → arxiv_id → fuzzy title+first_author+year (rapidfuzz).

**Tech Stack:** Tauri 2.0 (Rust 1.95), React 18 + TypeScript 5, Vite 5, Tailwind 3 (NOT 4), shadcn/ui (Radix primitives copied from `design-reference/`), zustand, react-router-dom v6, lucide-react, date-fns; Python 3.13, FastAPI, uvicorn, DuckDB, LanceDB, structlog, watchdog, pydantic v2, PyYAML, arxiv, feedparser, rapidfuzz, pytest, pytest-asyncio, responses; `uv` as Python package manager.

**Source-of-truth references:**
- Spec: `docs/paperpulse_spec_v1_1.md` (frozen v1.1)
- UI: `design-reference/design/src/` (copy components, replace mocks)
- Phase plan: spec §18 Phase 0 (PR #0.1–#0.6) + Phase 1 (PR #1.1–#1.7)

**Out of scope for this plan (deferred):**
- FTS5 virtual table (Phase 6 — see `docs/spec-questions.md` Q1: SQLite FTS5 vs DuckDB FTS extension)
- ROR dump loading (Phase 2)
- Entity extraction / OpenAlex / ar5iv (Phase 2)
- Filter pipeline L1/L2/L3 (Phase 3)
- LLM enrichment / embedding (Phase 5)
- Production bundle via PyInstaller + .dmg (Phase 8) — dev mode uses `uv run` to spawn sidecar
- macOS code signing (Phase 8)

---

## File Structure (final state after this plan)

```
paperpulse/
├── .gitignore
├── .gitattributes
├── CLAUDE.md
├── Makefile
├── README.md
├── package.json                     # Vite + React + Tauri CLI
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json                  # shadcn/ui registry
├── eslint.config.js
├── index.html
├── docs/                            # existing — untouched
├── design-reference/                # existing — untouched (read-only)
├── src/                             # React app
│   ├── main.tsx
│   ├── App.tsx
│   ├── globals.css
│   ├── lib/
│   │   ├── utils.ts                 # cn() helper
│   │   ├── api.ts                   # backend HTTP client
│   │   └── types.ts                 # Paper, Topic, etc. (mirrors spec §6 + §C)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── SideNav.tsx
│   │   │   └── StatusBar.tsx
│   │   └── ui/                      # shadcn primitives copied as needed
│   ├── pages/
│   │   ├── Feed.tsx                 # real implementation
│   │   ├── Explore.tsx              # stub
│   │   ├── Dashboard.tsx            # stub
│   │   ├── Network.tsx              # stub
│   │   ├── Conferences.tsx          # stub
│   │   ├── Digest.tsx               # stub
│   │   ├── Institutions.tsx        # stub
│   │   ├── Authors.tsx              # stub
│   │   └── Settings.tsx             # stub
│   ├── hooks/
│   │   └── useFeed.ts
│   └── stores/
│       └── app.ts
├── src-tauri/                       # Rust shell
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── icons/icon.png
│   └── src/
│       ├── main.rs
│       └── sidecar.rs
├── backend/                         # Python sidecar
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── paperpulse/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app + uvicorn entry
│   │   ├── config.py                # YAML loader + watchdog reloader
│   │   ├── logging_setup.py         # structlog
│   │   ├── paths.py                 # AppData paths
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── schema.sql
│   │   │   ├── duckdb_client.py
│   │   │   └── lance_client.py
│   │   ├── ingest/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # Source ABC + RawPaper
│   │   │   ├── dedup.py             # dedup() + id generation
│   │   │   ├── runner.py            # orchestrates a single source ingest run
│   │   │   ├── arxiv.py
│   │   │   └── nber.py
│   │   └── api/
│   │       ├── __init__.py
│   │       ├── router.py            # mounts sub-routers
│   │       ├── hello.py             # GET /api/v1/hello
│   │       ├── feed.py              # GET /api/v1/feed (minimal)
│   │       └── settings.py          # POST /api/v1/settings/ingest/run-now (Phase 1 minimal)
│   └── tests/
│       ├── conftest.py
│       ├── fixtures/
│       │   ├── arxiv/sample_response.xml
│       │   └── nber/sample_rss.xml
│       ├── unit/
│       │   ├── test_config.py
│       │   ├── test_db_schema.py
│       │   ├── test_arxiv_source.py
│       │   ├── test_nber_source.py
│       │   └── test_dedup.py
│       └── integration/
│           ├── test_ingest_end_to_end.py
│           └── test_api_endpoints.py
├── config/                          # YAML defaults committed to repo
│   ├── sources.yml
│   ├── keywords.yml
│   ├── seeds.yml
│   ├── topics.yml
│   ├── institutions.yml
│   ├── authors.yml
│   ├── tiers.yml
│   ├── conferences.yml
│   └── app.yml
└── .github/workflows/ci.yml         # GitHub Actions CI
```

---

## Pre-flight (run once before Task 1)

- [ ] **Pre-1: Initialize git repository**

```bash
cd /Users/barca/Dev/paperpulse
git init -b main
git config user.email "rigi.jx@gmail.com"
git config user.name "JX (Rigi)"
```

- [ ] **Pre-2: Install `uv` (Python package manager) if missing**

```bash
which uv || curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env  # rust env so cargo is available
export PATH="$HOME/.local/bin:$PATH"  # uv installs here
uv --version
```
Expected: `uv 0.x.x` printed.

- [ ] **Pre-3: Confirm Rust + Node + pnpm in PATH**

```bash
source $HOME/.cargo/env
rustc --version && cargo --version && node --version && pnpm --version
```
Expected: all four print without error.

---

# Phase 0: Project Skeleton

---

## PR #0.1: Tauri 2.0 + React 18 + TS + Vite scaffold

**Files:**
- Create: `.gitignore`, `.gitattributes`, `package.json`, `pnpm-workspace.yaml` (no — single package), `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `eslint.config.js`, `components.json`
- Create: `src/main.tsx`, `src/App.tsx`, `src/globals.css`, `src/lib/utils.ts`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/icons/icon.png`

- [ ] **0.1.1: Write `.gitignore`**

```gitignore
# Node
node_modules/
.pnpm-debug.log*
dist/
dist-ssr/

# Rust
src-tauri/target/

# Python
backend/.venv/
backend/__pycache__/
backend/**/__pycache__/
*.pyc
.pytest_cache/
.mypy_cache/
.ruff_cache/

# Data (runtime)
data/
*.duckdb
*.duckdb.wal
*.lance/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp

# Env
.env
.env.local

# Logs
*.log
```

- [ ] **0.1.2: Write `.gitattributes`**

```
* text=auto eol=lf
*.png binary
*.jpg binary
*.gz binary
```

- [ ] **0.1.3: Initialize root `package.json`**

```json
{
  "name": "paperpulse",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "lint": "eslint .",
    "typecheck": "tsc -b --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.446.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.12.0",
    "@eslint/js": "^9.12.0",
    "globals": "^15.11.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "typescript-eslint": "^8.8.0",
    "vite": "^5.4.8"
  }
}
```

- [ ] **0.1.4: Install Node dependencies**

```bash
cd /Users/barca/Dev/paperpulse
pnpm install
```
Expected: `pnpm-lock.yaml` created, no errors.

- [ ] **0.1.5: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **0.1.6: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **0.1.7: Write `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: "localhost",
  },
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
});
```

- [ ] **0.1.8: Write `tailwind.config.ts`** (copy from `design-reference/design/tailwind.config.ts` to keep visual parity)

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        border: "hsl(var(--border))",
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        ring: "hsl(var(--ring))",
        input: "hsl(var(--input))",
        tier: {
          a: "hsl(var(--tier-a))",
          b: "hsl(var(--tier-b))",
          c: "hsl(var(--tier-c))",
        },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **0.1.9: Write `postcss.config.js`**

```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **0.1.10: Write `src/globals.css`** (copy from `design-reference/design/src/globals.css` verbatim)

Run:
```bash
cp /Users/barca/Dev/paperpulse/design-reference/design/src/globals.css /Users/barca/Dev/paperpulse/src/globals.css
```

- [ ] **0.1.11: Write `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **0.1.12: Write `src/main.tsx`**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **0.1.13: Write `src/App.tsx`** (minimal placeholder; full routing comes in PR #1.6)

```typescript
export default function App() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">PaperPulse</h1>
        <p className="text-sm text-muted-foreground mt-2">Phase 0 scaffold</p>
      </div>
    </div>
  );
}
```

- [ ] **0.1.14: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PaperPulse</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **0.1.15: Write `eslint.config.js`**

```javascript
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src-tauri/target", "design-reference"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
);
```

- [ ] **0.1.16: Write `components.json`** (shadcn registry config; we don't auto-install, but keep this for future)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **0.1.17: Verify Vite dev server starts**

```bash
cd /Users/barca/Dev/paperpulse
pnpm dev &
VITE_PID=$!
sleep 3
curl -s http://localhost:1420 | head -5
kill $VITE_PID 2>/dev/null
wait 2>/dev/null
```
Expected: HTML with `<div id="root">` printed; no Vite errors.

- [ ] **0.1.18: Initialize Tauri 2 in existing project**

Run from project root:
```bash
cd /Users/barca/Dev/paperpulse
pnpm tauri init \
  --ci \
  --app-name "PaperPulse" \
  --window-title "PaperPulse" \
  --frontend-dist "../dist" \
  --dev-url "http://localhost:1420" \
  --before-dev-command "pnpm dev" \
  --before-build-command "pnpm build"
```
Expected: `src-tauri/` created with `Cargo.toml`, `tauri.conf.json`, `src/main.rs`, `src/lib.rs`, `icons/`, `build.rs`.

- [ ] **0.1.19: Patch `src-tauri/tauri.conf.json` identifier and product name**

Edit `src-tauri/tauri.conf.json`. Set:
- `"identifier": "com.rigi.paperpulse"`
- `"productName": "PaperPulse"`
- Under `app.windows[0]`: `"width": 1440, "height": 900, "minWidth": 1024, "minHeight": 700, "title": "PaperPulse"`

(Use the `Edit` tool — the file structure is auto-generated and you must keep all other fields.)

- [ ] **0.1.20: Run `pnpm tauri dev` smoke test (manual — skip in CI)**

```bash
cd /Users/barca/Dev/paperpulse
source $HOME/.cargo/env
timeout 90 pnpm tauri dev 2>&1 | tee /tmp/tauri-dev.log &
TAURI_PID=$!
sleep 60
kill $TAURI_PID 2>/dev/null
grep -E "(Compiling|Finished|App listening|error\[)" /tmp/tauri-dev.log | tail -20
```
Expected: `Finished` message from cargo + no `error[E…]` lines. (First Rust compile is 5–10 minutes.)

- [ ] **0.1.21: Commit PR #0.1**

```bash
cd /Users/barca/Dev/paperpulse
git add .gitignore .gitattributes package.json pnpm-lock.yaml tsconfig.json tsconfig.node.json \
  vite.config.ts tailwind.config.ts postcss.config.js index.html eslint.config.js components.json \
  src/ src-tauri/
git status
git commit -m "feat(scaffold): PR #0.1 Tauri 2 + React 18 + TS + Vite skeleton

- Initializes pnpm + Vite + React 18 + TS 5 frontend with Tailwind 3 (per spec §4.1)
- Initializes Tauri 2 shell with identifier com.rigi.paperpulse
- Imports globals.css from design-reference for visual parity
- Empty App.tsx placeholder; full routing in PR #1.6

Refs: SPEC §4.1, §18 PR #0.1"
```

---

## PR #0.2: Python FastAPI sidecar + Tauri spawns it

**Files:**
- Create: `backend/pyproject.toml`, `backend/paperpulse/__init__.py`, `backend/paperpulse/main.py`, `backend/paperpulse/api/__init__.py`, `backend/paperpulse/api/router.py`, `backend/paperpulse/api/hello.py`, `backend/paperpulse/paths.py`
- Create: `backend/tests/conftest.py`, `backend/tests/integration/test_api_endpoints.py`
- Modify: `src-tauri/src/lib.rs` (or `main.rs`) to spawn sidecar
- Create: `src-tauri/src/sidecar.rs`
- Modify: `src-tauri/Cargo.toml` (add tokio, std::process deps if needed; tauri ships most)

- [ ] **0.2.1: Write `backend/pyproject.toml`**

```toml
[project]
name = "paperpulse-backend"
version = "0.1.0"
description = "PaperPulse Python sidecar"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.9.0",
    "pyyaml>=6.0.2",
    "structlog>=24.4.0",
    "watchdog>=5.0.3",
    "duckdb>=1.1.1",
    "lancedb>=0.13.0",
    "pyarrow>=17.0.0",
    "rapidfuzz>=3.10.0",
    "arxiv>=2.1.3",
    "feedparser>=6.0.11",
    "httpx>=0.27.2",
]

[dependency-groups]
dev = [
    "pytest>=8.3.3",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=5.0.0",
    "ruff>=0.7.0",
    "mypy>=1.13.0",
    "responses>=0.25.3",
    "respx>=0.21.1",
    "types-PyYAML>=6.0.12",
]

[tool.uv]
package = false

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "B", "UP", "RUF"]
ignore = ["E501"]

[tool.mypy]
python_version = "3.11"
strict = true
warn_unused_ignores = true
disallow_untyped_defs = true
files = ["paperpulse"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
filterwarnings = ["ignore::DeprecationWarning"]
```

- [ ] **0.2.2: Create venv + install deps**

```bash
cd /Users/barca/Dev/paperpulse/backend
export PATH="$HOME/.local/bin:$PATH"
uv sync
```
Expected: `.venv/` created, `uv.lock` written.

- [ ] **0.2.3: Write `backend/paperpulse/__init__.py`**

```python
"""PaperPulse backend (Python sidecar)."""
__version__ = "0.1.0"
```

- [ ] **0.2.4: Write `backend/paperpulse/paths.py`**

```python
"""Filesystem paths for runtime data and config.

In dev: paths point to repo-relative dirs (config/, data/) so changes are visible.
In production (Tauri bundle): the sidecar receives PAPERPULSE_DATA_DIR /
PAPERPULSE_CONFIG_DIR env vars from Rust pointing to ~/Library/Application
Support/PaperPulse/.
"""

from __future__ import annotations

import os
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def config_dir() -> Path:
    env = os.environ.get("PAPERPULSE_CONFIG_DIR")
    return Path(env) if env else repo_root() / "config"


def data_dir() -> Path:
    env = os.environ.get("PAPERPULSE_DATA_DIR")
    p = Path(env) if env else repo_root() / "data"
    p.mkdir(parents=True, exist_ok=True)
    return p


def duckdb_path() -> Path:
    return data_dir() / "paperpulse.duckdb"


def lancedb_path() -> Path:
    return data_dir() / "papers.lance"
```

- [ ] **0.2.5: Write `backend/paperpulse/api/__init__.py`** (empty)

```python
```

- [ ] **0.2.6: Write `backend/paperpulse/api/hello.py`**

```python
"""Sanity-check endpoint used by Tauri to detect that the sidecar is alive."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["hello"])


class HelloResponse(BaseModel):
    status: str
    version: str


@router.get("/hello", response_model=HelloResponse)
async def hello() -> HelloResponse:
    from paperpulse import __version__

    return HelloResponse(status="ok", version=__version__)
```

- [ ] **0.2.7: Write `backend/paperpulse/api/router.py`**

```python
"""Aggregate API router; sub-routers are registered here."""

from __future__ import annotations

from fastapi import APIRouter

from paperpulse.api import hello

api_router = APIRouter()
api_router.include_router(hello.router)
```

- [ ] **0.2.8: Write `backend/paperpulse/main.py`**

```python
"""FastAPI entry-point for the PaperPulse Python sidecar.

Run directly:
    uv run uvicorn paperpulse.main:app --host 127.0.0.1 --port 8765
or from Tauri (production):
    Rust spawns the bundled binary with the same args.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from paperpulse.api.router import api_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="PaperPulse Sidecar",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:1420", "tauri://localhost"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()


def main() -> None:
    """Entrypoint used when invoked as `uv run python -m paperpulse.main`."""
    import uvicorn

    uvicorn.run(
        "paperpulse.main:app",
        host="127.0.0.1",
        port=8765,
        log_level="info",
    )


if __name__ == "__main__":
    main()
```

- [ ] **0.2.9: Write `backend/tests/conftest.py`**

```python
"""pytest fixtures shared across the backend test suite."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Iterator

import pytest
from fastapi.testclient import TestClient

from paperpulse.main import create_app


@pytest.fixture
def app() -> Iterator[None]:
    """Ensure each test gets a fresh FastAPI app instance to avoid lifespan leaks."""
    yield create_app()


@pytest.fixture
def client(app):  # type: ignore[no-untyped-def]
    with TestClient(app) as c:
        yield c
```

- [ ] **0.2.10: Write `backend/tests/integration/test_api_endpoints.py`** (failing test FIRST)

```python
"""Smoke tests for the public HTTP surface."""

from __future__ import annotations


def test_hello_returns_ok(client) -> None:  # type: ignore[no-untyped-def]
    resp = client.get("/api/v1/hello")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"]
```

- [ ] **0.2.11: Run the test — it should pass since hello is implemented**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run pytest tests/integration/test_api_endpoints.py -v
```
Expected: `1 passed`.

- [ ] **0.2.12: Verify the sidecar runs standalone**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run uvicorn paperpulse.main:app --host 127.0.0.1 --port 8765 &
SIDE_PID=$!
sleep 3
curl -s http://127.0.0.1:8765/api/v1/hello
echo
kill $SIDE_PID 2>/dev/null
wait 2>/dev/null
```
Expected: `{"status":"ok","version":"0.1.0"}`.

- [ ] **0.2.13: Write `src-tauri/src/sidecar.rs`** — spawn and tear-down logic

```rust
//! Spawns the Python sidecar (`uv run uvicorn …`) at app startup and ensures
//! it is killed when the app exits. In production (Phase 8) the bundled
//! PyInstaller binary will replace `uv run`, but the surface stays the same.

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

pub struct Sidecar {
    child: Mutex<Option<Child>>,
}

impl Sidecar {
    pub fn new() -> Self {
        Self { child: Mutex::new(None) }
    }

    pub fn start(&self) -> Result<(), String> {
        let mut guard = self.child.lock().unwrap();
        if guard.is_some() {
            return Ok(());
        }
        // Repo root = parent of src-tauri at dev time.
        let repo_root = std::env::current_dir()
            .map_err(|e| format!("cwd: {e}"))?
            .parent()
            .ok_or("no parent")?
            .to_path_buf();
        let backend = repo_root.join("backend");

        let child = Command::new("uv")
            .args([
                "run",
                "uvicorn",
                "paperpulse.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8765",
            ])
            .current_dir(&backend)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| format!("failed to spawn sidecar: {e}"))?;
        *guard = Some(child);
        Ok(())
    }

    pub fn stop(&self) {
        if let Some(mut child) = self.child.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        self.stop();
    }
}
```

- [ ] **0.2.14: Modify `src-tauri/src/lib.rs`** to register the sidecar in setup and tear it down on exit

The Tauri 2 init scaffold writes a `lib.rs` with `pub fn run()`. Replace its body (preserving the function signature and `#[cfg_attr(...)]` attribute) with:

```rust
mod sidecar;

use sidecar::Sidecar;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar = Sidecar::new();
    sidecar.start().expect("failed to start python sidecar");

    tauri::Builder::default()
        .manage(sidecar)
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| Ok(()))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(sc) = window.app_handle().try_state::<Sidecar>() {
                    sc.stop();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

If `src-tauri/src/main.rs` was generated as the entry, ensure it just calls `paperpulse_lib::run();` (the lib name comes from `Cargo.toml [lib].name`). If `main.rs` already inlines logic, move that logic to `lib.rs` per the snippet above and reduce `main.rs` to:

```rust
fn main() {
    paperpulse_lib::run();
}
```

(Verify the actual lib name in `src-tauri/Cargo.toml` `[lib]` section after `tauri init` — adjust the call if different.)

- [ ] **0.2.15: Run `pnpm tauri dev` end-to-end manual check**

```bash
cd /Users/barca/Dev/paperpulse
source $HOME/.cargo/env
export PATH="$HOME/.local/bin:$PATH"
timeout 120 pnpm tauri dev 2>&1 | tee /tmp/tauri-dev2.log &
TAURI_PID=$!
sleep 90
curl -s http://127.0.0.1:8765/api/v1/hello
echo
kill $TAURI_PID 2>/dev/null
wait 2>/dev/null
grep -E "(error\[|panicked|failed to spawn)" /tmp/tauri-dev2.log | tail -10
```
Expected: `{"status":"ok",...}` curl output AND no error/panic lines in log.

- [ ] **0.2.16: Commit PR #0.2**

```bash
cd /Users/barca/Dev/paperpulse
git add backend/ src-tauri/src/ src-tauri/Cargo.toml
git commit -m "feat(sidecar): PR #0.2 FastAPI sidecar + Tauri spawn

- Adds backend/ Python project with FastAPI app on 127.0.0.1:8765
- Implements GET /api/v1/hello health check (spec §14.8 status)
- Tauri Rust shell spawns 'uv run uvicorn ...' at startup, kills on window close
- Uses uv as Python package manager (faster than pip; deviation logged)
- pytest suite green (1 test)

Refs: SPEC §4.1, §5.1, §18 PR #0.2"
```

---

## PR #0.3: DuckDB + LanceDB schema (FTS5 deferred)

**Files:**
- Create: `backend/paperpulse/db/__init__.py`, `backend/paperpulse/db/schema.sql`, `backend/paperpulse/db/duckdb_client.py`, `backend/paperpulse/db/lance_client.py`
- Create: `backend/tests/unit/test_db_schema.py`
- Create: `docs/spec-questions.md` (note FTS5 deviation)

- [ ] **0.3.1: Write `docs/spec-questions.md`**

```markdown
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
```

- [ ] **0.3.2: Write `backend/paperpulse/db/__init__.py`** (empty)

```python
```

- [ ] **0.3.3: Write `backend/paperpulse/db/schema.sql`** — minimal Phase 1 subset of spec §6

```sql
-- PaperPulse DuckDB schema (Phase 0 / Phase 1 subset)
-- Full schema lives in docs/paperpulse_spec_v1_1.md §6.
-- FTS5 is deferred — see docs/spec-questions.md Q1.

CREATE TABLE IF NOT EXISTS papers (
    id                     TEXT PRIMARY KEY,
    source                 TEXT NOT NULL,
    source_id              TEXT NOT NULL,
    doi                    TEXT,
    arxiv_id               TEXT,
    openreview_id          TEXT,

    title                  TEXT NOT NULL,
    title_normalized       TEXT,
    abstract               TEXT,
    authors                JSON,
    venue                  TEXT,
    venue_normalized       TEXT,
    published_at           DATE,
    updated_at             DATE,
    ingested_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pdf_url                TEXT,
    html_url               TEXT,

    affiliation_source     TEXT,
    affiliation_fetched_at TIMESTAMP,

    level1_passed          BOOLEAN DEFAULT FALSE,
    level1_reasons         JSON,
    level2_score           DOUBLE,
    level2_matched_seed    TEXT,
    level3_tier_b_score    DOUBLE,
    level3_reasons         JSON,

    topics_cs              JSON,
    topics_finance         JSON,
    topics_crosscut        JSON,
    primary_topic          TEXT,
    tier                   TEXT,
    relevance_score        INTEGER,
    tldr_en                TEXT,
    tldr_zh                TEXT,
    embedding_id           TEXT,

    citation_count         INTEGER,
    citation_velocity      DOUBLE,
    pwc_has_code           BOOLEAN,
    hf_daily_papers        BOOLEAN,
    last_signal_update     TIMESTAMP,

    user_status            TEXT DEFAULT 'unread',
    user_rating            INTEGER,
    user_notes             TEXT,
    user_tags              JSON,
    read_at                TIMESTAMP,
    saved_at               TIMESTAMP,

    zotero_item_key        TEXT,
    zotero_synced_at       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_papers_published    ON papers(published_at);
CREATE INDEX IF NOT EXISTS idx_papers_tier         ON papers(tier);
CREATE INDEX IF NOT EXISTS idx_papers_status       ON papers(user_status);
CREATE INDEX IF NOT EXISTS idx_papers_source       ON papers(source);
CREATE INDEX IF NOT EXISTS idx_papers_primary_topic ON papers(primary_topic);
CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_doi   ON papers(doi)      WHERE doi IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_arxiv ON papers(arxiv_id) WHERE arxiv_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS institutions (
    id                  TEXT PRIMARY KEY,
    ror_id              TEXT,
    openalex_id         TEXT,
    name                TEXT NOT NULL,
    aliases             JSON,
    country             TEXT,
    country_code        TEXT,
    city                TEXT,
    lat                 DOUBLE,
    lng                 DOUBLE,
    type                TEXT,
    parent_id           TEXT,
    department          TEXT,
    homepage            TEXT,
    in_whitelist        BOOLEAN DEFAULT FALSE,
    whitelist_tags      JSON,
    whitelist_priority  TEXT,
    added_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inst_ror       ON institutions(ror_id);
CREATE INDEX IF NOT EXISTS idx_inst_country   ON institutions(country_code);
CREATE INDEX IF NOT EXISTS idx_inst_whitelist ON institutions(in_whitelist);

CREATE TABLE IF NOT EXISTS authors (
    id                       TEXT PRIMARY KEY,
    openalex_id              TEXT,
    orcid                    TEXT,
    name                     TEXT NOT NULL,
    name_variants            JSON,
    current_institutions     JSON,
    historical_institutions  JSON,
    h_index                  INTEGER,
    paper_count              INTEGER,
    citation_count           INTEGER,
    is_pi_likely             BOOLEAN,
    is_tracked               BOOLEAN DEFAULT FALSE,
    tracked_notes            TEXT,
    homepage                 TEXT,
    google_scholar_id        TEXT,
    added_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paper_authors (
    paper_id          TEXT,
    author_id         TEXT,
    author_order      INTEGER,
    is_first          BOOLEAN,
    is_last           BOOLEAN,
    is_corresponding  BOOLEAN,
    affiliation_ids   JSON,
    PRIMARY KEY (paper_id, author_id)
);

CREATE TABLE IF NOT EXISTS paper_institutions (
    paper_id           TEXT,
    institution_id     TEXT,
    author_count       INTEGER,
    has_first_author   BOOLEAN,
    has_last_author    BOOLEAN,
    PRIMARY KEY (paper_id, institution_id)
);

CREATE TABLE IF NOT EXISTS ingest_runs (
    id                       INTEGER PRIMARY KEY,
    source                   TEXT,
    started_at               TIMESTAMP,
    finished_at              TIMESTAMP,
    status                   TEXT,
    papers_fetched           INTEGER,
    papers_new               INTEGER,
    papers_level1_passed     INTEGER,
    papers_level2_passed     INTEGER,
    papers_level3_tier_a     INTEGER,
    papers_level3_tier_b     INTEGER,
    papers_level3_tier_c     INTEGER,
    error_message            TEXT,
    details                  JSON
);
CREATE SEQUENCE IF NOT EXISTS seq_ingest_runs START 1;

CREATE TABLE IF NOT EXISTS config_changes (
    id          INTEGER PRIMARY KEY,
    config_file TEXT,
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diff        TEXT
);
CREATE SEQUENCE IF NOT EXISTS seq_config_changes START 1;
```

- [ ] **0.3.4: Write `backend/paperpulse/db/duckdb_client.py`**

```python
"""Thin wrapper around a DuckDB connection with schema bootstrapping."""

from __future__ import annotations

import logging
from pathlib import Path
from threading import Lock
from typing import Any

import duckdb

from paperpulse.paths import duckdb_path

_log = logging.getLogger(__name__)
_SCHEMA_FILE = Path(__file__).parent / "schema.sql"
_lock = Lock()
_conn: duckdb.DuckDBPyConnection | None = None


def get_connection() -> duckdb.DuckDBPyConnection:
    """Return a singleton DuckDB connection. Schema is applied lazily on first call."""
    global _conn
    with _lock:
        if _conn is None:
            path = duckdb_path()
            _log.info("opening duckdb at %s", path)
            _conn = duckdb.connect(str(path))
            _apply_schema(_conn)
        return _conn


def reset_connection() -> None:
    """Test-only helper to drop the singleton (lets tests use temp paths)."""
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
        _conn = None


def _apply_schema(conn: duckdb.DuckDBPyConnection) -> None:
    sql = _SCHEMA_FILE.read_text(encoding="utf-8")
    # Split on semicolons but keep statements that contain JSON braces intact.
    for stmt in (s.strip() for s in sql.split(";")):
        if stmt:
            conn.execute(stmt)


def execute(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> Any:
    return get_connection().execute(sql, params or [])


def fetchall(sql: str, params: tuple[Any, ...] | list[Any] | None = None) -> list[tuple[Any, ...]]:
    return execute(sql, params).fetchall()
```

- [ ] **0.3.5: Write `backend/paperpulse/db/lance_client.py`**

```python
"""LanceDB connection. Phase 1 only opens the DB; tables are created in Phase 3."""

from __future__ import annotations

import logging

import lancedb

from paperpulse.paths import lancedb_path

_log = logging.getLogger(__name__)
_db: lancedb.DBConnection | None = None


def get_db() -> lancedb.DBConnection:
    global _db
    if _db is None:
        path = lancedb_path()
        _log.info("opening lancedb at %s", path)
        _db = lancedb.connect(str(path))
    return _db
```

- [ ] **0.3.6: Update `backend/tests/conftest.py`** — add a fixture that points DuckDB at a temp file per test

Replace the file content with:

```python
"""pytest fixtures shared across the backend test suite."""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from paperpulse import db
from paperpulse.main import create_app


@pytest.fixture(autouse=True)
def isolate_data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Each test gets its own data dir + DuckDB file."""
    data = tmp_path / "data"
    monkeypatch.setenv("PAPERPULSE_DATA_DIR", str(data))
    db.duckdb_client.reset_connection()
    yield data
    db.duckdb_client.reset_connection()


@pytest.fixture
def app():  # type: ignore[no-untyped-def]
    return create_app()


@pytest.fixture
def client(app):  # type: ignore[no-untyped-def]
    with TestClient(app) as c:
        yield c
```

(And update `paperpulse/db/__init__.py` to re-export the client module so `db.duckdb_client` works:)

```python
"""DB modules."""

from paperpulse.db import duckdb_client, lance_client  # noqa: F401
```

- [ ] **0.3.7: Write `backend/tests/unit/test_db_schema.py`** (failing test FIRST)

```python
"""Schema bootstrap smoke tests."""

from __future__ import annotations

from paperpulse.db.duckdb_client import fetchall, get_connection


def test_schema_creates_papers_table() -> None:
    get_connection()
    rows = fetchall(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'main' ORDER BY table_name"
    )
    names = {r[0] for r in rows}
    assert "papers" in names
    assert "institutions" in names
    assert "authors" in names
    assert "paper_authors" in names
    assert "paper_institutions" in names
    assert "ingest_runs" in names
    assert "config_changes" in names


def test_papers_table_has_expected_columns() -> None:
    get_connection()
    rows = fetchall("PRAGMA table_info('papers')")
    cols = {r[1] for r in rows}
    for required in [
        "id", "source", "source_id", "doi", "arxiv_id",
        "title", "abstract", "authors", "published_at",
        "tier", "primary_topic", "user_status",
    ]:
        assert required in cols, f"missing column: {required}"


def test_inserting_a_minimal_paper_round_trips() -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO papers (id, source, source_id, title) VALUES (?, ?, ?, ?)",
        ["sha1_test", "arxiv", "2511.0001", "Smoke test paper"],
    )
    rows = fetchall("SELECT id, title FROM papers")
    assert rows == [("sha1_test", "Smoke test paper")]
```

- [ ] **0.3.8: Run the schema tests**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run pytest tests/unit/test_db_schema.py -v
```
Expected: `3 passed`.

- [ ] **0.3.9: Commit PR #0.3**

```bash
cd /Users/barca/Dev/paperpulse
git add backend/paperpulse/db/ backend/paperpulse/__init__.py backend/tests/conftest.py \
        backend/tests/unit/test_db_schema.py docs/spec-questions.md
git commit -m "feat(db): PR #0.3 DuckDB + LanceDB schema bootstrap

- Adds schema.sql with papers / institutions / authors / paper_authors /
  paper_institutions / ingest_runs / config_changes (subset of spec §6)
- FTS5 deferred to Phase 6 — rationale logged in docs/spec-questions.md Q1
- LanceDB connection helper (no tables yet — Phase 3 will add embeddings)
- pytest fixture isolates each test in a tmp data dir

Refs: SPEC §6, §18 PR #0.3"
```

---

## PR #0.4: YAML config system + watchdog hot-reload

**Files:**
- Create: `backend/paperpulse/config.py`, `backend/tests/unit/test_config.py`
- Create: `config/sources.yml`, `config/keywords.yml`, `config/seeds.yml`, `config/topics.yml`, `config/institutions.yml`, `config/authors.yml`, `config/tiers.yml`, `config/conferences.yml`, `config/app.yml`

- [ ] **0.4.1: Write the 9 default YAML files**

For each file below, copy the example block from spec §7 verbatim. Use these minimal initial bodies (the user can edit later):

`config/sources.yml` — copy spec §7.1 (full block, ~100 lines).

`config/keywords.yml` — copy spec §7.2 (full block).

`config/seeds.yml` — start with empty seeds and a meta block:

```yaml
seed_papers: []
user_must_read_papers: []
seed_meta:
  last_embedded_at: null
  embedding_model: "bge-m3"
  total_active: 0
```

`config/topics.yml` — start with the example topic from spec §7.4:

```yaml
topics:
  - name: "LLM Agents for Finance"
    slug: "llm-agents-finance"
    side: "crosscut"
    description_en: |
      Large language model agents applied to financial tasks.
    description_zh: "LLM 金融 agent"
    weight: 1.5
    color: "#8b5cf6"
```

`config/institutions.yml`:

```yaml
whitelist:
  academic_cs: []
  academic_finance: []
  industry_ai: []
  industry_finance: []
  government_regulator: []
blacklist: []
```

`config/authors.yml`:

```yaml
tracked_authors: []
```

`config/tiers.yml` — copy spec §7.7 verbatim.

`config/conferences.yml` — empty list:

```yaml
conferences: []
```

`config/app.yml` — copy spec §7.9 verbatim.

(Use the `Write` tool for each file; do not abbreviate by saying "copy" — actually write the full content. The exact content matters for the watcher tests below.)

- [ ] **0.4.2: Write `backend/paperpulse/config.py`**

```python
"""YAML config loader with hot-reload via watchdog.

Public surface:
    cfg = ConfigStore()
    cfg.load_all()                   # populate
    cfg.start_watching()             # begin watching config_dir() for changes
    cfg.app                           # parsed app.yml as dict
    cfg.subscribe(lambda name: ...)  # called when a config file changes
"""

from __future__ import annotations

import logging
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

import yaml
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from paperpulse.paths import config_dir

_log = logging.getLogger(__name__)

_KNOWN_FILES = {
    "sources",
    "keywords",
    "seeds",
    "topics",
    "institutions",
    "authors",
    "tiers",
    "conferences",
    "app",
}


class ConfigStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._values: dict[str, dict[str, Any]] = {}
        self._subscribers: list[Callable[[str], None]] = []
        self._observer: Observer | None = None

    # --- loading ----------------------------------------------------

    def load_all(self) -> None:
        with self._lock:
            for name in _KNOWN_FILES:
                self._load_one(name)

    def reload(self, name: str) -> None:
        if name not in _KNOWN_FILES:
            _log.debug("ignoring unknown config file: %s", name)
            return
        with self._lock:
            self._load_one(name)
        for cb in list(self._subscribers):
            try:
                cb(name)
            except Exception:
                _log.exception("config subscriber raised on reload of %s", name)

    def _load_one(self, name: str) -> None:
        path = config_dir() / f"{name}.yml"
        if not path.exists():
            _log.warning("config file missing: %s", path)
            self._values[name] = {}
            return
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        if not isinstance(data, dict):
            raise ValueError(f"{path}: top-level must be a mapping, got {type(data)}")
        self._values[name] = data
        _log.info("loaded config %s (%d top-level keys)", name, len(data))

    # --- accessors --------------------------------------------------

    def get(self, name: str) -> dict[str, Any]:
        with self._lock:
            return dict(self._values.get(name, {}))

    @property
    def app(self) -> dict[str, Any]:
        return self.get("app")

    @property
    def sources(self) -> dict[str, Any]:
        return self.get("sources")

    # --- watching ---------------------------------------------------

    def subscribe(self, cb: Callable[[str], None]) -> None:
        self._subscribers.append(cb)

    def start_watching(self) -> None:
        if self._observer is not None:
            return
        observer = Observer()
        observer.schedule(_Handler(self), str(config_dir()), recursive=False)
        observer.start()
        self._observer = observer
        _log.info("config watcher started on %s", config_dir())

    def stop_watching(self) -> None:
        if self._observer is not None:
            self._observer.stop()
            self._observer.join(timeout=2)
            self._observer = None


class _Handler(FileSystemEventHandler):
    def __init__(self, store: ConfigStore) -> None:
        self.store = store

    def _maybe_reload(self, path: str) -> None:
        p = Path(path)
        if p.suffix == ".yml" and p.stem in _KNOWN_FILES:
            self.store.reload(p.stem)

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._maybe_reload(str(event.src_path))

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._maybe_reload(str(event.src_path))


# Process-wide singleton, lazily initialised.
_store: ConfigStore | None = None


def get_store() -> ConfigStore:
    global _store
    if _store is None:
        _store = ConfigStore()
        _store.load_all()
    return _store


def reset_store() -> None:
    """Test helper."""
    global _store
    if _store is not None:
        _store.stop_watching()
    _store = None
```

- [ ] **0.4.3: Update `backend/tests/conftest.py`** — also reset the config store between tests and point `PAPERPULSE_CONFIG_DIR` at a temp dir

Replace the `isolate_data_dir` fixture with:

```python
@pytest.fixture(autouse=True)
def isolate_runtime(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Each test gets its own data dir, config dir, and DB connection."""
    from paperpulse import config as config_module

    data = tmp_path / "data"
    cfg = tmp_path / "config"
    cfg.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("PAPERPULSE_DATA_DIR", str(data))
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(cfg))

    # Seed each known config file with an empty mapping so loaders don't warn.
    for name in ["sources", "keywords", "seeds", "topics", "institutions",
                 "authors", "tiers", "conferences", "app"]:
        (cfg / f"{name}.yml").write_text("{}\n", encoding="utf-8")

    db.duckdb_client.reset_connection()
    config_module.reset_store()
    yield data
    config_module.reset_store()
    db.duckdb_client.reset_connection()
```

(Drop the obsolete `isolate_data_dir` fixture — replace it with `isolate_runtime`.)

- [ ] **0.4.4: Write `backend/tests/unit/test_config.py`** (failing test FIRST)

```python
"""ConfigStore: load + reload + watcher."""

from __future__ import annotations

import time
from pathlib import Path

from paperpulse.config import ConfigStore


def _write(path: Path, body: str) -> None:
    path.write_text(body, encoding="utf-8")


def test_load_all_reads_known_yaml_files(tmp_path: Path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(tmp_path))
    _write(tmp_path / "app.yml", "schedule:\n  daily_ingest_time: '07:30'\n")
    _write(tmp_path / "sources.yml", "sources: {arxiv: {enabled: true}}\n")
    for name in ["keywords", "seeds", "topics", "institutions",
                 "authors", "tiers", "conferences"]:
        _write(tmp_path / f"{name}.yml", "{}\n")

    store = ConfigStore()
    store.load_all()

    assert store.app["schedule"]["daily_ingest_time"] == "07:30"
    assert store.sources["sources"]["arxiv"]["enabled"] is True


def test_reload_updates_in_memory_value(tmp_path: Path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(tmp_path))
    for name in ["sources", "keywords", "seeds", "topics", "institutions",
                 "authors", "tiers", "conferences", "app"]:
        _write(tmp_path / f"{name}.yml", "{}\n")
    store = ConfigStore()
    store.load_all()
    assert store.app == {}

    _write(tmp_path / "app.yml", "schedule: {daily_ingest_time: '08:00'}\n")
    store.reload("app")
    assert store.app["schedule"]["daily_ingest_time"] == "08:00"


def test_subscriber_fires_on_file_change(tmp_path: Path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(tmp_path))
    for name in ["sources", "keywords", "seeds", "topics", "institutions",
                 "authors", "tiers", "conferences", "app"]:
        _write(tmp_path / f"{name}.yml", "{}\n")
    store = ConfigStore()
    store.load_all()
    notified: list[str] = []
    store.subscribe(notified.append)
    store.start_watching()
    try:
        _write(tmp_path / "app.yml", "x: 1\n")
        # Watchdog uses inotify/FSEvents; allow time for the event to bubble.
        for _ in range(20):
            if "app" in notified:
                break
            time.sleep(0.1)
    finally:
        store.stop_watching()
    assert "app" in notified
    assert store.app == {"x": 1}
```

- [ ] **0.4.5: Run the config tests**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run pytest tests/unit/test_config.py -v
```
Expected: `3 passed`. (The watcher test may be slow on first run because of FSEvents priming.)

- [ ] **0.4.6: Wire the config store into `main.py` lifespan**

Edit `backend/paperpulse/main.py` `lifespan` to:

```python
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    from paperpulse.config import get_store

    store = get_store()
    store.start_watching()
    try:
        yield
    finally:
        store.stop_watching()
```

- [ ] **0.4.7: Commit PR #0.4**

```bash
cd /Users/barca/Dev/paperpulse
git add config/ backend/paperpulse/config.py backend/paperpulse/main.py \
        backend/tests/conftest.py backend/tests/unit/test_config.py
git commit -m "feat(config): PR #0.4 YAML config loader + watchdog hot-reload

- Adds 9 default YAML files in config/ (matches spec §7)
- ConfigStore: load_all / reload / subscribe / start_watching
- watchdog observer fires reload events when files change on disk
- FastAPI lifespan starts/stops the watcher

Refs: SPEC §7, §18 PR #0.4"
```

---

## PR #0.5: structlog logging + global error handler

**Files:**
- Create: `backend/paperpulse/logging_setup.py`, `backend/tests/unit/test_logging.py`
- Modify: `backend/paperpulse/main.py` (call setup_logging on startup, register error handler)

- [ ] **0.5.1: Write `backend/paperpulse/logging_setup.py`**

```python
"""structlog configuration for the sidecar.

Calling `setup_logging()` once at startup is idempotent. JSON output goes
to stderr so it is easy to grep, redirect, or attach to Tauri logs.
"""

from __future__ import annotations

import logging
import os
import sys

import structlog


def setup_logging(level: str | None = None) -> None:
    lvl = (level or os.environ.get("PAPERPULSE_LOG_LEVEL", "INFO")).upper()

    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        timestamper,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, lvl, logging.INFO)),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
        cache_logger_on_first_use=True,
    )

    # Bridge stdlib logging into structlog so libraries (uvicorn, watchdog) flow through.
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(
        logging.Formatter(
            fmt='{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)r}',
            datefmt="%Y-%m-%dT%H:%M:%SZ",
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(lvl)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
```

- [ ] **0.5.2: Write `backend/tests/unit/test_logging.py`**

```python
"""Logging setup is idempotent and produces JSON output."""

from __future__ import annotations

import io
import json
import logging
import sys

from paperpulse.logging_setup import get_logger, setup_logging


def test_setup_logging_is_idempotent() -> None:
    setup_logging("DEBUG")
    setup_logging("INFO")
    log = get_logger("test")
    log.info("hello", k=1)


def test_logger_emits_json_with_event(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    buf = io.StringIO()
    monkeypatch.setattr(sys, "stderr", buf)
    setup_logging("INFO")
    log = get_logger("smoke")
    log.info("hello", payload="x")
    out = buf.getvalue().strip().splitlines()[-1]
    parsed = json.loads(out)
    assert parsed["event"] == "hello"
    assert parsed["payload"] == "x"
    assert parsed["level"] == "info"
    # cleanup: reset root logger so other tests aren't affected
    logging.getLogger().handlers.clear()
```

- [ ] **0.5.3: Run logging tests**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run pytest tests/unit/test_logging.py -v
```
Expected: `2 passed`.

- [ ] **0.5.4: Wire logging + error handler into `main.py`**

Add to top of `backend/paperpulse/main.py`:

```python
from fastapi import Request
from fastapi.responses import JSONResponse

from paperpulse.logging_setup import get_logger, setup_logging

setup_logging()
_log = get_logger(__name__)
```

Inside `create_app()`, after `app.include_router(api_router)`, add:

```python
    @app.exception_handler(Exception)
    async def _unhandled(_req: Request, exc: Exception) -> JSONResponse:
        _log.exception("unhandled exception", error=repr(exc))
        return JSONResponse(
            status_code=500,
            content={"error": "internal_error", "detail": str(exc)},
        )
```

- [ ] **0.5.5: Commit PR #0.5**

```bash
cd /Users/barca/Dev/paperpulse
git add backend/paperpulse/logging_setup.py backend/paperpulse/main.py \
        backend/tests/unit/test_logging.py
git commit -m "feat(logging): PR #0.5 structlog JSON logging + global error handler

- structlog renders to stderr as JSON, idempotent setup_logging()
- Stdlib logging bridge so uvicorn/watchdog flow through
- FastAPI exception_handler catches unhandled errors → 500 + structured log

Refs: SPEC §16, §18 PR #0.5"
```

---

## PR #0.6: Makefile + CI + lint/typecheck configs

**Files:**
- Create: `Makefile`, `.github/workflows/ci.yml`, `CLAUDE.md`, `README.md`

- [ ] **0.6.1: Write `Makefile`**

```makefile
# PaperPulse Makefile — see SPEC §18 / §A.1
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
PNPM ?= pnpm
UV   ?= uv

.PHONY: help install dev sidecar test test-unit test-integration test-frontend lint typecheck all clean

help:
	@grep -E '^[a-zA-Z_-]+:' $(MAKEFILE_LIST) | sed 's/:.*//' | sort

install:
	$(PNPM) install
	cd backend && $(UV) sync

dev:
	@echo ">>> Starting Tauri (will spawn Python sidecar via Rust)"
	$(PNPM) tauri dev

sidecar:
	cd backend && $(UV) run uvicorn paperpulse.main:app --host 127.0.0.1 --port 8765 --reload

# --- tests --------------------------------------------------------------

test: test-unit test-integration

test-unit:
	cd backend && $(UV) run pytest tests/unit -v

test-integration:
	cd backend && $(UV) run pytest tests/integration -v

test-frontend:
	@echo ">>> Frontend tests not yet wired (Phase 6)"

# --- quality gates ------------------------------------------------------

lint:
	cd backend && $(UV) run ruff check paperpulse tests
	$(PNPM) lint

typecheck:
	cd backend && $(UV) run mypy paperpulse
	$(PNPM) typecheck

all: lint typecheck test

clean:
	rm -rf node_modules dist src-tauri/target backend/.venv backend/.pytest_cache backend/.mypy_cache backend/.ruff_cache
```

- [ ] **0.6.2: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.13" }
      - name: Install uv
        run: curl -LsSf https://astral.sh/uv/install.sh | sh
      - name: Install deps
        working-directory: backend
        run: |
          export PATH="$HOME/.local/bin:$PATH"
          uv sync
      - name: Lint
        working-directory: backend
        run: |
          export PATH="$HOME/.local/bin:$PATH"
          uv run ruff check paperpulse tests
      - name: Typecheck
        working-directory: backend
        run: |
          export PATH="$HOME/.local/bin:$PATH"
          uv run mypy paperpulse
      - name: Test
        working-directory: backend
        run: |
          export PATH="$HOME/.local/bin:$PATH"
          uv run pytest -v

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
```

- [ ] **0.6.3: Write `CLAUDE.md`** (uses spec §A.1 template)

```markdown
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

3. **UI REUSE**: Always check `design-reference/design/src/` before creating new
   UI. Copy, don't recreate. Replace mock imports with real API hooks.
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
```

- [ ] **0.6.4: Write `README.md`**

```markdown
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
```
make all       # lint + typecheck + test
make test      # tests only
make test-unit
```
```

- [ ] **0.6.5: Run the full quality gate locally**

```bash
cd /Users/barca/Dev/paperpulse
source $HOME/.cargo/env
export PATH="$HOME/.local/bin:$PATH"
make lint
make typecheck
make test
```
Expected: all green.

- [ ] **0.6.6: Commit PR #0.6 — Phase 0 done**

```bash
cd /Users/barca/Dev/paperpulse
git add Makefile .github/workflows/ci.yml CLAUDE.md README.md
git commit -m "build: PR #0.6 Makefile + CI + CLAUDE.md + README

- Makefile: install / dev / sidecar / test / lint / typecheck / all
- GitHub Actions CI runs ruff + mypy + pytest + eslint + tsc
- CLAUDE.md per spec §A.1 template
- Closes Phase 0 — make all is green

Refs: SPEC §18 PR #0.6, §19, §A.1"
```

---

# Phase 1: Ingest Pipeline Minimal Loop

---

## PR #1.1: Source ABC + RawPaper + fixtures structure

**Files:**
- Create: `backend/paperpulse/ingest/__init__.py`, `backend/paperpulse/ingest/base.py`
- Create: `backend/tests/fixtures/arxiv/sample_response.xml`, `backend/tests/fixtures/nber/sample_rss.xml`

- [ ] **1.1.1: Write `backend/paperpulse/ingest/__init__.py`** (empty)

```python
```

- [ ] **1.1.2: Write `backend/paperpulse/ingest/base.py`**

```python
"""Source abstraction matching SPEC §8.1.

Each ingest source implements `Source` and yields `RawPaper` instances. A
RawPaper is the lossless extraction from one upstream record; normalization
into the `papers` row happens later in the pipeline.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class RawPaper:
    source: str
    source_id: str
    title: str
    abstract: str | None
    authors_raw: list[dict[str, Any]]
    venue_raw: str | None = None
    published_at: datetime | None = None
    updated_at: datetime | None = None
    doi: str | None = None
    arxiv_id: str | None = None
    pdf_url: str | None = None
    html_url: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


class Source(ABC):
    """Marker interface for a single upstream catalogue."""

    name: str

    @abstractmethod
    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]:
        """Yield RawPaper instances published >= ``since`` (best-effort)."""

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if the upstream is reachable and parseable."""
```

- [ ] **1.1.3: Capture an arXiv API fixture**

Run this small fetch script and save the body to `backend/tests/fixtures/arxiv/sample_response.xml` (the URL hits export.arxiv.org which has no auth and is rate-limited but free):

```bash
cd /Users/barca/Dev/paperpulse
mkdir -p backend/tests/fixtures/arxiv backend/tests/fixtures/nber
curl -sS \
  --user-agent "PaperPulse/0.1 (research tool; rigi.jx@gmail.com)" \
  "http://export.arxiv.org/api/query?search_query=cat:cs.LG&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending" \
  -o backend/tests/fixtures/arxiv/sample_response.xml
test -s backend/tests/fixtures/arxiv/sample_response.xml && \
  head -c 200 backend/tests/fixtures/arxiv/sample_response.xml
```
Expected: a non-empty Atom feed XML starting with `<?xml`.

- [ ] **1.1.4: Capture an NBER RSS fixture**

```bash
curl -sS \
  --user-agent "PaperPulse/0.1 (research tool; rigi.jx@gmail.com)" \
  "https://www.nber.org/rss/new.xml" \
  -o backend/tests/fixtures/nber/sample_rss.xml
test -s backend/tests/fixtures/nber/sample_rss.xml && \
  head -c 200 backend/tests/fixtures/nber/sample_rss.xml
```
Expected: a non-empty RSS XML starting with `<?xml`.

- [ ] **1.1.5: Commit PR #1.1**

```bash
cd /Users/barca/Dev/paperpulse
git add backend/paperpulse/ingest/__init__.py backend/paperpulse/ingest/base.py \
        backend/tests/fixtures/
git commit -m "feat(ingest): PR #1.1 Source ABC + RawPaper + fixtures

- Source ABC and RawPaper dataclass per spec §8.1
- arxiv + NBER response fixtures captured from real upstream

Refs: SPEC §8.1, §18 PR #1.1"
```

---

## PR #1.2: arXiv source with rate-limited client

**Files:**
- Create: `backend/paperpulse/ingest/arxiv.py`, `backend/tests/unit/test_arxiv_source.py`

- [ ] **1.2.1: Write `backend/tests/unit/test_arxiv_source.py`** (failing test FIRST)

```python
"""Arxiv source parses Atom feed responses into RawPaper objects."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from paperpulse.ingest.arxiv import parse_atom_feed

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "arxiv" / "sample_response.xml"


def test_parses_at_least_one_paper() -> None:
    xml = FIXTURE.read_bytes()
    papers = list(parse_atom_feed(xml))
    assert len(papers) >= 1


def test_paper_has_arxiv_id_and_title() -> None:
    papers = list(parse_atom_feed(FIXTURE.read_bytes()))
    p = papers[0]
    assert p.source == "arxiv"
    assert p.arxiv_id  # like "2511.01234" or "2511.01234v1"
    assert "v" not in p.arxiv_id.split(".")[-1] or p.arxiv_id.split("v")[-1].isdigit()
    assert p.title.strip()
    assert isinstance(p.published_at, datetime)
    assert p.html_url == f"https://ar5iv.labs.arxiv.org/html/{p.arxiv_id}"


def test_authors_extracted_with_name_field() -> None:
    papers = list(parse_atom_feed(FIXTURE.read_bytes()))
    p = papers[0]
    assert p.authors_raw, "expected at least one author"
    assert "name" in p.authors_raw[0]
```

- [ ] **1.2.2: Write `backend/paperpulse/ingest/arxiv.py`**

```python
"""arXiv source — parses the Atom feed returned by export.arxiv.org/api/query.

Spec §8.2: 3-second polite delay + record updated high-watermark + ar5iv URL.
We use stdlib xml.etree to avoid pulling in lxml (kept only for the optional
ar5iv parser in Phase 2).
"""

from __future__ import annotations

import logging
import time
import urllib.parse
import urllib.request
from collections.abc import Iterator
from datetime import datetime
from xml.etree import ElementTree as ET

from paperpulse.ingest.base import RawPaper, Source

_log = logging.getLogger(__name__)
_NS = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
_ARXIV_API = "http://export.arxiv.org/api/query"


def _strip_ns(tag: str) -> str:
    return tag.split("}", 1)[-1]


def _text(elem: ET.Element | None) -> str | None:
    if elem is None or elem.text is None:
        return None
    return elem.text.strip() or None


def _bare_arxiv_id(raw_id: str) -> str:
    """`http://arxiv.org/abs/2511.01234v1` → `2511.01234v1`. Keep version suffix."""
    if "/abs/" in raw_id:
        return raw_id.rsplit("/abs/", 1)[1]
    return raw_id


def parse_atom_feed(xml_bytes: bytes) -> Iterator[RawPaper]:
    root = ET.fromstring(xml_bytes)
    for entry in root.findall("a:entry", _NS):
        raw_id = _text(entry.find("a:id", _NS)) or ""
        arxiv_id = _bare_arxiv_id(raw_id)
        title = _text(entry.find("a:title", _NS)) or ""
        summary = _text(entry.find("a:summary", _NS))
        published = _text(entry.find("a:published", _NS))
        updated = _text(entry.find("a:updated", _NS))
        authors = []
        for au in entry.findall("a:author", _NS):
            name = _text(au.find("a:name", _NS))
            if name:
                authors.append({"name": name})
        pdf_url = None
        for link in entry.findall("a:link", _NS):
            if link.get("title") == "pdf":
                pdf_url = link.get("href")
        yield RawPaper(
            source="arxiv",
            source_id=arxiv_id,
            title=" ".join(title.split()),
            abstract=summary,
            authors_raw=authors,
            venue_raw=None,
            published_at=datetime.fromisoformat(published.replace("Z", "+00:00")) if published else None,
            updated_at=datetime.fromisoformat(updated.replace("Z", "+00:00")) if updated else None,
            doi=None,
            arxiv_id=arxiv_id,
            pdf_url=pdf_url,
            html_url=f"https://ar5iv.labs.arxiv.org/html/{arxiv_id}",
            extra={"raw_atom_id": raw_id},
        )


class ArxivSource(Source):
    name = "arxiv"

    def __init__(
        self,
        categories: list[str],
        *,
        max_results: int = 200,
        polite_delay_seconds: float = 3.0,
        user_agent: str = "PaperPulse/0.1 (research tool; rigi.jx@gmail.com)",
        timeout_seconds: int = 30,
    ) -> None:
        self.categories = categories
        self.max_results = max_results
        self.polite_delay_seconds = polite_delay_seconds
        self.user_agent = user_agent
        self.timeout_seconds = timeout_seconds

    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]:  # noqa: ARG002
        # Phase 1: ignore `since` and just grab the most recent N papers per
        # category (sorted by submittedDate desc). Incremental high-watermark
        # logic ships with the dedup PR (#1.3).
        for cat in self.categories:
            yield from self._fetch_category(cat)
            if self.polite_delay_seconds:
                time.sleep(self.polite_delay_seconds)

    def _fetch_category(self, category: str) -> Iterator[RawPaper]:
        params = {
            "search_query": f"cat:{category}",
            "start": 0,
            "max_results": self.max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
        url = f"{_ARXIV_API}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        _log.info("fetching arxiv category=%s url=%s", category, url)
        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
            xml_bytes = resp.read()
        yield from parse_atom_feed(xml_bytes)

    def health_check(self) -> bool:
        try:
            req = urllib.request.Request(_ARXIV_API + "?search_query=cat:cs.LG&max_results=1",
                                         headers={"User-Agent": self.user_agent})
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                return resp.status == 200
        except Exception:
            _log.exception("arxiv health check failed")
            return False
```

- [ ] **1.2.3: Run the unit tests**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run pytest tests/unit/test_arxiv_source.py -v
```
Expected: `3 passed`.

- [ ] **1.2.4: Live smoke (manual, single fetch)**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run python -c "
from paperpulse.ingest.arxiv import ArxivSource
s = ArxivSource(['cs.LG'], max_results=5, polite_delay_seconds=0)
papers = list(s.fetch())
print(f'fetched {len(papers)} papers; first title: {papers[0].title[:80]!r}')
"
```
Expected: 5 papers fetched, first title printed.

- [ ] **1.2.5: Commit PR #1.2**

```bash
cd /Users/barca/Dev/paperpulse
git add backend/paperpulse/ingest/arxiv.py backend/tests/unit/test_arxiv_source.py
git commit -m "feat(ingest): PR #1.2 arXiv source with 3s polite delay

- ArxivSource fetches per-category Atom feed, parses with stdlib xml.etree
- 3-second sleep between categories per spec §8.2 / §A.4
- ar5iv URL populated for every paper (used by Phase 2 fallback)
- Unit tests cover fixture parsing; live smoke verified

Refs: SPEC §8.2, §18 PR #1.2"
```

---

## PR #1.3: Dedup + ingest_runs + storage helpers

**Files:**
- Create: `backend/paperpulse/ingest/dedup.py`, `backend/paperpulse/ingest/runner.py`
- Create: `backend/tests/unit/test_dedup.py`, `backend/tests/integration/test_ingest_end_to_end.py`

- [ ] **1.3.1: Write `backend/tests/unit/test_dedup.py`** (failing test FIRST)

```python
"""Dedup logic from spec §8.3."""

from __future__ import annotations

from datetime import datetime

from paperpulse.db.duckdb_client import execute, fetchall, get_connection
from paperpulse.ingest.base import RawPaper
from paperpulse.ingest.dedup import generate_id, normalize_title, upsert_raw


def _raw(**kw):  # type: ignore[no-untyped-def]
    base = dict(
        source="arxiv", source_id="2511.0001",
        title="A Multi-Agent Framework for Portfolio Optimisation",
        abstract="…", authors_raw=[{"name": "Alice"}],
        published_at=datetime(2026, 4, 23),
        arxiv_id="2511.0001v1",
        doi=None,
    )
    base.update(kw)
    return RawPaper(**base)


def test_generate_id_is_stable() -> None:
    p = _raw()
    assert generate_id(p) == generate_id(p)


def test_generate_id_strips_arxiv_version_for_stability() -> None:
    p1 = _raw(arxiv_id="2511.0001v1")
    p2 = _raw(arxiv_id="2511.0001v2")
    assert generate_id(p1) == generate_id(p2)


def test_normalize_title_lowercases_and_strips_punctuation() -> None:
    assert normalize_title("Hello, World!") == "hello world"


def test_upsert_inserts_new_paper() -> None:
    get_connection()
    p = _raw()
    pid, is_new = upsert_raw(p)
    assert is_new is True
    rows = fetchall("SELECT id, title FROM papers WHERE id = ?", [pid])
    assert rows and rows[0][1].startswith("A Multi-Agent")


def test_upsert_dedups_by_arxiv_id_across_versions() -> None:
    get_connection()
    p1 = _raw(arxiv_id="2511.0001v1")
    p2 = _raw(arxiv_id="2511.0001v2", title="Updated title v2")
    pid1, new1 = upsert_raw(p1)
    pid2, new2 = upsert_raw(p2)
    assert new1 is True
    assert new2 is False
    assert pid1 == pid2
    rows = fetchall("SELECT title FROM papers WHERE id = ?", [pid1])
    assert rows[0][0] == "Updated title v2"


def test_upsert_dedups_by_doi_across_sources() -> None:
    get_connection()
    a = _raw(source="arxiv", arxiv_id="2511.0002", doi="10.1000/xyz")
    b = _raw(source="crossref", source_id="10.1000/xyz", arxiv_id=None, doi="10.1000/xyz")
    pid_a, _ = upsert_raw(a)
    pid_b, new_b = upsert_raw(b)
    assert pid_a == pid_b
    assert new_b is False


def test_upsert_dedups_by_fuzzy_title_first_author_year() -> None:
    get_connection()
    a = _raw(arxiv_id=None, doi=None, title="Deep Learning for Asset Pricing")
    b = _raw(
        source="nber",
        source_id="w99999",
        arxiv_id=None, doi=None,
        title="Deep Learning for Asset Pricing.",  # punctuation difference
        authors_raw=[{"name": "Alice"}],
    )
    pid_a, _ = upsert_raw(a)
    pid_b, new_b = upsert_raw(b)
    assert pid_a == pid_b
    assert new_b is False


def test_ingest_runs_table_exists_and_accepts_inserts() -> None:
    get_connection()
    execute(
        "INSERT INTO ingest_runs (id, source, started_at, finished_at, status, "
        "papers_fetched, papers_new) VALUES (nextval('seq_ingest_runs'), ?, ?, ?, ?, ?, ?)",
        ["arxiv", datetime.now(), datetime.now(), "success", 10, 7],
    )
    rows = fetchall("SELECT source, papers_new FROM ingest_runs")
    assert rows == [("arxiv", 7)]
```

- [ ] **1.3.2: Write `backend/paperpulse/ingest/dedup.py`**

```python
"""Dedup + storage of RawPaper into the `papers` table.

Spec §8.3 ordering:
    1. DOI exact
    2. arxiv_id exact (version-stripped)
    3. fuzzy title + first_author + year
    4. new — generate stable id from normalized fields
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime

from rapidfuzz import fuzz

from paperpulse.db.duckdb_client import execute, fetchall
from paperpulse.ingest.base import RawPaper

_log = logging.getLogger(__name__)
_PUNCT_RE = re.compile(r"[^\w\s]+", flags=re.UNICODE)
_WS_RE = re.compile(r"\s+")


def normalize_title(title: str) -> str:
    t = _PUNCT_RE.sub("", title.lower())
    t = _WS_RE.sub(" ", t).strip()
    return t


def strip_arxiv_version(arxiv_id: str | None) -> str | None:
    if not arxiv_id:
        return None
    if "v" in arxiv_id and arxiv_id.split("v")[-1].isdigit():
        return arxiv_id.rsplit("v", 1)[0]
    return arxiv_id


def _first_author_name(raw: RawPaper) -> str:
    if raw.authors_raw:
        return raw.authors_raw[0].get("name", "")
    return ""


def generate_id(raw: RawPaper) -> str:
    norm = normalize_title(raw.title)
    first = _first_author_name(raw).lower().strip()
    year = raw.published_at.year if raw.published_at else 0
    arxiv = strip_arxiv_version(raw.arxiv_id) or ""
    payload = f"{norm}|{first}|{year}|{arxiv}|{raw.doi or ''}"
    return "sha1_" + hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]


def _find_existing(raw: RawPaper) -> str | None:
    # 1. DOI exact
    if raw.doi:
        rows = fetchall("SELECT id FROM papers WHERE doi = ?", [raw.doi])
        if rows:
            return str(rows[0][0])
    # 2. arxiv_id (version-stripped)
    bare = strip_arxiv_version(raw.arxiv_id)
    if bare:
        rows = fetchall(
            "SELECT id, arxiv_id FROM papers WHERE arxiv_id = ? OR arxiv_id LIKE ?",
            [bare, f"{bare}v%"],
        )
        if rows:
            return str(rows[0][0])
    # 3. Fuzzy by normalized title within same year + first-author surname match
    year = raw.published_at.year if raw.published_at else None
    if year is None:
        return None
    candidates = fetchall(
        "SELECT id, title_normalized, authors FROM papers "
        "WHERE EXTRACT(YEAR FROM published_at) = ?",
        [year],
    )
    norm = normalize_title(raw.title)
    raw_first = _first_author_name(raw).lower()
    for cid, c_norm, c_authors_json in candidates:
        if not c_norm:
            continue
        if fuzz.ratio(norm, c_norm) > 95:
            try:
                c_authors = json.loads(c_authors_json) if c_authors_json else []
            except json.JSONDecodeError:
                c_authors = []
            c_first = c_authors[0].get("name", "").lower() if c_authors else ""
            if c_first and raw_first and c_first.split()[-1] == raw_first.split()[-1]:
                return str(cid)
    return None


def upsert_raw(raw: RawPaper) -> tuple[str, bool]:
    """Insert or refresh a paper. Returns (paper_id, is_new)."""
    existing = _find_existing(raw)
    if existing is not None:
        execute(
            "UPDATE papers SET title = ?, title_normalized = ?, abstract = ?, "
            "authors = ?, updated_at = ?, pdf_url = COALESCE(?, pdf_url), "
            "html_url = COALESCE(?, html_url) WHERE id = ?",
            [
                raw.title,
                normalize_title(raw.title),
                raw.abstract,
                json.dumps(raw.authors_raw),
                raw.updated_at,
                raw.pdf_url,
                raw.html_url,
                existing,
            ],
        )
        return existing, False

    new_id = generate_id(raw)
    execute(
        "INSERT INTO papers (id, source, source_id, doi, arxiv_id, title, "
        "title_normalized, abstract, authors, published_at, updated_at, "
        "pdf_url, html_url) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            new_id,
            raw.source,
            raw.source_id,
            raw.doi,
            raw.arxiv_id,
            raw.title,
            normalize_title(raw.title),
            raw.abstract,
            json.dumps(raw.authors_raw),
            raw.published_at,
            raw.updated_at,
            raw.pdf_url,
            raw.html_url,
        ],
    )
    return new_id, True


def record_run(
    source: str,
    *,
    started_at: datetime,
    finished_at: datetime,
    status: str,
    papers_fetched: int,
    papers_new: int,
    error_message: str | None = None,
) -> None:
    execute(
        "INSERT INTO ingest_runs (id, source, started_at, finished_at, status, "
        "papers_fetched, papers_new, error_message) "
        "VALUES (nextval('seq_ingest_runs'), ?, ?, ?, ?, ?, ?, ?)",
        [source, started_at, finished_at, status, papers_fetched, papers_new, error_message],
    )
```

- [ ] **1.3.3: Write `backend/paperpulse/ingest/runner.py`**

```python
"""Drives a Source through fetch → upsert → record run."""

from __future__ import annotations

import logging
from datetime import datetime

from paperpulse.ingest.base import Source
from paperpulse.ingest.dedup import record_run, upsert_raw

_log = logging.getLogger(__name__)


def run_source(source: Source) -> tuple[int, int]:
    """Fetch all papers from `source` and upsert. Returns (fetched, new)."""
    started = datetime.now()
    fetched = 0
    new = 0
    error: str | None = None
    try:
        for raw in source.fetch():
            fetched += 1
            _, is_new = upsert_raw(raw)
            if is_new:
                new += 1
        status = "success"
    except Exception as e:
        _log.exception("ingest run failed for source=%s", source.name)
        error = repr(e)
        status = "failed"
    finally:
        record_run(
            source.name,
            started_at=started,
            finished_at=datetime.now(),
            status=status,
            papers_fetched=fetched,
            papers_new=new,
            error_message=error,
        )
    return fetched, new
```

- [ ] **1.3.4: Write `backend/tests/integration/test_ingest_end_to_end.py`** — uses fixture, no network

```python
"""End-to-end ingest using the saved arXiv fixture (no network)."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime
from pathlib import Path

from paperpulse.db.duckdb_client import fetchall
from paperpulse.ingest.arxiv import parse_atom_feed
from paperpulse.ingest.base import RawPaper, Source
from paperpulse.ingest.runner import run_source

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "arxiv" / "sample_response.xml"


class _FixtureSource(Source):
    name = "arxiv"

    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]:  # noqa: ARG002
        yield from parse_atom_feed(FIXTURE.read_bytes())

    def health_check(self) -> bool:
        return True


def test_run_source_inserts_papers_and_records_run() -> None:
    fetched, new = run_source(_FixtureSource())
    assert fetched >= 1
    assert new == fetched
    rows = fetchall("SELECT COUNT(*) FROM papers WHERE source = 'arxiv'")
    assert rows[0][0] == fetched
    runs = fetchall("SELECT source, status, papers_fetched, papers_new FROM ingest_runs")
    assert runs == [("arxiv", "success", fetched, new)]


def test_running_twice_does_not_create_duplicates() -> None:
    run_source(_FixtureSource())
    run_source(_FixtureSource())
    count = fetchall("SELECT COUNT(*) FROM papers WHERE source = 'arxiv'")[0][0]
    fixture_count = sum(1 for _ in parse_atom_feed(FIXTURE.read_bytes()))
    assert count == fixture_count
```

- [ ] **1.3.5: Run dedup + integration tests**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run pytest tests/unit/test_dedup.py tests/integration/test_ingest_end_to_end.py -v
```
Expected: all pass.

- [ ] **1.3.6: Commit PR #1.3**

```bash
cd /Users/barca/Dev/paperpulse
git add backend/paperpulse/ingest/dedup.py backend/paperpulse/ingest/runner.py \
        backend/tests/unit/test_dedup.py backend/tests/integration/test_ingest_end_to_end.py
git commit -m "feat(ingest): PR #1.3 dedup (DOI / arxiv_id / fuzzy) + ingest_runs

- generate_id: sha1 of normalized_title + first_author + year + arxiv_id + doi
- upsert_raw: DOI → arxiv_id → fuzzy (rapidfuzz) → insert
- record_run writes to ingest_runs sequence
- Re-running the same fetch is idempotent (verified by integration test)

Refs: SPEC §8.3, §6.7, §18 PR #1.3"
```

---

## PR #1.4: NBER source

**Files:**
- Create: `backend/paperpulse/ingest/nber.py`, `backend/tests/unit/test_nber_source.py`

- [ ] **1.4.1: Write `backend/tests/unit/test_nber_source.py`** (failing test FIRST)

```python
"""NBER source parses the NBER 'new' RSS feed."""

from __future__ import annotations

from pathlib import Path

from paperpulse.ingest.nber import parse_rss

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "nber" / "sample_rss.xml"


def test_parses_at_least_one_entry() -> None:
    papers = list(parse_rss(FIXTURE.read_bytes()))
    assert len(papers) >= 1


def test_each_paper_has_title_and_source_id() -> None:
    papers = list(parse_rss(FIXTURE.read_bytes()))
    p = papers[0]
    assert p.source == "nber"
    assert p.title.strip()
    assert p.source_id  # NBER working paper number, e.g. "w33245"
    assert p.html_url and p.html_url.startswith("http")
```

- [ ] **1.4.2: Write `backend/paperpulse/ingest/nber.py`**

```python
"""NBER source — parses the public NBER 'new working papers' RSS feed.

Spec §8.2: NBER ~200 papers/month, simple RSS at https://www.nber.org/rss/new.xml
"""

from __future__ import annotations

import logging
import re
import urllib.request
from collections.abc import Iterator
from datetime import datetime

import feedparser

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
        link = getattr(entry, "link", "")
        paper_id = _extract_paper_id(link)
        title = getattr(entry, "title", "").strip()
        if not paper_id or not title:
            continue
        published_struct = getattr(entry, "published_parsed", None)
        if published_struct:
            published = datetime(*published_struct[:6])
        else:
            published = None
        # NBER RSS authors come as a single string in `author` or list in `authors`.
        authors_raw: list[dict[str, str]] = []
        for a in getattr(entry, "authors", []) or []:
            name = a.get("name") if isinstance(a, dict) else str(a)
            if name:
                authors_raw.append({"name": name})
        if not authors_raw and getattr(entry, "author", None):
            for name in entry.author.split(","):
                name = name.strip()
                if name:
                    authors_raw.append({"name": name})
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

    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]:  # noqa: ARG002
        req = urllib.request.Request(_RSS_URL, headers={"User-Agent": self.user_agent})
        _log.info("fetching NBER RSS")
        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
            xml_bytes = resp.read()
        yield from parse_rss(xml_bytes)

    def health_check(self) -> bool:
        try:
            req = urllib.request.Request(_RSS_URL, headers={"User-Agent": self.user_agent})
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                return resp.status == 200
        except Exception:
            _log.exception("NBER health check failed")
            return False
```

- [ ] **1.4.3: Run NBER tests**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run pytest tests/unit/test_nber_source.py -v
```
Expected: `2 passed`.

- [ ] **1.4.4: Commit PR #1.4**

```bash
cd /Users/barca/Dev/paperpulse
git add backend/paperpulse/ingest/nber.py backend/tests/unit/test_nber_source.py
git commit -m "feat(ingest): PR #1.4 NBER RSS source

- NberSource fetches https://www.nber.org/rss/new.xml via feedparser
- Extracts NBER paper id (w12345) from entry.link
- Builds canonical PDF + landing URLs

Refs: SPEC §8.2, §18 PR #1.4"
```

---

## PR #1.5: Minimal Feed API + ingest trigger endpoint

**Files:**
- Create: `backend/paperpulse/api/feed.py`, `backend/paperpulse/api/settings.py`
- Modify: `backend/paperpulse/api/router.py` (mount new routers)
- Create: `backend/tests/integration/test_feed_api.py`

- [ ] **1.5.1: Write `backend/paperpulse/api/feed.py`**

```python
"""Phase 1 minimal Feed API. Returns up to 100 most recent papers, no filters.

Schema is a strict subset of spec §14.1; group_by/time_window/etc. arrive in PR #6.1.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from paperpulse.db.duckdb_client import fetchall

router = APIRouter(prefix="/api/v1", tags=["feed"])


class PaperOut(BaseModel):
    id: str
    source: str
    arxiv_id: str | None
    doi: str | None
    title: str
    abstract: str | None
    authors: list[dict[str, Any]]
    published_at: str | None
    pdf_url: str | None
    html_url: str | None
    tier: str | None
    primary_topic: str | None
    relevance_score: int | None
    tldr_en: str | None
    tldr_zh: str | None
    user_status: str


class FeedResponse(BaseModel):
    total: int
    papers: list[PaperOut]


@router.get("/feed", response_model=FeedResponse)
async def get_feed(limit: int = 100) -> FeedResponse:
    rows = fetchall(
        "SELECT id, source, arxiv_id, doi, title, abstract, authors, "
        "       CAST(published_at AS VARCHAR), pdf_url, html_url, "
        "       tier, primary_topic, relevance_score, tldr_en, tldr_zh, user_status "
        "FROM papers "
        "ORDER BY published_at DESC NULLS LAST, ingested_at DESC "
        "LIMIT ?",
        [max(1, min(limit, 500))],
    )
    papers = [
        PaperOut(
            id=r[0], source=r[1], arxiv_id=r[2], doi=r[3], title=r[4],
            abstract=r[5],
            authors=json.loads(r[6]) if r[6] else [],
            published_at=r[7], pdf_url=r[8], html_url=r[9],
            tier=r[10], primary_topic=r[11], relevance_score=r[12],
            tldr_en=r[13], tldr_zh=r[14],
            user_status=r[15] or "unread",
        )
        for r in rows
    ]
    total = fetchall("SELECT COUNT(*) FROM papers")[0][0]
    return FeedResponse(total=total, papers=papers)
```

- [ ] **1.5.2: Write `backend/paperpulse/api/settings.py`** — minimal `run-now` endpoint

```python
"""Phase 1 minimal subset of spec §14.8 — exposes a manual ingest trigger."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from paperpulse.config import get_store
from paperpulse.ingest.arxiv import ArxivSource
from paperpulse.ingest.nber import NberSource
from paperpulse.ingest.runner import run_source

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


class IngestRequest(BaseModel):
    sources: list[str] | None = None  # default: all enabled


class IngestResponse(BaseModel):
    queued: list[str]


def _build_sources(names: list[str] | None) -> list[object]:
    cfg = get_store().sources.get("sources", {})
    arxiv_cfg = cfg.get("arxiv", {})
    enabled = {
        "arxiv": arxiv_cfg.get("enabled", True),
        "nber": cfg.get("nber", {}).get("enabled", True),
    }
    requested = names or [n for n, on in enabled.items() if on]
    out: list[object] = []
    for n in requested:
        if n == "arxiv" and enabled["arxiv"]:
            out.append(
                ArxivSource(
                    categories=arxiv_cfg.get("categories", ["cs.LG"]),
                    max_results=arxiv_cfg.get("max_results_per_run", 200),
                )
            )
        elif n == "nber" and enabled["nber"]:
            out.append(NberSource())
    return out


def _run_all(sources: list[object]) -> None:
    for s in sources:
        run_source(s)  # type: ignore[arg-type]


@router.post("/ingest/run-now", response_model=IngestResponse)
async def ingest_run_now(req: IngestRequest, bg: BackgroundTasks) -> IngestResponse:
    sources = _build_sources(req.sources)
    bg.add_task(_run_all, sources)
    return IngestResponse(queued=[s.name for s in sources])  # type: ignore[attr-defined]
```

- [ ] **1.5.3: Update `backend/paperpulse/api/router.py`**

```python
from __future__ import annotations

from fastapi import APIRouter

from paperpulse.api import feed, hello, settings

api_router = APIRouter()
api_router.include_router(hello.router)
api_router.include_router(feed.router)
api_router.include_router(settings.router)
```

- [ ] **1.5.4: Write `backend/tests/integration/test_feed_api.py`**

```python
"""Feed + ingest API contract tests."""

from __future__ import annotations

import json
from datetime import datetime

from paperpulse.db.duckdb_client import execute, get_connection


def _seed_paper(client_unused, idx: int) -> None:  # type: ignore[no-untyped-def]
    get_connection()
    execute(
        "INSERT INTO papers (id, source, source_id, title, title_normalized, "
        "authors, published_at, user_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            f"sha1_p{idx}", "arxiv", f"2511.{idx:04d}",
            f"Paper {idx}: Multi-Agent Finance",
            f"paper {idx} multi-agent finance",
            json.dumps([{"name": f"Author {idx}"}]),
            datetime(2026, 4, 23 - (idx % 5)),
            "unread",
        ],
    )


def test_feed_returns_seeded_papers(client) -> None:  # type: ignore[no-untyped-def]
    for i in range(3):
        _seed_paper(client, i)
    resp = client.get("/api/v1/feed?limit=10")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["papers"]) == 3
    p = body["papers"][0]
    assert "title" in p and "user_status" in p


def test_feed_limit_caps_results(client) -> None:  # type: ignore[no-untyped-def]
    for i in range(5):
        _seed_paper(client, i)
    resp = client.get("/api/v1/feed?limit=2")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 5
    assert len(body["papers"]) == 2


def test_ingest_run_now_queues_sources_with_default_config(client, tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    # Drop a minimal sources.yml so the endpoint enables arxiv + nber.
    (tmp_path / "config").mkdir(exist_ok=True)
    cfg = tmp_path / "config" / "sources.yml"
    cfg.write_text(
        "sources:\n  arxiv: {enabled: true, categories: [cs.LG], max_results_per_run: 5}\n"
        "  nber: {enabled: true}\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("PAPERPULSE_CONFIG_DIR", str(tmp_path / "config"))
    from paperpulse import config as cfg_mod
    cfg_mod.reset_store()

    resp = client.post("/api/v1/settings/ingest/run-now", json={"sources": ["arxiv"]})
    assert resp.status_code == 200
    body = resp.json()
    assert "arxiv" in body["queued"]
```

- [ ] **1.5.5: Run feed API tests**

```bash
cd /Users/barca/Dev/paperpulse/backend
uv run pytest tests/integration/test_feed_api.py -v
```
Expected: `3 passed`.

- [ ] **1.5.6: Commit PR #1.5**

```bash
cd /Users/barca/Dev/paperpulse
git add backend/paperpulse/api/
git add backend/tests/integration/test_feed_api.py
git commit -m "feat(api): PR #1.5 minimal Feed API + ingest trigger

- GET /api/v1/feed?limit returns recent papers (no filters yet)
- POST /api/v1/settings/ingest/run-now queues arxiv + nber sources in background
- Mounted under existing api_router

Refs: SPEC §14.1 (subset), §14.8, §18 PR #1.5"
```

---

## PR #1.6: UI shell migrated from design-reference (TopBar / SideNav / routes / stub pages)

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/layout/AppShell.tsx`, `TopBar.tsx`, `SideNav.tsx`, `StatusBar.tsx`
- Create: `src/pages/Feed.tsx` (stub for now), `Explore.tsx`, `Dashboard.tsx`, `Network.tsx`, `Conferences.tsx`, `Digest.tsx`, `Institutions.tsx`, `Authors.tsx`, `Settings.tsx`
- Create: `src/lib/api.ts`, `src/lib/types.ts`

- [ ] **1.6.1: Copy layout components from design-reference**

For each file, read the design-reference source and copy it to `src/`. Adjust imports if needed (paths should match aliases). Files to copy:
- `design-reference/design/src/components/layout/AppShell.tsx` → `src/components/layout/AppShell.tsx`
- `design-reference/design/src/components/layout/TopBar.tsx` → `src/components/layout/TopBar.tsx`
- `design-reference/design/src/components/layout/SideNav.tsx` → `src/components/layout/SideNav.tsx`
- `design-reference/design/src/components/layout/StatusBar.tsx` → `src/components/layout/StatusBar.tsx`

For any UI primitive (`@/components/ui/...`) the layout components import, also copy that file from `design-reference/design/src/components/ui/`. Specifically the layout will likely need: `button.tsx`, `badge.tsx`, `input.tsx`, `separator.tsx`, `scroll-area.tsx`, `tabs.tsx`. Use the `Read` tool to scan each layout component first, list every `@/components/ui/X` import, then copy those files too.

If a copied component imports from `@/mocks/...` or `@/stores/app`: **delete the import for now and replace usages with placeholder text or `null`**. The real wiring lands in PR #1.7. Add a `// TODO Phase 1: wire to real API in PR #1.7` comment beside any deleted import.

- [ ] **1.6.2: Write `src/lib/types.ts`**

```typescript
// Mirrors backend Pydantic schema in backend/paperpulse/api/feed.py.
// When backend grows fields, update both sides — types live in spec §6.1.

export type Tier = "A" | "B" | "C";
export type PaperStatus = "unread" | "read" | "saved" | "must_read" | "ignored";

export type PaperAuthor = {
  name: string;
  author_id?: string;
  affiliation_ids?: string[];
  is_first?: boolean;
  is_last?: boolean;
  is_corresponding?: boolean;
};

export type Paper = {
  id: string;
  source: string;
  arxiv_id: string | null;
  doi: string | null;
  title: string;
  abstract: string | null;
  authors: PaperAuthor[];
  published_at: string | null;
  pdf_url: string | null;
  html_url: string | null;
  tier: Tier | null;
  primary_topic: string | null;
  relevance_score: number | null;
  tldr_en: string | null;
  tldr_zh: string | null;
  user_status: PaperStatus;
};

export type FeedResponse = {
  total: number;
  papers: Paper[];
};

export type IngestResponse = { queued: string[] };
```

- [ ] **1.6.3: Write `src/lib/api.ts`**

```typescript
import type { FeedResponse, IngestResponse } from "./types";

const BASE = (import.meta as ImportMeta & { env: { VITE_BACKEND_URL?: string } })
  .env.VITE_BACKEND_URL ?? "http://127.0.0.1:8765";

async function jget<T>(path: string): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!resp.ok) throw new Error(`${path} → ${resp.status} ${await resp.text()}`);
  return (await resp.json()) as T;
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`${path} → ${resp.status} ${await resp.text()}`);
  return (await resp.json()) as T;
}

export const api = {
  health: () => jget<{ status: string; version: string }>("/api/v1/hello"),
  getFeed: (limit = 100) => jget<FeedResponse>(`/api/v1/feed?limit=${limit}`),
  runIngestNow: (sources?: string[]) =>
    jpost<IngestResponse>("/api/v1/settings/ingest/run-now", { sources: sources ?? null }),
};
```

- [ ] **1.6.4: Write stub pages**

For `src/pages/Explore.tsx`, `Dashboard.tsx`, `Network.tsx`, `Conferences.tsx`, `Digest.tsx`, `Institutions.tsx`, `Authors.tsx`, `Settings.tsx`, write the same boilerplate (replace `<Title>`):

```typescript
export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground mt-2">Coming in a later phase.</p>
    </div>
  );
}
```

For `src/pages/Feed.tsx` write a temporary stub (real impl in PR #1.7):

```typescript
export default function Feed() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Feed</h1>
      <p className="text-sm text-muted-foreground mt-2">Loading…</p>
    </div>
  );
}
```

- [ ] **1.6.5: Replace `src/App.tsx` with the routing tree**

```typescript
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import Feed from "@/pages/Feed";
import Explore from "@/pages/Explore";
import Dashboard from "@/pages/Dashboard";
import Network from "@/pages/Network";
import Conferences from "@/pages/Conferences";
import Digest from "@/pages/Digest";
import Institutions from "@/pages/Institutions";
import Authors from "@/pages/Authors";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/feed" replace />} />
        <Route path="feed" element={<Feed />} />
        <Route path="explore" element={<Explore />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="network" element={<Network />} />
        <Route path="conferences" element={<Conferences />} />
        <Route path="digest" element={<Digest />} />
        <Route path="institutions" element={<Institutions />} />
        <Route path="authors" element={<Authors />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **1.6.6: Run typecheck + lint**

```bash
cd /Users/barca/Dev/paperpulse
pnpm typecheck
pnpm lint
```
Expected: 0 errors. (Warnings about unused vars in stubs are OK.)

- [ ] **1.6.7: Visual smoke (manual)**

```bash
cd /Users/barca/Dev/paperpulse
pnpm dev &
DEV_PID=$!
sleep 5
echo "Open http://localhost:1420 in a browser; verify the AppShell + SideNav appear and clicking each nav item routes correctly."
read -p "Press Enter when verified… " _
kill $DEV_PID 2>/dev/null
```
Expected: shell layout matches design-reference visually.

- [ ] **1.6.8: Commit PR #1.6**

```bash
cd /Users/barca/Dev/paperpulse
git add src/
git commit -m "feat(ui): PR #1.6 layout shell migrated from design-reference

- AppShell + TopBar + SideNav + StatusBar copied from design-reference
- Routes for all 9 main pages (8 stubs + Feed placeholder)
- Mock imports stripped — real API wiring in PR #1.7
- src/lib/api.ts client + src/lib/types.ts mirror backend Pydantic schema

Refs: SPEC §12.1, §22, Appendix E, §18 PR #1.6"
```

---

## PR #1.7: Feed page — real API rendering

**Files:**
- Modify: `src/pages/Feed.tsx`
- Create: `src/hooks/useFeed.ts`
- Modify: `src/components/layout/StatusBar.tsx` (show backend health)

- [ ] **1.7.1: Write `src/hooks/useFeed.ts`**

```typescript
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FeedResponse } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: FeedResponse }
  | { kind: "error"; message: string };

export function useFeed(limit = 100) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .getFeed(limit)
      .then((data) => {
        if (!cancelled) setState({ kind: "ok", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [limit, tick]);

  return { state, reload };
}
```

- [ ] **1.7.2: Replace `src/pages/Feed.tsx` with real rendering**

```typescript
import { useFeed } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { useState } from "react";

export default function Feed() {
  const { state, reload } = useFeed(100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onRunIngest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.runIngestNow();
      setMsg(`Queued ${r.queued.join(", ")} — refresh in ~30s.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-3 border-b flex items-center gap-3">
        <h1 className="text-lg font-semibold">Feed</h1>
        <span className="text-xs text-muted-foreground">
          {state.kind === "ok" ? `${state.data.total} papers` : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="h-7 px-3 text-xs rounded border hover:bg-accent"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onRunIngest}
            disabled={busy}
            className="h-7 px-3 text-xs rounded bg-foreground text-background disabled:opacity-50"
          >
            {busy ? "Queuing…" : "Ingest now"}
          </button>
        </div>
      </header>

      {msg && <div className="px-6 py-2 text-xs bg-muted">{msg}</div>}

      <div className="flex-1 overflow-auto px-6 py-4">
        {state.kind === "loading" && <p className="text-sm text-muted-foreground">Loading feed…</p>}
        {state.kind === "error" && (
          <div className="rounded border border-destructive/50 p-4 text-sm">
            <p className="font-medium text-destructive">Failed to load feed</p>
            <p className="mt-1 text-muted-foreground">{state.message}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 h-7 px-3 text-xs rounded border hover:bg-accent"
            >
              Retry
            </button>
          </div>
        )}
        {state.kind === "ok" && state.data.papers.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-base font-semibold">No papers yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Click <em>Ingest now</em> to fetch arXiv + NBER. First run takes ~30s.
            </p>
          </div>
        )}
        {state.kind === "ok" && state.data.papers.length > 0 && (
          <ul className="space-y-2">
            {state.data.papers.map((p) => (
              <li key={p.id} className="rounded border p-3 hover:bg-accent/30">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{p.source}</span>
                  {p.published_at && (
                    <span className="text-[10px] text-muted-foreground">{p.published_at.slice(0, 10)}</span>
                  )}
                </div>
                <h3 className="text-sm font-medium leading-snug mt-1">{p.title}</h3>
                {p.authors.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.authors
                      .slice(0, 3)
                      .map((a) => a.name)
                      .join(", ")}
                    {p.authors.length > 3 && ` et al. (${p.authors.length})`}
                  </p>
                )}
                {p.abstract && (
                  <p className="text-xs mt-2 line-clamp-2 text-muted-foreground">{p.abstract}</p>
                )}
                <div className="mt-2 flex gap-2 text-[10px]">
                  {p.html_url && (
                    <a className="underline" href={p.html_url} target="_blank" rel="noreferrer">HTML</a>
                  )}
                  {p.pdf_url && (
                    <a className="underline" href={p.pdf_url} target="_blank" rel="noreferrer">PDF</a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **1.7.3: Wire backend health into `StatusBar.tsx`**

Edit the copied `src/components/layout/StatusBar.tsx`. Replace any mock-driven content with a tiny live health check:

```typescript
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function StatusBar() {
  const [state, setState] = useState<{ ok: boolean; version?: string; error?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      api.health()
        .then((h) => !cancelled && setState({ ok: true, version: h.version }))
        .catch((e) => !cancelled && setState({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  return (
    <div className="h-8 border-t px-4 flex items-center text-[11px] text-muted-foreground gap-3">
      <span className={state?.ok ? "text-emerald-500" : "text-red-500"}>●</span>
      <span>
        sidecar {state ? (state.ok ? `online · v${state.version}` : "offline") : "checking…"}
      </span>
    </div>
  );
}
```

(Keep the existing `export` shape so `AppShell.tsx` doesn't need edits.)

- [ ] **1.7.4: End-to-end manual test**

```bash
cd /Users/barca/Dev/paperpulse
source $HOME/.cargo/env
export PATH="$HOME/.local/bin:$PATH"
make sidecar &  # starts uvicorn on :8765 with reload
SIDE=$!
sleep 5
pnpm dev &      # starts vite on :1420
DEV=$!
sleep 5
echo
echo ">>> Open http://localhost:1420/feed in a browser."
echo ">>> 1) Verify StatusBar shows 'sidecar online · v0.1.0'"
echo ">>> 2) Click 'Ingest now' — wait ~30s — Refresh."
echo ">>> 3) Verify papers appear (expect ~200 from arxiv + ~20-30 from nber)."
echo
read -p "Press Enter when verified… " _
kill $DEV $SIDE 2>/dev/null
wait 2>/dev/null
```
Expected: papers list renders with arXiv + NBER content; status bar green.

- [ ] **1.7.5: Run all tests one more time**

```bash
cd /Users/barca/Dev/paperpulse
make all
```
Expected: lint + typecheck + test all green.

- [ ] **1.7.6: Commit PR #1.7 — Phase 1 done**

```bash
cd /Users/barca/Dev/paperpulse
git add src/hooks/ src/pages/Feed.tsx src/components/layout/StatusBar.tsx
git commit -m "feat(ui): PR #1.7 Feed page renders real API + StatusBar health

- src/hooks/useFeed.ts owns loading/ok/error state
- Feed page renders papers with HTML/PDF links + 'Ingest now' button
- StatusBar polls /api/v1/hello every 30s, green/red indicator
- Closes Phase 1 — make all green; arxiv+nber → DuckDB → Feed verified

Refs: SPEC §12.2 (subset), §22, Appendix E, §18 PR #1.7"
```

---

## Phase 1 Acceptance (run before declaring done)

```bash
cd /Users/barca/Dev/paperpulse
source $HOME/.cargo/env
export PATH="$HOME/.local/bin:$PATH"
make all
```

Manual checklist (per spec §19.7):
- [ ] `make dev` starts shell window without errors (Tauri compile may be slow first time)
- [ ] StatusBar shows green / `sidecar online · v0.1.0` within 5s of start
- [ ] Clicking "Ingest now" returns 200 and queues both arxiv + nber
- [ ] After 30–60s, refreshing Feed shows ≥ 200 papers
- [ ] Clicking each SideNav item routes without 404
- [ ] Closing the Tauri window kills the Python sidecar (check `lsof -i:8765` empty)
- [ ] Editing `config/sources.yml` (e.g. set `arxiv.enabled: false`) is logged by the watcher
- [ ] No `error` lines in `pnpm tauri dev` output
- [ ] DuckDB file at `data/paperpulse.duckdb` is < 50 MB after one ingest

---

## Self-Review Notes (filled in by author)

**Spec coverage:**
- §4 tech stack: ✅ Tauri 2 + React 18 + TS + Tailwind 3 + FastAPI + DuckDB + LanceDB picked
- §5 architecture: ✅ Tauri spawns sidecar at `127.0.0.1:8765`
- §6 schema: ✅ subset (papers, institutions, authors, paper_authors, paper_institutions, ingest_runs, config_changes); FTS5 deferred (Q1)
- §7 config: ✅ all 9 YAML files seeded with defaults; watcher hot-reloads
- §8 ingest: ✅ Source ABC + RawPaper + arxiv + nber + dedup (DOI/arxiv_id/fuzzy)
- §14 API: ✅ /api/v1/hello, /api/v1/feed (subset), /api/v1/settings/ingest/run-now
- §16 errors: ✅ FastAPI exception handler + structlog
- §18 PR list: ✅ #0.1–#0.6 + #1.1–#1.7 (all 13 PRs)
- §19 testing: ✅ TDD steps for each unit; fixtures captured from real upstream
- §22 design migration: ✅ layout copied; mocks stripped; api.ts wired

**Out of scope (intentional, deferred):**
- Entity extraction (Phase 2) — paper.authors stays as raw author list with no institution links
- Filter pipeline (Phase 3) — papers.tier / level1_passed remain NULL
- Enrichment (Phase 5) — tldr / topics remain NULL
- Other 11 sources (Phase 4)
- Full Feed page with grouping/filters/shortcuts (Phase 6)
- Dashboard / Network / Conferences / Digest / Institutions / Authors / Settings tabs (Phase 6/7)
- Tauri .dmg bundle, code signing (Phase 8)

**Type consistency check:**
- `RawPaper` dataclass identical across base.py, dedup.py, arxiv.py, nber.py ✅
- `Paper` TS type fields are a strict subset of `papers` table columns ✅
- `FeedResponse` shape matches Pydantic model in `feed.py` ✅
- `health` API returns `{status, version}` matching frontend type ✅

**Placeholder scan:** none.
