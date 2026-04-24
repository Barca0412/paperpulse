# PaperPulse · Product & Engineering Specification v1.1

> **Owner**: JX (Rigi)
> **Status**: Frozen for Claude Code implementation
> **Target**: v1.0 桌面应用 (macOS 优先, Linux 次要, 不兼容 Windows)
> **Timeline**: 6 周 v1
> **Scope**: 面向 AI × Finance 研究者的本地论文雷达与分析工具
> **Supersedes**: v1.0
> **Companion Documents**:
> - `docs/seed_set.md` — 种子论文集 (embedding 锚点)
> - `design-reference/` — Claude Design 产出的前端原型 (UI source of truth)

---

## Changelog from v1.0

| # | 变更 | 章节 |
|---|---|---|
| 1 | 不再兼容 Windows，只保留 macOS (主) + Linux (次) | 4, 20 |
| 2 | SSRN 降级为占位，新增 7 个欧美央行/机构 working paper 源 | 8 |
| 3 | 金融顶刊 12 本全部走 Crossref + 出版商 RSS | 8 |
| 4 | affiliation 获取：OpenAlex 主路径 + ar5iv HTML fallback | 9 |
| 5 | Tier B 改为加权分数模型 | 10, 7.8 |
| 6 | 种子集加入半衰期机制 | 7.4, 11 |
| 7 | 删除 LLM 深度问答功能 | - |
| 8 | 删除全局作者/机构网络图，改为 ego network | 12.5 |
| 9 | Map 降级为 Dashboard widget (甚至可选删除) | 12 |
| 10 | Feed 新增分面浏览 (Faceted Browsing) 为核心功能 | 12.2 |
| 11 | Explore 和 Feed 融合为一体化时间窗口 | 12.2, 12.3 |
| 12 | 新增会议 Deadline 追踪，三重数据源 | 12.7, 8 |
| 13 | 新增 FTS5 全文搜索 + Command Palette | 12.11 |
| 14 | 新增 Zotero 集成 (Obsidian 移除) | 3, 13, 18 |
| 15 | 新增 Budget Cap (论文数形式) 避免 LLM 超支 | 11.5 |
| 16 | **新增 Section 22: Frontend Integration with Design Reference** | 22 |
| 17 | **新增 Appendix E: Mock → Real Data Migration Guide** | App E |
| 18 | 开发节奏和测试策略大幅扩写 | 18, 19 |

---

## 目录

**Part I: 产品定义**
1. [产品定位与核心价值](#1-产品定位与核心价值)
2. [用户画像与使用场景](#2-用户画像与使用场景)
3. [功能总览](#3-功能总览)

**Part II: 技术决策**
4. [技术栈决策](#4-技术栈决策)
5. [系统架构](#5-系统架构)

**Part III: 数据层**
6. [数据模型 (Schema)](#6-数据模型-schema)
7. [配置文件系统](#7-配置文件系统)

**Part IV: Pipeline**
8. [Ingestion 模块](#8-ingestion-模块)
9. [Entity Extraction 模块](#9-entity-extraction-模块)
10. [Filtering Pipeline (三级粗筛)](#10-filtering-pipeline-三级粗筛)
11. [Enrichment 模块](#11-enrichment-模块)

**Part V: 前端**
12. [前端页面规范](#12-前端页面规范)
13. [Settings 页面详规](#13-settings-页面详规)

**Part VI: 集成**
14. [API 契约](#14-api-契约)
15. [调度与后台任务](#15-调度与后台任务)
16. [错误处理与降级](#16-错误处理与降级)
17. [性能与资源预算](#17-性能与资源预算)

**Part VII: 开发与交付**
18. [开发里程碑](#18-开发里程碑)
19. [测试策略](#19-测试策略)
20. [部署与分发](#20-部署与分发)
21. [未来扩展 (v2+)](#21-未来扩展)
22. [**Frontend Integration with Design Reference**](#22-frontend-integration-with-design-reference)

**附录**
- [Appendix A: Claude Code 开发手册](#appendix-a)
- [Appendix B: 数据源 URL 参考](#appendix-b)
- [Appendix C: 核心数据字段样本](#appendix-c)
- [Appendix D: 金标准测试集说明](#appendix-d)
- [**Appendix E: Mock → Real Data Migration Guide**](#appendix-e)

---

# Part I: 产品定义

## 1. 产品定位与核心价值

### 1.1 一句话定义

PaperPulse 是一个在 macOS 上本地运行的桌面应用，自动追踪、过滤、分析 AI × Finance 领域每日新发表的论文，将每日 500–1000 篇候选压缩为 80–120 篇高质量推送，并提供主题/机构/作者/时间维度的多维分面浏览与分析。

### 1.2 三大核心价值

1. **不漏**：工作日每日自动抓取 arXiv + 9 个 working paper 源 + 12 本金融顶刊 + OpenReview + ACL Anthology，未来全量
2. **不噪**：三级漏斗粗筛 (规则 → 语义 → 机构白名单) + Tier 加权评分，保证每日推送信噪比高
3. **有结构**：分面浏览 (按主题/机构/Tier/源折叠) + 主题深挖 + 时间序列分析，让信息有结构可深入

### 1.3 差异化

| 工具 | 覆盖面 | 分层筛选 | 分面浏览 | 本地分析 | AI × Finance 特化 |
|---|---|---|---|---|---|
| arxiv-sanity | 仅 arXiv | ❌ | ❌ | ❌ | ❌ |
| Scholar Inbox | arXiv 为主 | 黑盒 | ❌ | ❌ | ❌ |
| Zotero + RSS | 看你配 | ❌ | ❌ | 弱 | ❌ |
| **PaperPulse** | **✅ 全源** | **✅ 可配** | **✅ 核心** | **✅ DuckDB** | **✅ 种子集** |

### 1.4 非目标 (Non-Goals)

- ❌ 不兼容 Windows (只 macOS + Linux)
- ❌ 不做 SSRN 全量抓取 (反爬太强，留接口占位)
- ❌ 不做 PDF 全文编辑/标注 (交给专用 PDF viewer)
- ❌ 不做跨设备同步 (v1 纯本地)
- ❌ 不做协作/多用户
- ❌ 不做 LLM 深度问答 (聚焦"找到论文 + 分类浏览"核心)
- ❌ 不做推荐算法黑盒 (所有筛选规则可见可编辑)
- ❌ 不做中英全文翻译 (只做 TL;DR 双语)

---

## 2. 用户画像与使用场景

### 2.1 主用户画像

- **身份**: AI × Finance 方向研究者 / PhD / 工业界研究员
- **特征**: 跨 CS 和金融两个社区，每日需追踪 500+ 篇新论文元数据
- **技术水平**: 熟悉命令行，能看 YAML/JSON 配置
- **设备**: macOS M 系芯片为主

### 2.2 核心使用场景

#### 场景 A: 每日晨读 (5–15 分钟) ⭐ 最高频

早上打开应用 → Feed 页面默认显示今日论文，按主题分组 → 折叠不感兴趣的主题 (如 "Other 3 篇") → 对感兴趣的主题展开，用 `j`/`k`/`s`/`x` 快速操作。

#### 场景 B: 主题深挖 (30–60 分钟) ⭐ 高价值

想系统看 "LLM for Asset Pricing" → Feed 里点该主题 header → 进入主题深挖页 → 看趋势折线 + Top 机构 + Top 作者 + 本周/本月/全部历史论文。

#### 场景 C: 机构/作者追踪 (5 分钟)

切换 Feed 的 "Group by" 为 Institution → "今天 Bloomberg/JPM/Ant 各发了什么" 一目了然。

#### 场景 D: 会议 deadline 管理 (每周)

Conferences 页面查看未来 30 天的 deadline → 对有争议的 deadline 弹窗让用户确认。

#### 场景 E: 周报生成 (周一早上, 10 分钟)

Weekly Digest 页面查看自动生成的中文周报 → 一键导出到 LinkedIn/小红书/WAVE 社群。

### 2.3 关键指标

- **找回率**: 事后发现的 "应该读但漏了" < 5%
- **准确率**: Feed 中用户标 "Ignored" < 30%
- **使用频率**: 工作日使用率 > 80%
- **周报可用率**: 无需大改即可发布 > 60%

---

## 3. 功能总览

### 3.1 Must Have (v1 必做)

- [M1] 多源自动抓取 (arXiv + 9 个 working paper 源 + 12 本金融顶刊 + OpenReview + ACL Anthology)
- [M2] 三级漏斗粗筛 (Level 1 关键词 → Level 2 语义 → Level 3 Tier 加权评分)
- [M3] Entity extraction (OpenAlex 主路径 + ar5iv HTML fallback)
- [M4] Enrichment (双语 TL;DR, 主题分类, Tier 判定, relevance score)
- [M5] **Feed 页面分面浏览** (按主题/机构/Tier/源切换 Group by + 时间窗口 + 快捷键三键操作)
- [M6] **主题深挖页** (每个主题独立视图：趋势折线 + Top 机构/作者 + 历史论文分时间切片)
- [M7] **Explore 页面** (Table/Timeline 视图 + 高级查询)
- [M8] **Dashboard** (时间序列折线为主 + 机构/作者/主题榜单 + Tier/源分布)
- [M9] **Ego Network** (以某作者/机构为中心的 2 跳合作网络)
- [M10] **Conferences** (会议 deadline 追踪，三重数据源 + 弹窗人工验证)
- [M11] **Settings** (14 个 Tab，全部配置可视化编辑 + 写回 YAML)
- [M12] **Weekly Digest** (Sonnet 生成中文周报)
- [M13] **FTS5 全文搜索 + Command Palette (Cmd+K)**
- [M14] **Zotero 集成** (标 must_read 同步到 Zotero collection)
- [M15] 数据导出 (BibTeX / Markdown / CSV)
- [M16] 每日定时任务 (本地 cron/scheduler)
- [M17] 数据库备份/恢复

### 3.2 v1 明确不做 (v2 考虑)

- Windows 兼容
- 跨设备同步
- Obsidian 集成
- 共引网络 (Semantic Scholar)
- Twitter/X 信号
- 邮件/Telegram digest
- 协作/多人
- 全局网络图
- LLM 深度问答
- Labs/Groups 自动发现

---

# Part II: 技术决策

## 4. 技术栈决策

### 4.1 技术栈总表

| 层 | 选型 | 原因 |
|---|---|---|
| 桌面壳 | **Tauri 2.0** | 比 Electron 小 10 倍，macOS 原生感好 |
| 前端框架 | **React 18 + TypeScript 5** | Design reference 也用这个栈 |
| UI 库 | **shadcn/ui + Tailwind CSS 3** | 注意是 3 不是 4 (兼容 shadcn) |
| 路由 | **react-router-dom v6** | |
| 状态管理 | **zustand** | 轻量 |
| 图表 | **recharts + D3 (局部)** | |
| 网络图 | **react-force-graph-2d** | ego network 用 |
| Icons | **lucide-react** | |
| 日期 | **date-fns** | |
| 后端语言 | **Python 3.11+** | 论文生态全是 Python |
| Python 框架 | **FastAPI + uvicorn** | Tauri sidecar |
| 数据库 | **DuckDB** | 列存，分析查询快 |
| 向量库 | **LanceDB** | 嵌入式 |
| 全文搜索 | **SQLite FTS5** | 嵌入式 |
| Embedding | **bge-m3 (ONNX 本地)** | 支持中英 |
| LLM 轻量 | **Claude Haiku 4.5** | 分类/TL;DR |
| LLM 重量 | **Claude Sonnet 4.6** | 周报 |
| 调度 | **APScheduler** | |
| Config watcher | **watchdog** | |
| HTML 解析 | **BeautifulSoup4 + lxml** | ar5iv 解析 |
| 机构规范化 | **ROR dump (本地) + rapidfuzz** | |
| 打包 | **Tauri bundler** | .dmg / .AppImage |

### 4.2 目录结构 (顶层)

```
paperpulse/
├── CLAUDE.md                     # 给 Claude Code 的项目级指令
├── README.md
├── Makefile                      # make test / lint / e2e / dev
├── docs/
│   ├── SPEC.md                   # 本文件
│   ├── seed_set.md
│   └── design-brief.md
│
├── design-reference/             # Claude Design 产出 (只读参考)
│   ├── README.md
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── mocks/                # ← 这些 mock 数据 Claude Code 不能直接用
│   │   └── ...
│   └── package.json
│
├── src-tauri/                    # Rust 壳
│   ├── src/main.rs
│   └── tauri.conf.json
│
├── src/                          # React 实现
│   ├── components/               # 从 design-reference 迁移 + 适配真实 API
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts                # Backend API client
│   │   └── types.ts              # 与 backend 对齐的 types
│   ├── stores/
│   └── App.tsx
│
├── backend/                      # Python sidecar
│   ├── paperpulse/
│   │   ├── main.py               # FastAPI entry
│   │   ├── config.py
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── duckdb_client.py
│   │   │   └── lance_client.py
│   │   ├── ingest/
│   │   │   ├── base.py
│   │   │   ├── arxiv.py
│   │   │   ├── nber.py
│   │   │   ├── cepr.py
│   │   │   ├── fed.py
│   │   │   ├── ecb.py
│   │   │   ├── boe.py
│   │   │   ├── bis.py
│   │   │   ├── imf.py
│   │   │   ├── riksbank.py
│   │   │   ├── oenb.py
│   │   │   ├── openreview.py
│   │   │   ├── acl.py
│   │   │   ├── crossref.py       # 金融顶刊
│   │   │   └── ssrn.py           # 占位
│   │   ├── entity/
│   │   │   ├── author.py
│   │   │   ├── institution.py
│   │   │   ├── ror.py
│   │   │   ├── openalex.py
│   │   │   ├── ar5iv.py          # HTML fallback parser
│   │   │   └── pi_infer.py
│   │   ├── filter/
│   │   │   ├── level1_rules.py
│   │   │   ├── level2_semantic.py
│   │   │   └── level3_tier.py    # 加权评分
│   │   ├── enrich/
│   │   │   ├── embedding.py
│   │   │   ├── tldr.py
│   │   │   ├── topic.py
│   │   │   └── weekly.py
│   │   ├── conferences/
│   │   │   ├── aideadlin.py
│   │   │   ├── yaml_source.py
│   │   │   └── verify.py
│   │   ├── integrations/
│   │   │   └── zotero.py
│   │   ├── scheduler.py
│   │   └── api/
│   │       ├── feed.py
│   │       ├── explore.py
│   │       ├── dashboard.py
│   │       ├── network.py
│   │       ├── conferences.py
│   │       ├── institutions.py
│   │       ├── authors.py
│   │       ├── digest.py
│   │       ├── search.py
│   │       └── settings.py
│   ├── pyproject.toml
│   └── tests/
│       ├── fixtures/
│       ├── unit/
│       ├── integration/
│       └── conftest.py
│
├── config/                       # 用户可编辑 YAML (symlink to user AppData 目录 at runtime)
│   ├── sources.yml
│   ├── keywords.yml
│   ├── seeds.yml
│   ├── topics.yml
│   ├── institutions.yml
│   ├── authors.yml
│   ├── tiers.yml
│   ├── conferences.yml
│   └── app.yml
│
├── resources/                    # 打包静态资源
│   ├── ror_dump.json.gz
│   └── default_configs/          # 初始配置模板
│
└── data/                         # 用户数据 (symlink to user AppData at runtime)
    ├── paperpulse.duckdb
    ├── papers.lance/
    └── pdfs/                     # v1 暂不用
```

---

## 5. 系统架构

### 5.1 总体架构

```
┌───────────────────────────────────────────────────┐
│          Tauri Shell (Rust, macOS)                 │
│  - System tray, notifications                      │
│  - Launches Python sidecar                         │
└─────────┬─────────────────────────────────────────┘
          │
   ┌──────┴──────┐
   │             │
┌──▼───┐    ┌───▼─────────────────────┐
│React │◄──►│ Python FastAPI          │
│ SPA  │    │ localhost:8765          │
│      │    │                          │
└──────┘    │ ┌─ Scheduler ──┐         │
            │ │ daily 07:30  │         │
            │ └──┬───────────┘         │
            │    │                     │
            │ ┌──▼─ Ingest ────────┐  │
            │ │ 13 sources          │  │
            │ └──┬─────────────────┘  │
            │    │                     │
            │ ┌──▼─ Entity Extract ─┐ │
            │ │ OpenAlex + ar5iv    │ │
            │ └──┬─────────────────┘  │
            │    │                     │
            │ ┌──▼─ Filter (3 levels)┐│
            │ └──┬─────────────────┘  │
            │    │                     │
            │ ┌──▼─ Enrich ─────────┐ │
            │ │ Embed/TLDR/Topic    │ │
            │ └──┬─────────────────┘  │
            │    │                     │
            │ ┌──▼─ Storage ────────┐ │
            │ │ DuckDB+Lance+FTS5   │ │
            │ └─────────────────────┘ │
            └─────────┬───────────────┘
                      │
               ┌──────▼──────────┐
               │ External APIs    │
               │ - arXiv OAI      │
               │ - OpenAlex       │
               │ - ar5iv          │
               │ - Crossref       │
               │ - OpenReview     │
               │ - 9 央行/NBER    │
               │ - Anthropic      │
               │ - Zotero API     │
               └──────────────────┘
```

### 5.2 数据流

```
[External] → [Ingest] → raw_papers
   ↓
[Dedup + Primary Entity] (arXiv/Crossref 原始字段)
   ↓
[Affiliation Enrichment]
   ├─ 主路径: OpenAlex (by DOI/arxiv_id)
   ├─ Fallback 1: ar5iv HTML parsing
   └─ Fallback 2: 48h 后重试 OpenAlex (异步队列)
   ↓
[Level 1: Keyword Filter]
   ↓
[Level 2: Semantic Filter] ← seeds/topics embeddings
   ↓
[Level 3: Tier Weighted Score]
   ↓
[Enrich: Embed + TLDR + Topic Classification]
   ↓
[DuckDB + LanceDB + FTS5]
   ↓
[API] → [Frontend]
```

---

# Part III: 数据层

## 6. 数据模型 (Schema)

### 6.1 `papers` 主表

```sql
CREATE TABLE papers (
    -- Identifiers
    id                    TEXT PRIMARY KEY,  -- sha1(normalized_title + first_author + year)
    source                TEXT NOT NULL,     -- 'arxiv'|'nber'|'cepr'|'fed'|'ecb'|'boe'|'bis'|'imf'|'riksbank'|'oenb'|'openreview'|'acl'|'crossref'|'manual'
    source_id             TEXT NOT NULL,
    doi                   TEXT,
    arxiv_id              TEXT,
    openreview_id         TEXT,

    -- Core metadata
    title                 TEXT NOT NULL,
    title_normalized      TEXT,              -- 小写去标点, fuzzy dedup 用
    abstract              TEXT,
    authors               JSON,              -- [{name, order, author_id, affiliation_ids, is_corresponding, is_first, is_last}]
    venue                 TEXT,
    venue_normalized      TEXT,              -- 'NeurIPS 2025'
    published_at          DATE,
    updated_at            DATE,              -- arXiv version update
    ingested_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pdf_url               TEXT,
    html_url              TEXT,              -- ar5iv URL if available

    -- Affiliation source tracking
    affiliation_source    TEXT,              -- 'openalex'|'ar5iv'|'arxiv_native'|'crossref'|'manual'|'unverified'
    affiliation_fetched_at TIMESTAMP,

    -- Filter pipeline tracing (for debugging/tuning)
    level1_passed         BOOLEAN DEFAULT false,
    level1_reasons        JSON,              -- ["kw+:llm", "kw+:portfolio"]
    level2_score          FLOAT,             -- max similarity to seeds/topics
    level2_matched_seed   TEXT,
    level3_tier_b_score   FLOAT,             -- weighted score for B/C boundary
    level3_reasons        JSON,              -- ["inst:bloomberg", "citation_velocity:8"]

    -- Enrichment outputs
    topics_cs             JSON,              -- ["agents", "rl"]
    topics_finance        JSON,
    topics_crosscut       JSON,
    primary_topic         TEXT,              -- 最高 relevance 的 topic, Feed 的 Group by 用
    tier                  TEXT,              -- 'A'|'B'|'C'
    relevance_score       INTEGER,           -- 0-10
    tldr_en               TEXT,
    tldr_zh               TEXT,
    embedding_id          TEXT,              -- LanceDB row pointer

    -- External signals (refreshed periodically)
    citation_count        INTEGER,
    citation_velocity     FLOAT,
    pwc_has_code          BOOLEAN,
    hf_daily_papers       BOOLEAN,
    last_signal_update    TIMESTAMP,

    -- User state (NEVER overwritten by pipeline re-runs)
    user_status           TEXT DEFAULT 'unread',  -- 'unread'|'read'|'saved'|'must_read'|'ignored'
    user_rating           INTEGER,                -- 1-5
    user_notes            TEXT,                   -- markdown
    user_tags             JSON,
    read_at               TIMESTAMP,
    saved_at              TIMESTAMP,

    -- Zotero sync (v1)
    zotero_item_key       TEXT,
    zotero_synced_at      TIMESTAMP
);

CREATE INDEX idx_papers_published ON papers(published_at DESC);
CREATE INDEX idx_papers_tier ON papers(tier);
CREATE INDEX idx_papers_status ON papers(user_status);
CREATE INDEX idx_papers_source ON papers(source);
CREATE INDEX idx_papers_primary_topic ON papers(primary_topic);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE papers_fts USING fts5(
    title, abstract, authors_flat,
    content='papers', content_rowid='rowid'
);
```

### 6.2 `institutions` 表

```sql
CREATE TABLE institutions (
    id                    TEXT PRIMARY KEY,          -- ROR ID 或 'manual:<uuid>'
    ror_id                TEXT,
    openalex_id           TEXT,
    name                  TEXT NOT NULL,
    aliases               JSON,
    country               TEXT,
    country_code          TEXT,                      -- ISO 2-letter
    city                  TEXT,
    lat                   FLOAT,
    lng                   FLOAT,
    type                  TEXT,                      -- 'university'|'big_tech'|'bank'|'hedge_fund'|'central_bank'|'gov'|'nonprofit'
    parent_id             TEXT,
    department            TEXT,
    homepage              TEXT,
    in_whitelist          BOOLEAN DEFAULT false,
    whitelist_tags        JSON,                      -- ['cs','finance','industry']
    whitelist_priority    TEXT,                      -- 'high'|'normal'|null
    added_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inst_ror ON institutions(ror_id);
CREATE INDEX idx_inst_country ON institutions(country_code);
CREATE INDEX idx_inst_whitelist ON institutions(in_whitelist);
```

### 6.3 `authors` 表

```sql
CREATE TABLE authors (
    id                      TEXT PRIMARY KEY,         -- OpenAlex ID 或 'manual:<uuid>'
    openalex_id             TEXT,
    orcid                   TEXT,
    name                    TEXT NOT NULL,
    name_variants           JSON,
    current_institutions    JSON,                     -- [institution_id]
    historical_institutions JSON,
    h_index                 INTEGER,
    paper_count             INTEGER,
    citation_count          INTEGER,
    is_pi_likely            BOOLEAN,
    is_tracked              BOOLEAN DEFAULT false,
    tracked_notes           TEXT,
    homepage                TEXT,
    google_scholar_id       TEXT,
    added_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.4 关系表

```sql
CREATE TABLE paper_authors (
    paper_id              TEXT,
    author_id             TEXT,
    author_order          INTEGER,
    is_first              BOOLEAN,
    is_last               BOOLEAN,
    is_corresponding      BOOLEAN,
    affiliation_ids       JSON,
    PRIMARY KEY (paper_id, author_id)
);

CREATE TABLE paper_institutions (
    paper_id              TEXT,
    institution_id        TEXT,
    author_count          INTEGER,
    has_first_author      BOOLEAN,
    has_last_author       BOOLEAN,
    PRIMARY KEY (paper_id, institution_id)
);
```

### 6.5 `seeds` 种子集（含半衰期）

```sql
CREATE TABLE seeds (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    type                  TEXT,        -- 'paper'|'topic_description'|'user_must_read'
    source_paper_id       TEXT,
    content               TEXT,
    embedding_id          TEXT,
    base_weight           FLOAT DEFAULT 1.0,
    topic_tags            JSON,
    added_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active             BOOLEAN DEFAULT true,
    half_life_days        INTEGER     -- NULL = 不衰减 (初始种子), 默认 180 (user_must_read)
);

-- 有效权重 = base_weight * exp(-ln(2) * age_days / half_life_days)
-- 初始种子 half_life_days = NULL → 权重恒定
-- user_must_read 种子 half_life_days = 180 → 6 个月半衰期
```

### 6.6 `conferences` 表

```sql
CREATE TABLE conferences (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    short_name            TEXT,                      -- 'NeurIPS'
    year                  INTEGER,
    full_name             TEXT,                      -- 'NeurIPS 2026'
    location              TEXT,
    event_start_date      DATE,
    event_end_date        DATE,
    homepage              TEXT,
    tags                  JSON,                      -- ['ml','agents','ai']
    venue_tier            TEXT                       -- 'A'|'B'|'C'
);

CREATE TABLE conference_deadlines (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    conference_id         TEXT,
    deadline_type         TEXT,                      -- 'abstract'|'paper'|'response'|'decision'|'camera_ready'
    deadline_date         DATE,
    deadline_timezone     TEXT,
    verification_status   TEXT,                      -- 'verified'|'needs_review'|'single_source'|'manual'
    sources               JSON,                      -- [{name: 'aideadlin.es', value: '2026-05-15'}, ...]
    user_confirmed        BOOLEAN DEFAULT false,
    notes                 TEXT
);
```

### 6.7 其他表

```sql
CREATE TABLE ingest_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    status TEXT,              -- 'success'|'partial'|'failed'
    papers_fetched INTEGER,
    papers_new INTEGER,
    papers_level1_passed INTEGER,
    papers_level2_passed INTEGER,
    papers_level3_tier_a INTEGER,
    papers_level3_tier_b INTEGER,
    papers_level3_tier_c INTEGER,
    error_message TEXT,
    details JSON
);

CREATE TABLE config_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_file TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diff TEXT
);

CREATE TABLE weekly_digests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start_date DATE,
    week_end_date DATE,
    generated_at TIMESTAMP,
    language TEXT,             -- 'zh'|'en'
    content_markdown TEXT,
    paper_ids JSON,
    model_used TEXT
);
```

### 6.8 LanceDB 向量表

```python
paper_embeddings = {
    "id": str,
    "paper_id": str,
    "vector": Vector(1024),     # bge-m3
    "text_hash": str,
    "model": str,
    "created_at": datetime,
}

seed_embeddings = {
    "id": str,
    "seed_id": int,
    "vector": Vector(1024),
    "model": str,
}

topic_embeddings = {
    "id": str,
    "topic_name": str,
    "vector": Vector(1024),
    "model": str,
}
```

---

## 7. 配置文件系统

所有 YAML 在 macOS 下放 `~/Library/Application Support/PaperPulse/config/`。

### 7.1 `sources.yml`

```yaml
sources:
  # === Primary sources ===
  arxiv:
    enabled: true
    categories: [cs.LG, cs.CL, cs.AI, cs.MA, q-fin.CP, q-fin.GN, q-fin.MF, q-fin.PM, q-fin.PR, q-fin.RM, q-fin.ST, q-fin.TR, econ.EM]
    fetch_window_days: 3
    max_results_per_run: 2000
    use_ar5iv_fallback: true

  # === Working paper sources (all 9) ===
  nber:
    enabled: true
    rss_url: "https://www.nber.org/rss/new.xml"

  cepr:
    enabled: true
    # CEPR Discussion Papers; requires scraping
    base_url: "https://cepr.org/publications/discussion-papers"
    fetch_mode: "scrape_list"

  fed_feds:
    enabled: true
    # Federal Reserve Board FEDS series
    base_url: "https://www.federalreserve.gov/econres/feds/"

  ecb_wps:
    enabled: true
    rss_url: "https://www.ecb.europa.eu/rss/wps.html"

  boe_swp:
    enabled: true
    # Bank of England Staff Working Papers
    base_url: "https://www.bankofengland.co.uk/working-paper"

  bis_wp:
    enabled: true
    rss_url: "https://www.bis.org/doclist/wppubls.rss"

  imf_wp:
    enabled: true
    # IMF Working Papers
    base_url: "https://www.imf.org/en/Publications/WP"

  riksbank:
    enabled: true
    base_url: "https://www.riksbank.se/en-gb/press-and-published/publications/working-paper-series/"

  oenb:
    enabled: true
    # Austrian National Bank
    base_url: "https://www.oenb.at/en/Publications/Economics/Working-Papers.html"

  # === Conference proceedings ===
  openreview:
    enabled: true
    venues:
      - "ICLR.cc/2026/Conference"
      - "NeurIPS.cc/2026/Conference"
      - "ICML.cc/2026/Conference"
    fetch_mode: "submissions"

  acl_anthology:
    enabled: true
    update_frequency: "weekly"

  # === Top finance journals via Crossref + publisher RSS (12 journals) ===
  crossref_journals:
    enabled: true
    journals:
      # Top 8 finance journals
      - {name: "Journal of Finance", issn: "0022-1082"}
      - {name: "Journal of Financial Economics", issn: "0304-405X"}
      - {name: "Review of Financial Studies", issn: "0893-9454"}
      - {name: "Journal of Financial and Quantitative Analysis", issn: "0022-1090"}
      - {name: "Management Science", issn: "0025-1909"}
      - {name: "Review of Finance", issn: "1572-3097"}
      - {name: "Journal of Financial Markets", issn: "1386-4181"}
      - {name: "Journal of Banking and Finance", issn: "0378-4266"}
      # AI × Finance 4
      - {name: "ACM ICAIF proceedings", issn: null}  # via ACM DL
      - {name: "Quantitative Finance", issn: "1469-7688"}
      - {name: "Journal of Financial Data Science", issn: "2640-3943"}
      - {name: "Journal of Portfolio Management", issn: "0095-4918"}
      - {name: "Algorithmic Finance", issn: "2158-5571"}

  # === Placeholder for SSRN (disabled) ===
  ssrn:
    enabled: false
    # SSRN RSS is deprecated/unreliable. Future: add DOI-based lookup via Crossref.
    placeholder_note: "SSRN ingestion removed in v1.1 due to RSS limitations. Enable only if future workaround found."

global:
  user_agent: "PaperPulse/1.0 (research tool; user: <user_email>)"
  polite_delay_ms: 1000
  retry_max: 3
  retry_backoff: "exponential"
  timeout_seconds: 30
```

### 7.2 `keywords.yml`

```yaml
positive:
  cs_core:
    - "large language model"
    - "LLM"
    - "LLM agent"
    - "reinforcement learning"
    - "RLHF"
    - "multi-agent"
    - "foundation model"
    - "benchmark"
    - "transformer"
    - "in-context learning"
    # ... (更多见实际配置)
  finance_core:
    - "asset pricing"
    - "factor model"
    - "market microstructure"
    - "behavioral finance"
    - "trading strategy"
    - "portfolio"
    - "limit order book"
    - "volatility"
    # ...
  crosscut:
    - "FinBERT"
    - "BloombergGPT"
    - "FinGPT"
    - "financial LLM"
    - "deep hedging"
    - "alt data"
    # ...

strong_negative:
  - "image classification"
  - "object detection"
  - "medical imaging"
  - "autonomous driving"
  - "speech recognition"
  - "protein folding"
  - "molecular dynamics"

weak_negative:
  - "legal text classification"
  - "recommender system"
  - "educational AI"

immune:  # 如果同时命中 immune 词，negative 失效
  - "finance"
  - "trading"
  - "market"
  - "investment"
  - "portfolio"
  - "asset"
```

### 7.3 `seeds.yml`

```yaml
# 约 150 条初始种子，从 seed_set.md 迁移
seed_papers:
  - arxiv_id: "2210.03629"
    title: "ReAct: Synergizing Reasoning and Acting in Language Models"
    base_weight: 1.0
    tags: [agents, reasoning]
    half_life_days: null  # 初始种子不衰减
  # ... (见 docs/seed_set.md)

user_must_read_papers: []  # 动态追加，每条带 half_life_days: 180

seed_meta:
  last_embedded_at: null
  embedding_model: "bge-m3"
  total_active: 0
```

### 7.4 `topics.yml`

```yaml
topics:
  - name: "LLM Agents for Finance"
    slug: "llm-agents-finance"
    side: "crosscut"     # cs | finance | crosscut
    description_en: |
      Large language model agents applied to financial tasks including trading decisions,
      portfolio management, investment research automation, financial report generation,
      and analyst workflow support.
    description_zh: "LLM 金融 agent, 涵盖交易决策、组合管理、研究自动化..."
    weight: 1.5
    color: "#8b5cf6"
  # ... 10 个主题 (见 seed_set.md Part 2)
```

### 7.5 `institutions.yml`

见 seed_set.md Part 4，结构：

```yaml
whitelist:
  academic_cs: [...]
  academic_finance: [...]
  industry_ai: [...]
  industry_finance: [...]
  government_regulator: [...]

blacklist: []
```

### 7.6 `authors.yml`

```yaml
tracked_authors:
  - name: "Bryan Kelly"
    openalex_id: "A5067...."
    institutions: ["Yale SOM", "AQR"]
    topics: [asset_pricing, ml_finance]
    notify_on_new_paper: true
  # ... (见 seed_set.md Part 5)
```

### 7.7 `tiers.yml`

```yaml
tier_rules:
  A:
    venues:
      - "NeurIPS"
      - "ICML"
      - "ICLR"
      - "KDD"
      - "AAAI"
      - "IJCAI"
      - "WWW"
      - "TheWebConf"
      - "AAMAS"
      - "EMNLP"
      - "ACL"
      - "CIKM"
      - "SIGIR"
      - "COLM"
      - "Journal of Finance"
      - "Journal of Financial Economics"
      - "Review of Financial Studies"
      - "JFQA"
      - "Management Science"
      - "Review of Finance"
      - "Journal of Financial Markets"
      - "Journal of Banking and Finance"
      - "AFA Annual Meeting"
      - "WFA Annual Meeting"
      - "EFA Annual Meeting"
      - "ACM ICAIF"
      - "Journal of Financial Data Science"
      - "Quantitative Finance"
      - "Journal of Portfolio Management"
      - "Algorithmic Finance"
    auto_include: true

  B_score:
    # tier_b_score = sum(weight * component), threshold 决定 B/C 分界
    weights:
      level2_similarity: 0.30
      institution_whitelist: 0.20   # priority=high 权重 full, normal 权重 0.5
      citation_velocity: 0.15       # normalized to 0-1
      pwc_has_code: 0.10
      hf_daily_papers: 0.10
      tracked_author: 0.15
    threshold: 0.50

  C:
    description: "匹配关键词但不满足 A/B 条件"
    default_collapsed_in_feed: true
```

### 7.8 `conferences.yml`

```yaml
# 手动维护的会议信息（尤其金融会议，aideadlin.es 覆盖不全）
conferences:
  - short_name: "AFA"
    year: 2027
    full_name: "AFA Annual Meeting 2027"
    location: "Chicago, IL"
    event_start: "2027-01-04"
    event_end: "2027-01-06"
    deadlines:
      - {type: paper, date: "2026-04-15", note: "PhD submission deadline"}
    homepage: "https://www.afajof.org/"
    tags: [finance]
    venue_tier: "A"

  - short_name: "WFA"
    year: 2026
    # ...

  - short_name: "NeurIPS"
    year: 2026
    full_name: "NeurIPS 2026"
    location: "San Diego, CA"
    event_start: "2026-12-08"
    event_end: "2026-12-13"
    deadlines:
      - {type: abstract, date: "2026-05-15"}
      - {type: paper, date: "2026-05-22"}
      - {type: response, date: "2026-07-30"}
      - {type: decision, date: "2026-09-15"}
    sources_for_deadline: ["aideadlin.es", "neurips.cc/2026"]
    homepage: "https://neurips.cc/2026"
    tags: [ml, ai, agents]
    venue_tier: "A"

  # ... 其他顶会
```

### 7.9 `app.yml`

```yaml
schedule:
  daily_ingest_time: "07:30"
  weekly_digest_time: "Mon 08:00"
  signal_refresh_time: "02:00"
  timezone: "Asia/Singapore"

filters:
  level1:
    enabled: true
    require_positive_match: true
    min_positive_hits: 1
  level2:
    enabled: true
    similarity_threshold: 0.30   # 默认偏松
    top_k_seeds_match: 3
    model: "bge-m3"
  level3:
    enabled: true

enrichment:
  embedding:
    provider: "local"             # 'local' | 'openai'
    model: "bge-m3"
    batch_size: 32
  tldr:
    enabled: true
    model: "claude-haiku-4-5"
    languages: ["en", "zh"]
    max_tokens: 200
  topic_classification:
    enabled: true
    model: "claude-haiku-4-5"
    multilabel: true
  weekly_digest:
    enabled: true
    model: "claude-sonnet-4-6"
    language: "zh"
  # Budget Cap: 不限美元，只限篇数避免意外爆仓
  budget_cap:
    max_papers_per_day_full_enrich: 500    # 默认很宽松
    fallback_strategy: "defer"              # defer = 排队延后，不 drop
    priority_on_overflow: "tier_a_first"   # A > B > C

integrations:
  zotero:
    enabled: false              # 需要用户配 API key 才能开
    library_id: null
    api_key: null               # 存 keychain
    sync_collection_name: "PaperPulse Must Read"
    sync_on: ["must_read"]      # 触发同步的状态

display:
  feed:
    default_time_window: "today"     # today | week | month | custom
    default_group_by: "topic"        # topic | institution | tier | source | flat
    default_topic_mode: "primary"    # primary | all
    default_sort: "relevance_desc"
    default_hide_tier_c: true
    page_size: 30
  dashboard:
    default_window_days: 30

network:
  allow_pdf_download: true
  pdf_download_max_mb: 500
  cache_dir: null
```

### 7.10 配置热更新

FastAPI 启动加载全部 YAML，`watchdog` 监听 `config/` 目录，文件变更 → parse + validate + reload，不重启。种子集/主题变更触发后台 re-embed。UI 写配置通过 `PATCH /api/v1/settings/{name}`，后端写 YAML，watchdog 触发 reload。

---

# Part IV: Pipeline

## 8. Ingestion 模块

### 8.1 Source 抽象接口

```python
# backend/paperpulse/ingest/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Iterator

@dataclass
class RawPaper:
    source: str
    source_id: str
    title: str
    abstract: str | None
    authors_raw: list[dict]
    venue_raw: str | None
    published_at: datetime | None
    updated_at: datetime | None
    doi: str | None
    arxiv_id: str | None
    pdf_url: str | None
    html_url: str | None           # ar5iv URL if available
    extra: dict

class Source(ABC):
    name: str

    @abstractmethod
    def fetch(self, since: datetime | None = None) -> Iterator[RawPaper]: ...

    @abstractmethod
    def health_check(self) -> bool: ...
```

### 8.2 各源实现要点

#### arXiv
- 用 `arxiv` Python 包 + OAI-PMH
- `time.sleep(3)` 每次 API 请求 (rate limit)
- 记录 high-watermark (最新 `updated` 字段)
- 返回的 RawPaper 填 `html_url = f"https://ar5iv.labs.arxiv.org/html/{arxiv_id}"`

#### NBER
- RSS: `https://www.nber.org/rss/new.xml`
- 每月 ~200 篇，简单

#### CEPR
- 无 RSS，scrape `https://cepr.org/publications/discussion-papers` 列表
- 每页提取，循环翻页直到 `published_at < since`
- 注意 robots.txt 和速率限制 (delay 2s/req)

#### Fed FEDS
- 列表页 `https://www.federalreserve.gov/econres/feds/<year>.htm`
- Scrape 年度列表

#### ECB WPS
- RSS: `https://www.ecb.europa.eu/rss/wps.html`

#### BoE SWP
- Scrape `https://www.bankofengland.co.uk/working-paper`
- 支持年份筛选

#### BIS WP
- RSS: `https://www.bis.org/doclist/wppubls.rss`

#### IMF WP
- Scrape `https://www.imf.org/en/Publications/WP`
- 每期大约 20-50 篇

#### Riksbank / OeNB
- Scrape，量小，简单

#### OpenReview
- 用 `openreview-py` v2 API
- 按 venue 抓 submissions (非会议窗口期返回空)
- 抽 `content.title/abstract/authors/authorids`

#### ACL Anthology
- GitHub 有每月 release XML dump
- `git clone` or download, parse, 每月一次

#### Crossref 金融顶刊
```python
for journal in JOURNALS:
    url = f"https://api.crossref.org/journals/{journal.issn}/works"
    params = {"filter": f"from-pub-date:{since}", "rows": 100}
    # 翻页 until done
```

#### SSRN (占位)
```python
class SsrnSource(Source):
    name = "ssrn"
    def fetch(self, since=None):
        # v1.1: placeholder, returns empty iterator
        # TODO v2: explore workarounds (DOI lookup, selected networks)
        return iter([])
    def health_check(self): return True
```

### 8.3 去重策略

```python
def dedup(raw: RawPaper) -> tuple[str, bool]:
    """Returns (canonical_id, is_new)."""
    # 1. DOI exact match
    if raw.doi:
        existing = db.query("SELECT id FROM papers WHERE doi = ?", raw.doi)
        if existing: return merge(existing.id, raw), False

    # 2. arxiv_id match
    if raw.arxiv_id:
        existing = db.query("SELECT id FROM papers WHERE arxiv_id = ?", raw.arxiv_id)
        if existing: return merge(existing.id, raw), False

    # 3. Fuzzy: normalized_title + first_author + year
    norm_title = normalize(raw.title)
    candidates = db.query(
        "SELECT id, title_normalized FROM papers WHERE strftime('%Y', published_at) = ?",
        year(raw.published_at)
    )
    for c in candidates:
        if rapidfuzz.ratio(norm_title, c.title_normalized) > 95:
            if first_author_match(raw, c):
                return merge(c.id, raw), False

    # 4. New
    new_id = generate_id(raw)
    return new_id, True
```

### 8.4 增量抓取

- 每个 source 在 `ingest_runs` 表维护最后成功的 `finished_at`
- 新一轮: `since = last_success_finished_at - 3 days buffer`
- 首次: `since = 2026-02-01` (从 app.yml 读 `cold_start_date`)

---

## 9. Entity Extraction 模块

### 9.1 作者规范化

```python
def normalize_author(raw_author: dict, paper: RawPaper) -> Author:
    # Step 1: 如果有 ORCID，直接 key
    if raw_author.get("orcid"):
        return get_or_create_by_orcid(raw_author["orcid"])

    # Step 2: 通过 paper.doi/arxiv_id 查 OpenAlex
    oa_work = openalex_lookup(paper.doi or paper.arxiv_id)
    if oa_work:
        for authorship in oa_work["authorships"]:
            if name_matches(authorship["author"]["display_name"], raw_author["name"]):
                return get_or_create_by_openalex_id(authorship["author"]["id"])

    # Step 3: Fuzzy match by name + co-authors
    candidates = db.query(
        "SELECT id FROM authors WHERE name LIKE ?",
        f"%{raw_author['name']}%"
    )
    best = best_match_by_coauthors(candidates, paper.authors_raw)
    if best and confidence > 0.8: return best

    # Step 4: Create new manual author
    return create_manual_author(raw_author["name"])
```

### 9.2 机构规范化 (核心 · 三路径)

```python
def get_affiliations_for_paper(paper: RawPaper) -> list[Institution]:
    # === Path 1 (primary): OpenAlex ===
    if paper.doi:
        oa_work = openalex_lookup_by_doi(paper.doi)
    elif paper.arxiv_id:
        oa_work = openalex_lookup_by_arxiv(paper.arxiv_id)
    else:
        oa_work = None

    if oa_work and oa_work.get("authorships"):
        affs = extract_openalex_affiliations(oa_work)
        if affs:
            paper.affiliation_source = "openalex"
            return affs

    # === Path 2 (fallback): ar5iv HTML ===
    if paper.html_url:  # ar5iv URL
        try:
            html = fetch_with_timeout(paper.html_url, timeout=15)
            affs = parse_ar5iv_affiliations(html)
            if affs:
                paper.affiliation_source = "ar5iv"
                return affs
        except Exception as e:
            log.warning(f"ar5iv fetch failed for {paper.id}: {e}")

    # === Path 3 (fallback): Crossref 直接字段 ===
    if paper.doi and paper.source == "crossref":
        crossref_meta = crossref_lookup(paper.doi)
        affs = extract_crossref_affiliations(crossref_meta)
        if affs:
            paper.affiliation_source = "crossref"
            return affs

    # === Path 4: Mark as unverified, queue for retry ===
    paper.affiliation_source = "unverified"
    queue_affiliation_retry(paper.id, delay_hours=48)
    return []


def parse_ar5iv_affiliations(html: str) -> list[InstitutionRaw]:
    soup = BeautifulSoup(html, 'lxml')
    affs = []
    for aff_elem in soup.select('.ltx_role_institutetext, .ltx_role_affiliation'):
        text = aff_elem.get_text(strip=True)
        affs.append(InstitutionRaw(name_raw=text))
    # Associate with authors using footnote markers
    # ... (见实际实现)
    return affs


def normalize_institution(raw: InstitutionRaw) -> Institution:
    # Step 1: Exact match ROR dump
    ror_match = ror_dict.exact_match(raw.name_raw)
    if ror_match: return get_or_create_from_ror(ror_match)

    # Step 2: Alias match
    for alias_match in ror_dict.alias_matches(raw.name_raw):
        if alias_match.score > 0.95: return get_or_create_from_ror(alias_match)

    # Step 3: Fuzzy match existing
    candidates = db.query("SELECT * FROM institutions ORDER BY ...")
    best = rapidfuzz.extractOne(raw.name_raw, [c.name for c in candidates])
    if best[1] > 90: return candidates[best[2]]

    # Step 4: New unverified
    return create_unverified_institution(raw.name_raw)
```

### 9.3 ROR dump 离线字典

- 打包: 下载 https://github.com/ror-community/ror-records 最新 release，压缩后 ~50MB
- 运行时加载: lazy load 到内存 trie，启动 +5s 一次性

### 9.4 PI 推断

```python
def infer_pi(paper_authors: list[Author]) -> Author | None:
    last = paper_authors[-1]
    if last.h_index and last.h_index > 20 and last.paper_count > 30:
        return last
    for a in paper_authors:
        if a.is_corresponding: return a
    return None  # 不强行推断
```

---

## 10. Filtering Pipeline (三级粗筛)

### 10.1 Level 1: 规则过滤

```python
def level1_filter(paper, keywords) -> tuple[bool, list[str]]:
    text = (paper.title + " " + (paper.abstract or "")).lower()
    reasons = []

    # Tier A venue 直通
    if paper.venue_normalized in TIER_A_VENUES:
        return True, [f"venue_A:{paper.venue_normalized}"]

    # 正向关键词
    positive_hits = [kw for kw in keywords.positive.flat() if kw.lower() in text]
    if not positive_hits:
        return False, []
    reasons.extend([f"kw+:{kw}" for kw in positive_hits[:3]])

    return True, reasons
```

### 10.2 Level 2: 语义过滤

```python
def level2_filter(paper, seeds_emb, topics_emb, keywords, config):
    paper_vec = embed(f"{paper.title}\n\n{(paper.abstract or '')[:1500]}")

    # 计算相似度 (seeds + topics)
    all_anchors = np.concatenate([seeds_emb.vectors, topics_emb.vectors])
    all_weights = np.concatenate([seeds_emb.effective_weights, topics_emb.weights])
    all_labels = seeds_emb.labels + topics_emb.labels

    sims = cosine_sim(paper_vec, all_anchors) * all_weights

    # 负向关键词惩罚
    text = (paper.title + " " + (paper.abstract or "")).lower()
    immune = any(w in text for w in keywords.immune)
    if not immune:
        if any(w in text for w in keywords.strong_negative):
            sims *= 0.3
        elif any(w in text for w in keywords.weak_negative):
            sims *= 0.7

    max_sim = float(sims.max())
    matched_label = all_labels[int(sims.argmax())]

    passed = max_sim >= config.level2.similarity_threshold
    return passed, max_sim, matched_label


def effective_weight(seed):
    """Half-life decay for user_must_read seeds."""
    if seed.half_life_days is None:
        return seed.base_weight  # 初始种子不衰减
    age_days = (now() - seed.added_at).days
    decay = math.exp(-math.log(2) * age_days / seed.half_life_days)
    return seed.base_weight * decay
```

### 10.3 Level 3: Tier 加权评分

```python
def level3_tier(paper, rules, signals, inst_whitelist) -> tuple[str, float]:
    # Tier A: venue 直通
    if paper.venue_normalized in rules.A.venues:
        return "A", 1.0

    # Tier B: weighted score
    components = {
        "level2_similarity": paper.level2_score or 0.0,
        "institution_whitelist": _compute_inst_score(paper, inst_whitelist),
        "citation_velocity": _normalize_citation_velocity(signals.citation_velocity),
        "pwc_has_code": 1.0 if signals.pwc_has_code else 0.0,
        "hf_daily_papers": 1.0 if signals.hf_daily_papers else 0.0,
        "tracked_author": 1.0 if any(a.is_tracked for a in paper.authors) else 0.0,
    }
    weights = rules.B_score.weights
    score = sum(weights[k] * components[k] for k in components)

    if score >= rules.B_score.threshold:
        return "B", score
    return "C", score


def _compute_inst_score(paper, whitelist):
    for inst in paper.institutions:
        if not inst.in_whitelist: continue
        if inst.whitelist_priority == "high":
            return 1.0
        return 0.5
    return 0.0


def _normalize_citation_velocity(vel):
    if vel is None: return 0.0
    return min(vel / 10.0, 1.0)  # 10 引用/7天 = max
```

### 10.4 整合 Pipeline

```python
def run_filter_pipeline(paper):
    l1_ok, l1_reasons = level1_filter(paper, keywords)
    paper.level1_passed = l1_ok
    paper.level1_reasons = l1_reasons
    if not l1_ok:
        return paper  # 存 DB 标 l1_passed=false (备档，但不进 feed)

    l2_ok, l2_score, l2_label = level2_filter(paper, seeds, topics, keywords, config)
    paper.level2_score = l2_score
    paper.level2_matched_seed = l2_label

    # 机构白名单豁免 L2 (即使 L2 没过，白名单命中也入 feed)
    inst_hit = any(i.in_whitelist for i in paper.institutions)
    if not l2_ok and not inst_hit:
        paper.tier = "C"
        paper.level3_tier_b_score = 0.0
        return paper

    paper.tier, paper.level3_tier_b_score = level3_tier(paper, rules, signals, whitelist)
    return paper
```

---

## 11. Enrichment 模块

### 11.1 Embedding

- bge-m3 ONNX，macOS M 系 Core ML 加速
- 批量 32，缓存 (paper_id, text_hash) → vector
- 输入: `title + "\n\n" + abstract[:1500]`

### 11.2 TL;DR (双语)

```
SYSTEM: You summarize academic papers for AI × Finance researchers.
Generate two TL;DRs capturing (1) core contribution (2) key method/finding.
Be concrete, avoid buzzwords. No "This paper presents..." filler.

USER: Title: {title}
Abstract: {abstract}

Output:
<en>English, max 50 words</en>
<zh>中文学术风格，50 字以内</zh>
```

Haiku ~$0.001/篇。

### 11.3 主题分类

```
SYSTEM: Classify into Topics. Return JSON.
Topics CS: [agents, llm, rl, benchmark, alignment, reasoning, foundation]
Topics Finance: [asset_pricing, behavioral, microstructure, corporate, risk, econometrics, fintech]
Topics Crosscut: [llm_for_finance, rl_for_trading, agent_simulation, nlp_finance, ml_asset_pricing, alt_data]

Return: {"cs":[...],"finance":[...],"crosscut":[...],"primary_topic":"...","relevance_score":0-10}
```

`primary_topic` = 三类中 relevance 最高的那个 (决定 Feed 默认 Group by topic 时论文落在哪个桶)。

### 11.4 Weekly Digest

Sonnet 生成中文周报，结构：
1. 本周 Top 5 必读
2. 主题热度 (3 个主题)
3. 机构动态 (5 个机构)
4. 值得关注的新论文 (Tier B 但有潜力)

### 11.5 Budget Cap

```python
class EnrichmentBudget:
    def __init__(self, max_per_day=500):
        self.max = max_per_day
        self.used = 0
        self.reset_at = tomorrow_morning()

    def can_enrich(self, paper) -> bool:
        if self.used < self.max: return True
        # Overflow: tier A 永远 enrich，其他延后
        if paper.tier == "A": return True
        queue_deferred_enrichment(paper.id)
        return False
```

Budget 是 soft limit，超出不丢论文，只延后 TL;DR 和分类。

---

# Part V: 前端

## 12. 前端页面规范

> **重要**: 本 Section 的 UI 实现**必须参考 `design-reference/` 目录**。具体迁移指南见 Section 22 和 Appendix E。

### 12.1 整体布局

- Top Bar (h-12): Logo + Nav + 通知 + Settings + 用户
- Side Nav (w-56): Feed / Explore / Dashboard / Network / Conferences / Digest / 分隔 / Institutions / Authors / 分隔 / Settings
- Main content area
- Status Bar (h-8): Last sync · 今日新增 · 各源健康

### 12.2 Feed 页面 (核心)

**分面浏览三大控件**:

```
[Time Window ▾] [Group by ▾] [Sort within group ▾]
```

- Time Window: Today / This Week / This Month / All / Custom
- Group by: Topic (默认) / Institution / Tier / Source / Flat
- Sort: Relevance / Date / Citations

**分组显示**:

```
▼ LLM Agents for Finance (12)
  [Paper Card]
  [Paper Card]
  ...

▼ RL for Trading (8)
  ...

▶ Other / Uncategorized (3)   ← collapsed
```

**Paper Card 字段**:
- Tier badge (A/B/C 三色)
- Topic tags (CS/Finance/Crosscut 三色系)
- 发布日期 (相对时间)
- 标题 (2 行截断)
- 作者 (前 3 + et al) + 机构 (• 分隔)
- TL;DR 英文 + 中文两段
- 信号 row: ★ relevance · 📈 citations · 💻 code · 🔥 HF · 👨‍🏫 tracked
- 操作: Save / Ignore / Open PDF / Expand
- 视觉状态: unread / saved / must_read (左边框) / ignored (半透)

**快捷键**:
- j/k: 上下
- s: save
- m: must read
- x: ignore
- Enter: 展开
- o: 打开 PDF
- /: 搜索
- g then t: 顶部

**右侧过滤器**:
- Tier (多选)
- Source (多选)
- Relevance score slider
- Status radio
- Topics / Institutions / Authors 搜索+多选
- Date range

**空状态 / Loading / Error** 各有对应 UI (Design reference 已提供)。

### 12.3 Explore 页面

和 Feed 共享 Paper Card 组件，但侧重全历史查询：

- **Table view**: 像 Notion DB，所有字段可显示，可排序，可多选批量操作，可导出 CSV/BibTeX
- **Timeline view**: 按月分组时间线
- **Topic Deep Dive** (子路由 `/explore/topic/:slug`): 主题专题页
  - 发文趋势折线 (按月)
  - Top 10 机构 bar chart
  - Top 10 作者
  - 相邻主题 (共现)
  - 论文列表分时间切片 (今日/本周/本月/全部)

### 12.4 Dashboard 页面

时间窗口选择器 + 对比开关。

**Widgets** (2x4 网格):
1. Today's Numbers (big numbers)
2. **Ingestion Trend (folding line chart)** — 按 Tier 堆叠，近 30/90 天
3. **Topic Heat Trend (multi-line)** — Top 5 主题近 90 天对比
4. Tier Distribution (donut)
5. Top Institutions (horizontal bar)
6. Top Authors (horizontal bar，tracked 高亮)
7. Source Distribution (stacked bar)
8. Recent Digest preview

所有图表点击下钻到 Explore 对应筛选。

### 12.5 Network 页面 (Ego Network)

```
Center: [Search box]  [Author | Institution]
Hops: [1] [2] [3]   Window: [30d]   Topic: [All]

[force-directed graph, 中心红色，1 跳蓝色，2 跳灰色，tracked 金星]

[Side panel: selected node info + papers list]
```

### 12.6 Conferences 页面

**两视图**: Calendar (月历) / List (按截止日排序)

**会议卡片**:
- 名称 + 地点 + 日期
- 验证状态 (✅ verified / ⚠️ needs review / ❓ single source / 👤 manual)
- Timeline (abstract/paper/response/decision/camera ready)
- Tags
- 官网链接
- 相关 PaperPulse 论文数

**验证冲突弹窗**:
```
NeurIPS 2026 deadline needs review
Source A (aideadlin.es): May 15
Source B (conferences.yml): May 22
◯ May 15
◉ May 22
◯ Other: [___]
[Open official] [Confirm]
```

### 12.7 Weekly Digest 页面

左 sidebar 历史周报列表，右主区 markdown 渲染。Export/Copy/Share 按钮。

### 12.8 Institutions / Authors 列表页

Table + 详情侧板，见 Design reference。

### 12.9 全局 Command Palette (Cmd+K)

三种搜索模式切换: keyword (FTS5) / semantic / metadata。
Quick actions: Go to X, Run ingest, Generate digest。

### 12.10 全文搜索

SQLite FTS5 对 title/abstract/authors 建索引。三种模式：
- Keyword: FTS5 MATCH
- Semantic: embedding kNN
- Metadata: 结构化查询

---

## 13. Settings 页面详规

14 个 Tab (详见 Design reference 和 Section 7 配置文件)：

1. 📡 Sources → sources.yml
2. 🔑 Keywords → keywords.yml
3. 🌱 Seeds (+ 半衰期) → seeds.yml
4. 🏷️ Topics → topics.yml
5. 🏛️ Institutions → institutions.yml
6. 👨‍🏫 Tracked Authors → authors.yml
7. 🎖️ Tier Rules (加权评分 + Simulate 按钮) → tiers.yml
8. 🎓 Conferences → conferences.yml
9. ⚙️ Pipeline (含 Budget Cap) → app.yml
10. 📅 Schedule → app.yml
11. 🎨 Display → app.yml
12. 🔌 API Keys (Anthropic / Zotero / OpenAI 可选) → keychain
13. 💾 Data (backup/restore/stats/quality metrics)
14. 🧪 Integrations (v1: Zotero; Obsidian 空 placeholder)
15. ℹ️ About

---

# Part VI: 集成

## 14. API 契约

所有 `/api/v1/`, JSON, localhost:8765。

### 14.1 Feed API

```
GET /api/v1/feed/grouped
  time_window: today|week|month|all|custom
  date_from, date_to (if custom)
  group_by: topic|institution|tier|source|flat
  topic_mode: primary|all
  sort_within_group: relevance|date|citations
  tier: A,B,C (comma)
  sources: arxiv,nber,...
  min_relevance: 0-10
  status: unread,saved,...
  collapsed_groups: [array]  // 前端记忆
  page, page_size

Response: {
  total, time_window,
  groups: [
    {key, label, count, color?, papers: [Paper]}
  ]
}

POST /api/v1/papers/{id}/status
  body: {status, rating?, notes?, tags?}

POST /api/v1/papers/{id}/mark-must-read
  // 加入 user_must_read seeds, 触发 re-embed
```

### 14.2 Explore API

```
GET /api/v1/explore/table
  filters..., columns..., sort, page

GET /api/v1/explore/topic/{slug}
  returns: analytics + papers grouped by time

GET /api/v1/explore/crosstab
  dim1, dim2, metric
```

### 14.3 Dashboard API

```
GET /api/v1/dashboard/summary?window_days=30
GET /api/v1/dashboard/time-series?metric=count&group_by=tier&window_days=90
GET /api/v1/dashboard/top-topics?window_days=30&n=10
GET /api/v1/dashboard/top-institutions?window_days=7&n=15
GET /api/v1/dashboard/top-authors?window_days=7&n=10
GET /api/v1/dashboard/source-distribution?window_days=7
```

### 14.4 Network API

```
GET /api/v1/network/ego
  center_type: author|institution
  center_id: xxx
  hops: 1|2|3
  window_days
  topic_filter?
Response: {nodes:[...], edges:[...]}
```

### 14.5 Conferences API

```
GET /api/v1/conferences
  time_window: upcoming|all
  tier: A,B,C

GET /api/v1/conferences/{id}
POST /api/v1/conferences/{id}/deadlines/{deadline_id}/confirm
  body: {chosen_date, source}
POST /api/v1/conferences/refresh
  // manually trigger aideadlin.es sync
```

### 14.6 Search API

```
GET /api/v1/search
  q: string
  mode: keyword|semantic|metadata
  types: papers,authors,institutions
  limit
```

### 14.7 Institutions / Authors API

```
GET /api/v1/institutions?window_days=7&sort=...&limit=50
GET /api/v1/institutions/{id}
POST /api/v1/institutions/{id}/whitelist
GET /api/v1/authors/...
POST /api/v1/authors/{id}/track
```

### 14.8 Settings API

```
GET /api/v1/settings/{config_name}
PATCH /api/v1/settings/{config_name}
POST /api/v1/settings/seeds/reembed
POST /api/v1/settings/topics/reembed
POST /api/v1/settings/ingest/run-now  { sources?: [...] }
GET /api/v1/settings/health
```

### 14.9 Digest API

```
GET /api/v1/digest/list
GET /api/v1/digest/{id}
POST /api/v1/digest/generate
```

### 14.10 Zotero API

```
GET /api/v1/integrations/zotero/status
POST /api/v1/integrations/zotero/test-connection
POST /api/v1/integrations/zotero/sync-now
GET /api/v1/integrations/zotero/log
```

### 14.11 SSE 实时事件

```
GET /api/v1/events
events:
- ingest_started {source}
- ingest_progress {source, papers_fetched}
- ingest_finished {source, papers_new}
- new_papers_available {count}
- enrichment_progress {done, total}
- conference_needs_review {conference_id, deadline_id}
```

---

## 15. 调度与后台任务

```python
scheduler = BackgroundScheduler(timezone="Asia/Singapore")

# 每日 07:30 抓取
scheduler.add_job(run_daily_ingest, CronTrigger(hour=7, minute=30))

# 每周一 08:00 digest
scheduler.add_job(generate_weekly_digest, CronTrigger(day_of_week='mon', hour=8))

# 每日 02:00 外部信号刷新
scheduler.add_job(refresh_external_signals, CronTrigger(hour=2))

# 每周日 03:00 DB 维护
scheduler.add_job(db_maintenance, CronTrigger(day_of_week='sun', hour=3))

# 每 6 小时 aideadlin.es 同步
scheduler.add_job(sync_conference_deadlines, IntervalTrigger(hours=6))

# 每 4 小时处理 affiliation retry 队列
scheduler.add_job(process_affiliation_retry_queue, IntervalTrigger(hours=4))
```

---

## 16. 错误处理与降级

### 16.1 源故障
- 单源超时/错误: log + 跳过 + 继续其他源
- 连续失败 3 天: UI warning + Settings 标红

### 16.2 OpenAlex / ar5iv 故障降级
- OpenAlex 挂: 降级纯 ar5iv 路径
- ar5iv 挂: 降级纯 OpenAlex，未命中的 papers 标 unverified
- 两者都挂: 所有 papers 标 unverified，affiliation_fetched_at 留空，加入重试队列

### 16.3 LLM 故障
- Haiku 超时: 队列重试 3 次
- API key 无效: 禁用 enrichment，保证 ingest 继续
- 超 Budget Cap: 降级只 enrich Tier A + tracked authors

### 16.4 Embedding 故障
- 本地模型加载失败: fallback OpenAI (如配置)
- 都失败: 禁用 L2 filter (L1+L3 仍工作)

### 16.5 数据完整性
- 启动 integrity check
- 定期备份 (每周)
- 用户状态 (user_*) 优先，pipeline 重跑不覆盖

---

## 17. 性能与资源预算

- 冷启动 (2026-02-01 起): 4 小时内
- 日常增量: 30 分钟内
- Feed 加载: < 500ms
- Dashboard: < 1s
- 内存: < 500MB
- 磁盘 (一年): < 10GB (不含 PDF)

**成本**:
- Haiku: ~$5/月
- Sonnet (周报): ~$1/月
- OpenAlex / ar5iv / ROR: 免费
- 合计: **~$6-10/月**

---

# Part VII: 开发与交付

## 18. 开发里程碑

**总原则**:
1. **接口先行**: 每个 Phase 开工前先定 API schema 和 DB schema，再写实现
2. **测试驱动**: 每个 PR 先写测试再写实现 (见 Section 19)
3. **PR 粒度小**: 每个 PR ≤ 500 行，可独立 review 和 rollback
4. **UI 复用 Design reference**: 每次要加 UI 组件先检查 design-reference (见 Section 22)
5. **不改 Spec 不扩范围**: 任何范围变更先更新 Spec

### Phase 0: 项目骨架 (Day 1-2)

| PR | 内容 | 验收 |
|---|---|---|
| #0.1 | Tauri 2.0 + React 18 + TS + Vite scaffold | `pnpm tauri dev` 启动空白窗口 |
| #0.2 | Python FastAPI sidecar + Tauri spawn | 点击按钮调用 `/api/v1/hello` 返回 |
| #0.3 | DuckDB + LanceDB + FTS5 init + schema.sql 迁移 | `make test-db` 通过 schema |
| #0.4 | YAML 配置系统 (loader + watchdog + validator) | 改 YAML 文件触发 reload 事件 |
| #0.5 | 日志 (structlog) + 错误处理基建 | 所有模块用统一 logger |
| #0.6 | Makefile + CI 基础 (lint + test + typecheck) | `make test` 跑通空测试套件 |

**Phase 0 DoD**: `make dev` 启动空架子，`make test` 绿。

### Phase 1: Ingest Pipeline 最小闭环 (Week 1)

| PR | 内容 |
|---|---|
| #1.1 | Source 抽象接口 + fixture 准备 |
| #1.2 | arXiv source + rate-limited client |
| #1.3 | 去重 (DOI/arxiv_id/fuzzy) + ingest_runs 表 |
| #1.4 | NBER source |
| #1.5 | 最小 `GET /api/v1/feed` (无筛选，只返回最近 100 篇) |
| #1.6 | **UI 骨架从 design-reference 复制基础 layout** (Top Bar, Side Nav, Feed 空壳) |
| #1.7 | 最小 Feed 列表渲染 (连真实 API，去除 mock) |

**Phase 1 DoD**: arXiv + NBER 抓到 200 篇，Feed 页面能看到。

### Phase 2: Entity Extraction (Week 2 前半)

| PR | 内容 |
|---|---|
| #2.1 | ROR dump loader + institutions 表 |
| #2.2 | OpenAlex enricher (primary path) |
| #2.3 | ar5iv HTML fallback parser |
| #2.4 | Author normalization |
| #2.5 | Institution normalization + ROR fuzzy match |
| #2.6 | Affiliation retry queue + 48h scheduler |
| #2.7 | Institutions / Authors API + 列表页 UI (迁移 design) |

**Phase 2 DoD**: 80% 论文有 institution 关联，Institutions 页面可用。

### Phase 3: 筛选 Pipeline (Week 2 后半)

| PR | 内容 |
|---|---|
| #3.1 | Keywords L1 + Settings Keywords Tab (迁移 design) |
| #3.2 | Embedding (bge-m3 ONNX) + seeds/topics embed on startup |
| #3.3 | L2 semantic filter + Settings Seeds Tab |
| #3.4 | L2 Topics Tab |
| #3.5 | L3 Tier 加权评分 + Settings Tier Rules Tab (含 Simulate 按钮) |
| #3.6 | Feed API 完整版 (含 grouped, filters) |

**Phase 3 DoD**: Feed 能按主题分组，Tier 分类正确，settings 能改规则实时生效。

### Phase 4: 多源扩展 (Week 3 前半)

| PR | 内容 |
|---|---|
| #4.1 | OpenReview source |
| #4.2 | ACL Anthology source |
| #4.3 | Crossref 金融顶刊 (12 本) |
| #4.4 | CEPR source |
| #4.5 | Fed / ECB / BoE sources |
| #4.6 | BIS / IMF sources |
| #4.7 | Riksbank / OeNB sources |
| #4.8 | Sources Settings Tab (迁移 design) |

**Phase 4 DoD**: 13 个 source 全部可抓，Settings → Sources 可开关配置。

### Phase 5: Enrichment (Week 3 后半)

| PR | 内容 |
|---|---|
| #5.1 | Haiku TL;DR (双语) |
| #5.2 | Haiku 主题分类 + primary_topic |
| #5.3 | Budget Cap + 降级机制 |
| #5.4 | Pipeline Settings Tab (迁移 design) |

**Phase 5 DoD**: 每日新论文 90%+ 有 TL;DR，主题分类正常。

### Phase 6: 前端主要页面 (Week 4)

| PR | 内容 |
|---|---|
| #6.1 | Feed 完整版 (分面 + 三键 + 过滤 + 快捷键) — 全部迁移 design |
| #6.2 | Dashboard (8 widgets) — 迁移 design，接真实 API |
| #6.3 | Explore (Table / Timeline views) |
| #6.4 | Topic Deep Dive |
| #6.5 | FTS5 全文搜索 + Command Palette |
| #6.6 | Display Settings Tab |

**Phase 6 DoD**: 日常使用路径全通，Feed 可以用一天。

### Phase 7: 补充功能 (Week 5)

| PR | 内容 |
|---|---|
| #7.1 | Ego network graph |
| #7.2 | Conferences aideadlin.es scraper |
| #7.3 | Conferences 页面 + 三源验证 + 冲突弹窗 |
| #7.4 | Weekly Digest (Sonnet) |
| #7.5 | Institution / Author 详情侧板 |
| #7.6 | Zotero 集成 (API client + sync job + Settings Tab) |

**Phase 7 DoD**: 所有 Must Have 功能实现。

### Phase 8: 打磨与发布 (Week 6)

| PR | 内容 |
|---|---|
| #8.1 | BibTeX / Markdown / CSV 导出 |
| #8.2 | Data Settings Tab (backup/restore/quality metrics) |
| #8.3 | 错误处理完善 (所有 16.x 场景) |
| #8.4 | 性能优化 (virtualize, pre-aggregation) |
| #8.5 | Dark mode 所有页面校对 |
| #8.6 | Tauri 打包 (dmg) + 代码签名 |
| #8.7 | README + docs/USER_GUIDE.md |

**Phase 8 DoD**: `.dmg` 可安装，完整用户旅程无阻塞。

### Phase 9 (post-v1): 会议官网 scrapers

每个顶会官网一个独立 scraper PR，逐步扩大覆盖。v1 不必须。

---

## 19. 测试策略

### 19.1 测试哲学

**Claude Code 规则**:
1. **每个 PR 必须先写测试再写实现** (TDD)
2. 测试必须能 `make test` 自动运行
3. 不允许 `# TODO add test later` 或 `@pytest.mark.skip` 提交
4. 覆盖率工具: pytest-cov (后端) + vitest coverage (前端), 目标 >70%
5. 外部 API 调用必须 mock (使用 `responses` / `pytest-httpserver`)
6. Claude Code 不能假装测试通过 - 每次 PR 描述必须贴 `make test` 完整输出

### 19.2 测试分层

```
├── 单元测试 (unit/)
│   ├── test_arxiv_source.py
│   ├── test_dedup.py
│   ├── test_level1_filter.py
│   ├── test_level2_filter.py
│   ├── test_tier_scoring.py
│   ├── test_openalex_enricher.py
│   ├── test_ar5iv_parser.py
│   ├── test_institution_normalize.py
│   └── ...
├── 集成测试 (integration/)
│   ├── test_ingest_end_to_end.py
│   ├── test_filter_pipeline.py
│   ├── test_enrichment_flow.py
│   ├── test_config_hot_reload.py
│   └── test_api_endpoints.py
├── 金标准回归测试 (golden/)
│   ├── golden_papers_100.jsonl       # 人工标注
│   └── test_regression_metrics.py    # precision/recall/F1
└── E2E (e2e/)
    └── test_user_journeys.py          # playwright
```

### 19.3 Fixtures 准备

```
tests/fixtures/
├── arxiv/
│   ├── response_cs_lg_2025_04.xml     # 真实 API 返回 snapshot
│   ├── response_q_fin_cp.xml
│   └── single_paper_with_affiliation.xml
├── ar5iv/
│   ├── paper_2303_17564.html          # BloombergGPT, 有 aff
│   ├── paper_missing_aff.html
│   └── paper_broken_render.html
├── openalex/
│   ├── work_with_authorships.json
│   └── work_not_found.json
├── crossref/
│   └── jf_recent_100.json
├── ror/
│   └── ror_subset_100.json            # mini dump for testing
├── openreview/
│   └── neurips_2025_submissions.json
└── golden_papers_100.jsonl            # 金标准
```

### 19.4 金标准测试集

**用途**: 任何改 filter / entity / enrichment 规则后，跑 regression 确保召回率/精确率不降。

**每条格式**:
```json
{
  "id": "2303.17564",
  "title": "BloombergGPT...",
  "abstract": "...",
  "authors": [...],
  "affiliations_expected": ["Bloomberg L.P."],
  "affiliations_ror_expected": ["ror_id_123"],
  "should_pass_l1": true,
  "should_pass_l2": true,
  "expected_tier": "B",
  "expected_topics_cs": ["foundation", "llm"],
  "expected_topics_finance": [],
  "expected_topics_crosscut": ["llm_for_finance"],
  "expected_primary_topic": "llm_for_finance",
  "expected_relevance_min": 8
}
```

**100 条** 从 seed_set.md 中选代表性论文 + 刻意加一些边界案例 (应该拒的)。

**每次 PR 运行 `make test-regression`**:
```
Precision: 0.93 (baseline 0.92) ↑
Recall:    0.89 (baseline 0.90) ↓ ← 警告但不阻塞
F1:        0.91 (baseline 0.91) =
Tier confusion matrix:
            Expected A  Expected B  Expected C
Actual A:   18          2           0
Actual B:   1           35          3
Actual C:   0           5           36
```

如果任何指标下降 > 3%，PR 需要特别 review。

### 19.5 数据质量监控

Settings → Data Tab 展示:
- Affiliation coverage (期望 >85%)
- TL;DR coverage (>95%)
- Topic classification coverage (>95%)
- Unverified institution count
- Pending affiliation retry queue size

### 19.6 性能测试

```
tests/performance/
├── seed_100k_papers.py
├── test_feed_query_time.py      # <500ms with 100k papers
├── test_dashboard_aggregate.py
└── test_embedding_batch.py
```

### 19.7 手动验收 checklist

每个 Phase 准出附一个 `docs/acceptance/phase_N.md`:

```markdown
# Phase 1 Acceptance

## Automated
- [ ] make test 绿
- [ ] make lint 绿
- [ ] make typecheck 绿

## Manual
- [ ] 手动触发 ingest, 确认 arXiv + NBER 各有新论文
- [ ] Feed 页面加载时间 <1s
- [ ] 关闭应用再重启, 数据不丢失
- [ ] Console 无 error / warning
```

Claude Code 每个 PR description 必须贴此 checklist 自检结果。

### 19.8 Claude Code 自测流程

**每次 PR 前执行**:

```bash
make lint          # ruff / eslint
make typecheck     # mypy / tsc
make test          # pytest / vitest
make test-regression  # 金标准
```

**任何一项失败禁止 commit**。

**不允许的偷懒模式**:
- `@pytest.mark.skip` (除非有 issue 链接)
- `# type: ignore` (除非有注释解释)
- `assert True` 占位测试
- 用 sleep 解决 race condition

---

## 20. 部署与分发

- **macOS**: `pnpm tauri build --target aarch64-apple-darwin` → `.dmg`
  - 签名: Apple Developer ID + notarization
- **Linux**: `.AppImage` (次要)
- **Python sidecar**: PyInstaller 单 binary，嵌入 Tauri resources
- **更新**: Tauri updater + GitHub Releases

---

## 21. 未来扩展 (v2+)

- 云同步 (Cloudflare D1 + R2)
- 协作 / 多人共享种子集
- SSRN 替代方案
- 会议官网 scrapers 完善 (Phase 9)
- Labs/Groups 自动发现
- Research gap 提示
- 文献综述自动起稿
- 小红书/LinkedIn 图卡生成
- Telegram / 邮件 digest
- Obsidian 集成
- 共引网络 (Semantic Scholar)

---

## 22. Frontend Integration with Design Reference

> **本节是 v1.1 新增**，专门讲 Claude Code 如何和 `design-reference/` 目录协作。

### 22.1 核心原则

1. **Design reference 是 UI source of truth**: 视觉、交互、组件层级、CSS 类名 全部参考它
2. **Spec 是数据和行为 source of truth**: 数据字段、API 契约、业务逻辑 全部参考 Spec
3. **当两者冲突**: 以 Spec 为准，但必须在 PR description 里记录偏离的 UI 决策
4. **Mock 数据必须全部替换**: design-reference 里 `src/mocks/*.json` 是**禁用的**，任何功能实现都必须调用 `src/lib/api.ts` 里的真实 API

### 22.2 迁移工作流

**每个涉及 UI 的 PR** 必须遵循:

```
Step 1: 识别需要的 UI 组件
  → 找到 design-reference 里对应的组件
  → 读取其 JSX + props + 样式

Step 2: 复制到 src/components/
  → 保持文件名一致
  → 保持 props 接口一致（如无特殊理由）

Step 3: 替换 mock 数据为 API 调用
  → 移除 import ... from "../mocks/..."
  → 替换为 useQuery/hooks 调用 src/lib/api.ts

Step 4: 对齐 Type 定义
  → 检查 design-reference/src/types/*.ts
  → 和 SPEC Section 6 schema 对比
  → 若不一致，以 SPEC 为准，更新 src/lib/types.ts

Step 5: 填充缺失状态
  → Loading
  → Empty
  → Error
  → (design 可能只做了 happy path)

Step 6: 测试
  → 视觉 regression (截图对比 design-reference 原型)
  → 单元测试 (component logic)
  → 集成测试 (API 集成)
```

### 22.3 允许偏离 Design 的情况

以下情况 Claude Code 可以修改 UI (但必须在 PR 说明):

1. **数据字段不匹配**: Design 假设 paper 有字段 X，Spec/API 没有 → 用 Spec 字段
2. **性能问题**: Design 用普通 list 渲染 1000 条，需要改成 virtualized
3. **可访问性问题**: Design 缺 keyboard handler / aria-label → 补上
4. **状态缺失**: Design 没画 loading/empty/error → 自行设计（风格一致即可）
5. **Bug**: Design 里有明显 bug（例如某个交互永远打不开）→ 修掉

**禁止偏离的情况**:

- 纯视觉偏好（颜色、间距、字号）← 不要自作主张
- 组件结构（比如拆分一个大组件）← 保持一致便于后续 design 迭代同步
- 交互模式（快捷键、拖放）← 严格照 design

### 22.4 Mock 数据映射表

见 Appendix E。每个 mock 文件 → 对应哪个 API endpoint → 对应哪个 DB 查询。

### 22.5 Design 迭代怎么办

如果 Claude Design 后续出 v2, v3:
1. 放到 `design-reference-v2/` 新目录（不覆盖 v1）
2. 对比差异，评估哪些需要迁移
3. 新建 PR 迁移变化部分，不动未变部分

---

# 附录

## Appendix A: Claude Code 开发手册

### A.1 CLAUDE.md 模板

放在项目根目录，Claude Code 启动时会自动读:

```markdown
# PaperPulse Development Guide for Claude Code

## Source of Truth
- Product & engineering spec: docs/SPEC.md
- UI reference (visual/interactive): design-reference/
- Seed corpus: docs/seed_set.md

## Development Order
Follow Phases 0–8 in SPEC.md Section 18. Each phase has PRs listed. Do them in order.

## Rules

1. READ FIRST: Before any PR, read the relevant SPEC sections and any
   design-reference components you'll touch.

2. TEST FIRST: Write tests before implementation. See SPEC §19.

3. UI REUSE: Always check design-reference/ before creating new UI.
   Copy, don't recreate. See SPEC §22.

4. NO MOCK DATA: The mock JSONs in design-reference are placeholders.
   Your implementation must call real APIs via src/lib/api.ts.
   See Appendix E for mock→real mapping.

5. SMALL PRs: Keep PRs ≤500 LOC. Each PR must include:
   - Code + tests
   - PR description with acceptance checklist (§19.7)
   - Output of `make lint && make typecheck && make test`

6. BEFORE COMMIT: Run `make all` (lint + typecheck + test + regression).
   If any fail, fix them or revert. Never commit failing tests.

7. SPEC DEVIATION: If you discover SPEC is wrong or incomplete,
   STOP and add a note to docs/spec-questions.md. Don't
   silently deviate.

## Key Commands

- `make dev` - Start dev server (tauri + python sidecar + vite)
- `make test` - Run all tests
- `make test-unit` - Only unit tests
- `make test-regression` - Golden standard regression
- `make lint` - Ruff + ESLint
- `make typecheck` - mypy + tsc
- `make build` - Production build

## When Stuck

If blocked on something not covered in SPEC:
1. Document the question in docs/spec-questions.md
2. Pick the most conservative option (preserves user data, preserves
   existing APIs)
3. Leave a TODO comment referring to the question file
4. Continue

Don't invent features not in SPEC. Don't guess at UI design.
```

### A.2 PR 描述模板

```markdown
# PR #X.Y: [Phase N] <Short Description>

## Scope
References SPEC §<section>.
Implements <feature>.

## Changes
- Added X
- Modified Y
- Migrated component Z from design-reference/

## Tests
- [ ] Unit tests added: test_X.py
- [ ] Integration test: test_X_flow.py
- [ ] Regression: <paste make test-regression output>

## Design Reference Migration (if UI involved)
- Components copied from design-reference/src/components/X/
- Mock data replaced:
  - src/mocks/papers.json → GET /api/v1/feed
- Deviations from design:
  - <list deviations and reasons>

## Acceptance Checklist
- [ ] make lint ✓
- [ ] make typecheck ✓
- [ ] make test ✓ (<X> tests, all passed)
- [ ] make test-regression ✓ (P=X.XX R=X.XX F1=X.XX)
- [ ] Manual: <manual steps performed>

## Screenshots (if UI)
Before: <link>
After: <link>

## Rollback
If this PR breaks things, revert with: git revert <sha>
Data migrations: <any, or "none">
```

### A.3 接口先行示例

Phase 2 开工前，先写这些文件：

```python
# backend/paperpulse/entity/types.py
@dataclass
class InstitutionRaw:
    name_raw: str
    authors_associated: list[int]  # indices in paper.authors

@dataclass
class ResolvedAffiliation:
    institution_id: str
    confidence: float
    source: str  # 'openalex'|'ar5iv'|'ror_exact'|'fuzzy'
```

```python
# backend/paperpulse/entity/openalex.py
def lookup_by_arxiv(arxiv_id: str) -> dict | None:
    """TO IMPLEMENT in PR #2.2. Returns OpenAlex work JSON or None."""
    raise NotImplementedError
```

```typescript
// src/lib/api.ts
export async function getInstitutions(params: InstitutionsQuery): Promise<Institution[]> {
  // TO IMPLEMENT
  throw new Error('Not implemented')
}
```

这些 stub 先进 repo，后续 PR 逐个填充。

### A.4 常见坑

| 坑 | 规避 |
|---|---|
| ROR dump 50MB 打包大 | gzip + lazy load |
| arXiv API rate limit | `time.sleep(3)` 必须 |
| ar5iv 超时/不存在 | try/except + queue retry |
| OpenAlex 新论文滞后 | 48h retry |
| macOS sandbox 路径 | 用 Tauri `resolve_resource` API |
| bge-m3 加载慢 | 启动时预热 + 进度条 |
| SQLite FTS5 初始建索引慢 | 首次启动 progress UI |
| Tailwind 4 vs 3 | **用 3 不用 4** (shadcn 兼容) |
| macOS code signing | 需要 Apple Developer account |
| Python sidecar 路径 | dev 和 build 路径不同，用 env var |

---

## Appendix B: 数据源 URL 参考

### B.1 arXiv
- API: `http://export.arxiv.org/api/query`
- OAI-PMH: `http://export.arxiv.org/oai2`
- HTML (ar5iv): `https://ar5iv.labs.arxiv.org/html/{arxiv_id}`

### B.2 Working Papers
- NBER: `https://www.nber.org/rss/new.xml`
- CEPR: `https://cepr.org/publications/discussion-papers`
- Fed FEDS: `https://www.federalreserve.gov/econres/feds/`
- ECB WPS: `https://www.ecb.europa.eu/rss/wps.html`
- BoE SWP: `https://www.bankofengland.co.uk/working-paper`
- BIS WP: `https://www.bis.org/doclist/wppubls.rss`
- IMF WP: `https://www.imf.org/en/Publications/WP`
- Riksbank: `https://www.riksbank.se/en-gb/press-and-published/publications/working-paper-series/`
- OeNB: `https://www.oenb.at/en/Publications/Economics/Working-Papers.html`

### B.3 金融顶刊 ISSN
| 刊物 | ISSN |
|---|---|
| Journal of Finance | 0022-1082 |
| Journal of Financial Economics | 0304-405X |
| Review of Financial Studies | 0893-9454 |
| JFQA | 0022-1090 |
| Management Science | 0025-1909 |
| Review of Finance | 1572-3097 |
| Journal of Financial Markets | 1386-4181 |
| Journal of Banking and Finance | 0378-4266 |
| Quantitative Finance | 1469-7688 |
| Journal of Financial Data Science | 2640-3943 |
| Journal of Portfolio Management | 0095-4918 |
| Algorithmic Finance | 2158-5571 |

### B.4 其他
- Crossref: `https://api.crossref.org`
- OpenAlex: `https://api.openalex.org`
- OpenReview: `https://api2.openreview.net`
- ROR dump: `https://github.com/ror-community/ror-records`
- ACL Anthology: `https://github.com/acl-org/acl-anthology`
- aideadlin.es: `https://aideadlin.es/conferences.json`

### B.5 会议官网
- NeurIPS: https://neurips.cc/
- ICML: https://icml.cc/
- ICLR: https://iclr.cc/
- AFA: https://www.afajof.org/
- WFA: https://westernfinance.org/
- EFA: https://efa-online.org/
- (Phase 9 逐步 scrape)

---

## Appendix C: 核心数据字段样本

### C.1 arXiv → Paper

```jsonc
// 原始 arXiv API 返回 (简化)
{
  "id": "2511.12345v1",
  "title": "FinAgent-X: A Multi-Agent Framework...",
  "summary": "...",
  "authors": [{"name": "Jian Liu"}, ...],
  "categories": ["cs.MA", "q-fin.PM"],
  "published": "2026-04-23T08:00:00Z"
}

// + OpenAlex enrichment
{
  "authorships": [
    {"author": {"id": "A5012345", "display_name": "Jian Liu"},
     "institutions": [{"id": "I111", "ror": "...", "display_name": "Bloomberg L.P."}]},
    ...
  ]
}

// 最终入库 Paper 记录
{
  "id": "sha1_abc123",
  "source": "arxiv",
  "arxiv_id": "2511.12345",
  "doi": null,
  "title": "FinAgent-X: A Multi-Agent Framework...",
  "abstract": "...",
  "authors": [
    {"name": "Jian Liu", "author_id": "A5012345", "order": 1, "is_first": true,
     "affiliation_ids": ["ror_bloomberg"]},
    ...
  ],
  "venue": null,
  "published_at": "2026-04-23",
  "html_url": "https://ar5iv.labs.arxiv.org/html/2511.12345",
  "affiliation_source": "openalex",
  "level1_passed": true,
  "level1_reasons": ["kw+:multi-agent", "kw+:portfolio", "kw+:LLM"],
  "level2_score": 0.78,
  "level2_matched_seed": "topic:LLM Agents for Finance",
  "level3_tier_b_score": 0.72,
  "tier": "B",
  "topics_cs": ["agents", "llm"],
  "topics_crosscut": ["llm_for_finance"],
  "primary_topic": "llm_for_finance",
  "relevance_score": 9,
  "tldr_en": "FinAgent-X uses a team of LLM agents to rebalance portfolios...",
  "tldr_zh": "FinAgent-X 用 LLM 多 agent 协作做组合再平衡...",
  "user_status": "unread"
}
```

### C.2 NBER → Paper, C.3 Crossref → Paper 结构类似，详见 tests/fixtures/。

---

## Appendix D: 金标准测试集

见 SPEC §19.4。文件位置: `tests/fixtures/golden_papers_100.jsonl`。

构建流程:
1. 从 seed_set.md 挑 70 条代表性论文
2. 另加 30 条边界 case:
   - 10 条应该拒 (纯 CV / 纯医学等负向)
   - 10 条 Tier C 边界
   - 10 条 Tier A/B 边界
3. 每条人工标注期望输出
4. 首次 baseline 跑 Phase 3 完成后

---

## Appendix E: Mock → Real Data Migration Guide

> **This appendix is critical**. 每个 mock 文件 → 对应真实 API → 对应 backend 实现位置。

### E.1 通用原则

Claude Design 产出的 `design-reference/src/mocks/*.json` **在实际应用中不允许引用**。它们只服务于 design reference 项目本身（`pnpm dev` 能跑起来看效果）。

Claude Code 实现时:
1. ❌ 不要 `import papersJson from "../mocks/papers.json"`
2. ✅ 改为 `import { usePapers } from "../hooks/usePapers"` (内部调用真实 API)
3. mock JSONs 仅用于测试 fixture (可以 copy 到 tests/fixtures/)

### E.2 Mock 文件映射表

| Mock 文件 | 对应 API | Backend 实现 | 用于哪些页面 |
|---|---|---|---|
| `mocks/papers.json` | `GET /api/v1/feed/grouped` | `backend/api/feed.py` | Feed, Explore |
| `mocks/papers.json` | `GET /api/v1/papers/{id}` | `backend/api/feed.py` | Paper detail |
| `mocks/authors.json` | `GET /api/v1/authors` | `backend/api/authors.py` | Authors 列表 |
| `mocks/authors.json` | `GET /api/v1/authors/{id}` | `backend/api/authors.py` | Author detail |
| `mocks/institutions.json` | `GET /api/v1/institutions` | `backend/api/institutions.py` | Institutions 列表 |
| `mocks/institutions.json` | `GET /api/v1/institutions/{id}` | ditto | Institution detail |
| `mocks/conferences.json` | `GET /api/v1/conferences` | `backend/api/conferences.py` | Conferences 页 |
| `mocks/digests.json` | `GET /api/v1/digest/list` + `/{id}` | `backend/api/digest.py` | Weekly Digest |
| `mocks/settings.json` | `GET /api/v1/settings/{config}` | `backend/api/settings.py` | Settings 各 Tab |
| `mocks/dashboard.json` (如有) | `GET /api/v1/dashboard/*` | `backend/api/dashboard.py` | Dashboard |
| `mocks/network.json` (如有) | `GET /api/v1/network/ego` | `backend/api/network.py` | Network |

### E.3 Field 对齐 checklist

每次迁移组件时，对照 Design 里的 Paper 类型和 SPEC §6.1 `papers` 表：

```typescript
// Design 假设的 type（可能在 design-reference/src/types/paper.ts）
type Paper = {
  id: string
  title: string
  authors: { name: string, affiliation?: string }[]  // ← 简化了
  ...
}

// SPEC 真实字段（src/lib/types.ts 应与此对齐）
type Paper = {
  id: string
  source: string
  source_id: string
  doi: string | null
  arxiv_id: string | null
  title: string
  abstract: string
  authors: Array<{
    name: string
    order: number
    is_first: boolean
    is_last: boolean
    is_corresponding: boolean
    author_id: string
    affiliation_ids: string[]
  }>
  venue: string | null
  published_at: string  // ISO date
  tier: "A" | "B" | "C"
  relevance_score: number
  topics_cs: string[]
  topics_finance: string[]
  topics_crosscut: string[]
  primary_topic: string
  tldr_en: string
  tldr_zh: string
  citation_count: number
  citation_velocity: number
  pwc_has_code: boolean
  hf_daily_papers: boolean
  user_status: "unread" | "read" | "saved" | "must_read" | "ignored"
  user_rating: number | null
  user_notes: string | null
  user_tags: string[]
  zotero_item_key: string | null
  // ... (见 SPEC §6.1)
}
```

**如果 Design 的类型缺字段**: 扩展 Design 的类型以匹配 SPEC，不要缩减 SPEC。

**如果 Design 的类型多字段**: 保留但标 deprecated，等待下一次 Design 同步。

### E.4 举例：Feed 页面的迁移

**Design reference 状态**:
```tsx
// design-reference/src/pages/Feed.tsx
import papers from "../mocks/papers.json"

export default function Feed() {
  return (
    <div>
      {papers.map(p => <PaperCard paper={p} />)}
    </div>
  )
}
```

**Claude Code 实现后的状态**:
```tsx
// src/pages/Feed.tsx
import { useFeedGrouped } from "../hooks/useFeedGrouped"
import { useFeedStore } from "../stores/feedStore"

export default function Feed() {
  const { timeWindow, groupBy, sortWithin, filters } = useFeedStore()
  const { data, isLoading, error } = useFeedGrouped({
    timeWindow, groupBy, sortWithin, ...filters
  })

  if (isLoading) return <FeedSkeleton />
  if (error) return <FeedError error={error} />
  if (data.total === 0) return <FeedEmpty />

  return (
    <div>
      {data.groups.map(group => (
        <FeedGroup key={group.key} group={group} />
      ))}
    </div>
  )
}

// src/hooks/useFeedGrouped.ts
import { useQuery } from "@tanstack/react-query"
import { api } from "../lib/api"

export function useFeedGrouped(params) {
  return useQuery({
    queryKey: ["feed", "grouped", params],
    queryFn: () => api.getFeedGrouped(params),
  })
}

// src/lib/api.ts
export const api = {
  async getFeedGrouped(params) {
    const resp = await fetch(`${BACKEND_URL}/api/v1/feed/grouped?${qs(params)}`)
    if (!resp.ok) throw new Error(await resp.text())
    return resp.json()
  }
}
```

**组件 PaperCard 保持不变**（直接从 design-reference copy），只是 props 从 mock 数据来变成从真实 API 来。

### E.5 Settings 页的特殊迁移

Settings 的 mock 配置文件如 `mocks/settings-sources.json` 需要特别处理:

1. 不是读一次就完事，要支持 GET (load) 和 PATCH (save back to YAML)
2. 不能只存在前端 state，必须持久化
3. 保存后要触发 backend watchdog reload

```tsx
// src/pages/settings/SourcesTab.tsx
const { data, refetch } = useQuery({
  queryKey: ["settings", "sources"],
  queryFn: () => api.getSettings("sources"),
})

const save = async (newConfig) => {
  await api.patchSettings("sources", newConfig)
  await refetch()
  toast.success("Saved. Sources reloaded.")
}
```

### E.6 Mock → Real 迁移 checklist (每个页面用)

- [ ] 识别页面用到的所有 mock imports
- [ ] 对每个 mock, 确认对应 API endpoint 已存在/待实现
- [ ] 创建对应的 hook (use<Entity>) in `src/hooks/`
- [ ] 创建对应的 API client method in `src/lib/api.ts`
- [ ] 创建/对齐 Type in `src/lib/types.ts`
- [ ] 组件从 design-reference 复制到 src/
- [ ] 替换 mock import 为 hook 调用
- [ ] 添加 Loading / Empty / Error 状态
- [ ] Backend 端实现对应 API (如尚未实现)
- [ ] 测试: mock server 测试 + 真实后端集成测试
- [ ] 在 PR description 列出"替换的 mocks"

---

## Final Notes

这份 SPEC v1.1 是 **frozen for v1.0 implementation**。范围变更 → v1.x 或 v2。

**优先级 tiebreakers**:
1. 数据准确性 > 性能 > 美观
2. 用户可控性 > 自动化 > 智能化
3. 本地优先 > 云端
4. 开源库 > 自研
5. **Spec 行为 > Design 视觉 (冲突时)**

**关键不变量**:
- 用户 `user_status` / `user_notes` / `user_tags` / `user_rating` 永远不被自动覆盖
- 所有筛选规则可见可编辑
- 所有数据可导出
- 配置文件是 source of truth
- Design reference 是 UI source of truth
- Mock 数据必须替换为真实 API

**祝开发顺利。** 🚀
