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
