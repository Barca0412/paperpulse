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

CREATE SEQUENCE IF NOT EXISTS seq_ingest_runs START 1;
CREATE TABLE IF NOT EXISTS ingest_runs (
    id                       INTEGER PRIMARY KEY DEFAULT nextval('seq_ingest_runs'),
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

CREATE SEQUENCE IF NOT EXISTS seq_config_changes START 1;
CREATE TABLE IF NOT EXISTS config_changes (
    id          INTEGER PRIMARY KEY DEFAULT nextval('seq_config_changes'),
    config_file TEXT,
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diff        TEXT
);

-- Added Phase 2 PR #2.6: papers that failed OpenAlex+ar5iv affiliation
-- lookup are queued here for retry (spec §9.2 fallback).
CREATE TABLE IF NOT EXISTS affiliation_retry_queue (
    paper_id        TEXT PRIMARY KEY,
    next_attempt_at TIMESTAMP NOT NULL,
    attempts        INTEGER DEFAULT 0
);
