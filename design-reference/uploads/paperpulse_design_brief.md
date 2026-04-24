# PaperPulse · Product Page Brief for Claude Design

> **To**: Claude Design
> **From**: JX (Rigi)
> **Goal**: 产出 PaperPulse 桌面应用 v1 的高保真前端原型 (React + TypeScript + Tailwind + shadcn/ui)
> **Format**: 静态可运行的 React 项目, 用 mock 数据, 所有页面可导航可交互
> **Output Directory**: `./design/` (项目根目录下的独立子项目)
> **Runtime Target**: macOS 桌面应用 (Tauri 壳, 但前端就是 React SPA)
> **Deliverable**: `pnpm install && pnpm dev` 能跑起来的完整静态前端

---

## 一、产品总体介绍

PaperPulse 是一个面向 **AI × Finance** 研究者的**本地桌面论文雷达与分析工具**。它每天自动从多个学术源（arXiv、NBER、CEPR、各大央行工作论文、金融顶刊 RSS、OpenReview 等）抓取新发表的论文，经过三级过滤（规则 → 语义 → 机构白名单）后呈现给用户。

用户是研究者，每个工作日早上用 5-15 分钟快速扫描当日新论文，按主题、机构、作者等维度组织信息，标记必读、保存感兴趣的、跳过无关的。

**核心价值**：
1. **不漏** —— 全源自动追踪
2. **不噪** —— 三级过滤 + 分面折叠
3. **有结构** —— 按主题/机构/作者/时间多维切片
4. **能分析** —— 趋势折线 + 机构排行 + 作者网络 + 会议日程

**用户核心场景**（按频率）：
- **每日晨读** (5-15 分钟)：扫一眼今日新论文，快速 save / ignore / 必读
- **主题深挖** (30-60 分钟)：某天想系统看某个子领域
- **机构/作者追踪** (5 分钟)：今天 Bloomberg/JPM/Ant 发了什么
- **会议日程** (每周)：哪些会议要截止了
- **周报生成** (每周一)：看自动生成的研究动态周报

---

## 二、设计原则

1. **信息密度偏高**：目标用户是研究者, 一屏能扫 20+ 论文标题是正确的. 不要给每张卡片太多 padding.
2. **macOS 原生感**：字号、间距、圆角、阴影参考 macOS Ventura/Sonoma 原生应用 (Mail, Notes, Reminders)
3. **键盘优先**：用户会频繁用 `j/k` 翻页, `s` 保存, `/` 搜索, `Cmd+K` 全局命令面板. UI 要为键盘用户优化.
4. **分面浏览是核心交互**：Feed 页面的 "Group by 切换" 是整个产品的灵魂, 不要设计得太低调.
5. **数据可视化偏实用**：折线图 > 地图 > 饼图. 用户要的是趋势对比, 不是好看.
6. **深色模式必须支持**：研究者经常晚上工作, Dark mode 是一等公民.
7. **中英文混排**：用户是中国人做 AI×Finance 研究, UI 主要英文, 但论文 TL;DR 会有中英两版. 保证中文字体渲染好看.

---

## 三、技术约束

```
Stack:
  - React 18 + TypeScript 5
  - Vite (dev server)
  - Tailwind CSS 3 (注意: 不是 4, 兼容 shadcn)
  - shadcn/ui (所有组件尽量用 shadcn primitives)
  - lucide-react (icons)
  - recharts (主要图表)
  - react-force-graph-2d (仅 ego network 用)
  - date-fns (日期格式化)
  - zustand (状态管理, 如果需要)
  - react-router-dom v6 (路由)

Fonts:
  - UI: Inter
  - Chinese: 系统字体 (PingFang SC / Noto Sans SC fallback)
  - Monospace: JetBrains Mono (for arXiv IDs, DOIs)

Forbidden:
  - 不要用 styled-components 或其他 CSS-in-JS (Tailwind only)
  - 不要用 Ant Design / Material UI / Chakra (shadcn only)
  - 不要用全屏动画或复杂过渡, 保持克制
  - 不要用 emoji 作为主要 UI 元素 (只在 tag / status 里节制用)
```

---

## 四、整体布局

桌面应用典型的三区布局：

```
┌─────────────────────────────────────────────────────────────────┐
│  [PaperPulse Logo]     [Nav Items]                [🔔] [⚙️] [👤]  │  ← Top Bar (h-12)
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                        │
│ Side     │               Main Content Area                       │
│ Nav      │                                                        │
│ (w-56)   │                                                        │
│          │                                                        │
│          │                                                        │
│          │                                                        │
├──────────┴──────────────────────────────────────────────────────┤
│ Status: Last sync 07:32 · 87 new today · 🟢 All sources healthy   │  ← Status Bar (h-8)
└─────────────────────────────────────────────────────────────────┘
```

**Top Bar 内容**：
- Logo + 名字 (左)
- 面包屑或页面标题 (中)
- 通知 bell, 设置齿轮, 用户头像 (右)

**Side Nav 内容**（图标 + 文字）：
```
📰  Feed                (主页, 默认)
🔍  Explore             (深度查询)
📊  Dashboard           (分析看板)
🕸️   Network             (作者/机构 ego network)
🎓  Conferences         (会议日程)
📝  Weekly Digest       (周报)
───
🏛️   Institutions         (机构列表页)
👨‍🏫  Authors              (作者列表页, 含已追踪)
───
⚙️   Settings
```

**Status Bar 内容**（小字, 次要信息）：
- 上次同步时间
- 今日新增数
- 各源健康状态 (点击展开)
- 当前筛选条件摘要 (如果有)

---

## 五、页面清单与重点说明

共 11 个页面 + 1 个全局命令面板 + Settings 的 14 个 tab。

### 页面 1: Feed (主页, 最重要)

**这是用户 80% 时间待的地方, 设计最重要的页面**。

**URL**: `/` or `/feed`

**布局**：左主区 (论文列表) + 右侧边栏 (过滤器 + 详情)

```
┌────────────────────────────────────────────────────┬─────────────┐
│ [Today ▾] [Group by: Topic ▾] [Sort: Relevance ▾] │ ═══Filters══│
│ 87 papers · 12 topics                              │             │
│ ─────────────────────────────────────────────────  │ Tier:       │
│                                                      │  ☑ A        │
│ ▼ LLM Agents for Finance (12)                      │  ☑ B        │
│                                                      │  ☐ C        │
│   ┌────────────────────────────────────────────┐  │             │
│   │ [A] [agents] [llm_for_finance]     📅 Today│  │ Source:     │
│   │                                              │  │  ☑ arxiv    │
│   │ FinAgent-X: A Multi-Agent Framework...      │  │  ☑ nber     │
│   │                                              │  │  ☐ cepr     │
│   │ Jian Liu, Alice Wang, Bob Chen              │  │  ...        │
│   │ Bloomberg · Stanford · Bloomberg            │  │             │
│   │                                              │  │ Relevance:  │
│   │ TL;DR: FinAgent-X uses a team of LLM agents │  │  [====●═]   │
│   │ to rebalance portfolios, achieving 15%...   │  │  ≥ 6        │
│   │ 中: FinAgent-X 用 LLM 多 agent 协作做组合... │  │             │
│   │                                              │  │ Status:     │
│   │ ★ 9.2  📈 12 cites/7d  💻 code  🔥 HF Daily │  │  ● Unread   │
│   │                                              │  │  ○ Saved    │
│   │ [Save] [Ignore] [Open PDF]  ·  Expand ↓     │  │  ○ Read     │
│   └────────────────────────────────────────────┘  │             │
│                                                      │ Topics:     │
│   ┌────────────────────────────────────────────┐  │ (checklist) │
│   │ ...                                          │  │             │
│   └────────────────────────────────────────────┘  │ [Reset]     │
│                                                      │             │
│ ▼ RL for Trading (8)                               │             │
│                                                      │             │
│ ▼ ML for Asset Pricing (5)                         │             │
│                                                      │             │
│ ▶ Other / Uncategorized (3)     ← collapsed        │             │
│                                                      │             │
└────────────────────────────────────────────────────┴─────────────┘
```

**核心交互**：

1. **时间窗口选择器** (最顶部)
   - Quick picks: `Today` / `This Week` / `This Month` / `All Time`
   - Custom range: 弹日历选日期区间
   - 当前选中值显示为面包屑

2. **Group by 切换器**
   - Options: `Topic` / `Institution` / `Tier` / `Source` / `Flat (no group)`
   - 切换时论文重新分组, 动画柔和
   - `Flat` 模式就是纯时间排序的大列表

3. **Sort within group**
   - Options: `Relevance` / `Date` / `Citations`
   - 作用于每个分组内部的排序

4. **分组 Header**
   - 可折叠 (点击箭头)
   - 显示该桶论文数
   - 显示该桶代表的 topic/institution 图标或颜色
   - 用户折叠偏好持久化

5. **论文卡片** (最重要的组件)
   - Tier 徽章: A (绿), B (蓝), C (灰) — 需要在视觉上一眼分辨
   - Topic tags: 多个, 用颜色区分 CS / Finance / Crosscut 三大侧
   - 日期: 相对时间 "Today" / "Yesterday" / "3 days ago"
   - 标题: 2 行截断, hover 显示完整
   - 作者: 最多显示前 3 + "et al", 机构用 "·" 分隔
   - **TL;DR 双语**: 英文 + 中文各一段, 中文用略小字号或稍淡颜色
   - **信号 row**: relevance score (★), citation velocity (📈), has code (💻), HF Daily (🔥), tracked author (👨‍🏫)
   - **操作按钮**: Save / Ignore / Open PDF, 再加一个展开按钮
   - **展开后**: 显示完整 abstract + 所有作者 + venue + DOI + 笔记编辑区 + 打分 + 标签

6. **卡片状态变化**
   - Hover: 轻微 elevation
   - Selected (键盘 focus): 左侧有蓝色细竖线
   - Saved: 右上角小书签图标
   - Must Read: 卡片左边框彩色
   - Ignored: 卡片半透明灰度

7. **快捷键** (Feed 页面专属)
   - `j` / `↓`: 下一张卡片
   - `k` / `↑`: 上一张
   - `s`: 保存
   - `m`: 标必读
   - `x`: 忽略
   - `Enter`: 展开/收起
   - `o`: 打开 PDF (新窗口)
   - `g` then `t`: 跳到顶部

8. **右侧过滤器面板**
   - Tier checkbox
   - Source checkbox (arxiv/nber/cepr/fed/ecb/boe/bis/imf/openreview/crossref-journals)
   - Relevance score slider (0-10)
   - Status radio (unread / saved / must_read / read / ignored / all)
   - Topics checklist (滚动)
   - Institutions search + checklist
   - Authors search + checklist
   - Date range picker
   - [Reset all] 按钮

9. **空状态**
   - "今日暂无新论文, 请稍后回来或手动触发 ingest"
   - 按钮: "Run ingest now"

10. **Loading 状态**: 论文卡片骨架屏

**设计重点**：
- 卡片的视觉层次必须清晰：标题 > TL;DR > 作者/机构 > 信号 row > 操作
- 分组折叠要流畅, 因为用户会频繁折叠展开
- 右侧 filter 面板的滚动区域要独立, 不影响主区滚动

---

### 页面 2: Explore

**定位**: Feed 是"今日+结构化浏览", Explore 是"全历史+灵活查询"。UI 可以很像 Feed, 但侧重点不同。

**URL**: `/explore`

**布局**: 左过滤器 (默认收起) + 主区 (三种 view 切换)

**View 切换器** (顶部 tab):
- **Table view**: 数据表格, 所有字段可配置显示, 可排序, 可导出 CSV / BibTeX
- **Timeline view**: 按月分组的时间线, 每月一个 section, 横向滚动
- **Topic deep dive**: 选一个主题, 进入该主题专题页 (见下)

**Table view 重点**:
- 像 Notion database 的风格
- 列: title / authors / venue / date / tier / topics / relevance / institutions / status
- 可以 drag 列宽, 可以点击列头排序
- 多选 checkbox, 批量操作 (batch save / ignore / tag)
- 顶部搜索框 + 高级查询 builder

**Timeline view 重点**:
- 左侧是月份 (2026-02, 2026-03, 2026-04)
- 每个月里列论文, 按日期倒序
- 可以横向 hover 到"跨月看机构/主题出现频率"

**Topic deep dive** (一个独立 route `/explore/topic/:slug`):

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Explore                                            │
│                                                                │
│  # LLM Agents for Finance                                    │
│  247 papers since 2026-02                                    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  📈 发文趋势 (按月 折线图)                              │   │
│  │                                                        │   │
│  │  [recharts line chart over months]                    │   │
│  │                                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌────────────────────┐  ┌────────────────────┐              │
│  │ 🏛️  Top 机构 (bar) │  │ 👨‍🏫  Top 作者      │              │
│  │                     │  │                     │              │
│  │ Bloomberg    ████23│  │ Kelly, B.     ██12 │              │
│  │ Stanford     ███18 │  │ Xiu, D.       ██10 │              │
│  │ Ant Group    ███15 │  │ ...                │              │
│  │ ...                 │  │                     │              │
│  └────────────────────┘  └────────────────────┘              │
│                                                                │
│  🔗 相邻主题 (共现):                                           │
│   - RL for Trading (co-occur 0.42) →                         │
│   - Agent Simulation (0.35) →                                │
│   - ML for Asset Pricing (0.28) →                            │
│                                                                │
│  📄 论文列表                                                   │
│  [Today (3)] [This Week (12)] [This Month (38)] [All (247)]  │
│                                                                │
│  (论文卡片列表, 同 Feed 样式)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

### 页面 3: Dashboard

**定位**: 一屏看清"我关心的领域最近怎么样"。

**URL**: `/dashboard`

**布局**: 网格布局, widget 可拖动重排 (v1 先固定布局)

**顶部控件**:
- Time window selector: `7d` / `30d` / `90d` / `All`
- Compare to previous period toggle

**Widgets (初始布局 2x4 网格)**:

```
┌─────────────────────┐ ┌─────────────────────┐
│ Today's Numbers     │ │ Ingestion Trend     │
│                     │ │                     │
│  87  New today      │ │  [line chart]       │
│  412  This week     │ │  stacked by tier    │
│  1247 This month    │ │                     │
│  23  Must read      │ │                     │
└─────────────────────┘ └─────────────────────┘

┌─────────────────────┐ ┌─────────────────────┐
│ Topic Heat Trend    │ │ Tier Distribution   │
│                     │ │                     │
│  [multi-line chart] │ │  [donut chart]      │
│  top 5 topics vs    │ │  A / B / C          │
│  last 90 days       │ │                     │
└─────────────────────┘ └─────────────────────┘

┌─────────────────────┐ ┌─────────────────────┐
│ Top Institutions    │ │ Top Authors         │
│                     │ │                     │
│  [horizontal bars]  │ │  [horizontal bars]  │
│  Top 10 · 30d       │ │  Top 10 · tracked   │
│                     │ │  highlighted        │
└─────────────────────┘ └─────────────────────┘

┌─────────────────────┐ ┌─────────────────────┐
│ Source Distribution │ │ Recent Digest       │
│                     │ │                     │
│  [stacked bar]      │ │  This week's top 5  │
│  arxiv/nber/cepr... │ │  papers teaser      │
└─────────────────────┘ └─────────────────────┘
```

**关键**:
- 所有图表点击后下钻到 Explore 对应筛选
- 折线图 hover 显示具体数值
- Top 机构 / 作者 bar, 关注列表中的用特殊颜色高亮

---

### 页面 4: Network (ego network)

**定位**: 不是全局网络图, 而是"以某个作者/机构为中心的 2 跳合作网络"。

**URL**: `/network`

**布局**:
```
┌─────────────────────────────────────────────────────────────┐
│  Center: [Search author or institution...]  [Author | Inst] │
│  Hops: [1] [2] [3]   Window: [30d ▾]   Topic: [All ▾]       │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                        │   │
│  │                    (force-directed graph)             │   │
│  │                                                        │   │
│  │     红色圆 = center                                     │   │
│  │     蓝圆 = 1 跳合作者                                   │   │
│  │     灰圆 = 2 跳合作者                                   │   │
│  │     金星 = 你追踪的作者                                 │   │
│  │                                                        │   │
│  │                                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
│  Click a node to see collaborations list →                    │
│                                                                │
│  [Side panel: selected node info]                             │
│   - Name, affiliation                                          │
│   - X papers in this window                                    │
│   - Y co-papers with center                                    │
│   - [View all papers] [Track this author]                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 页面 5: Conferences

**定位**: 会议 deadline 日程 + 会议元信息 + 提醒。

**URL**: `/conferences`

**两种视图**:
1. **Calendar view**: 月历网格, 每个 deadline 一个小标签
2. **List view**: 按截止日期排序的列表

**会议卡片**:
```
┌─────────────────────────────────────────────────────────┐
│ NeurIPS 2026              📍 San Diego · Dec 8-13       │
│ ✅ Verified (3 sources agree)                            │
│                                                            │
│ 📅 Timeline                                                │
│ Abstract deadline:     May 15, 2026    ← 18 days away    │
│ Paper deadline:        May 22, 2026    ← 25 days away    │
│ Author response:       Jul 30, 2026                      │
│ Decision:              Sep 15, 2026                      │
│                                                            │
│ 🏷️ Topics: ML, AI, agents, foundation models             │
│ 🌐 Official: neurips.cc/2026                             │
│                                                            │
│ 📄 Related papers in PaperPulse:                         │
│  - 247 papers already tagged "for NeurIPS 2026"          │
└─────────────────────────────────────────────────────────┘
```

**验证状态**:
- ✅ Verified (三源一致 绿色)
- ⚠️ Needs Review (两源不一致 黄色, 点击弹窗让用户选)
- ❓ Single Source (只有一源 灰色)
- 👤 Manual (用户手工输入)

**弹窗示例** (needs review):
```
┌────────────────────────────────────────┐
│ NeurIPS 2026 deadline needs review     │
│                                          │
│ Source A (aideadlin.es): May 15         │
│ Source B (conferences.yml): May 22      │
│                                          │
│ Which is correct?                        │
│  ◯ May 15                                │
│  ◉ May 22                                │
│  ◯ Other: [__________]                   │
│                                          │
│ [Open official website]                  │
│ [Confirm] [Remind me later]              │
└────────────────────────────────────────┘
```

---

### 页面 6: Weekly Digest

**定位**: 阅读每周一自动生成的中文研究动态周报。

**URL**: `/digest`

**布局**:
- 左 sidebar (w-64): 历史周报列表, 按周倒序
- 右主区: 选中周报的 markdown 渲染

**右主区内容** (prose 样式):
```
# AI × Finance 研究动态周报
## 2026 年第 17 周 (04-20 ~ 04-26)

## 本周 Top 5 必读

1. **FinAgent-X: A Multi-Agent Framework...** (Bloomberg, arXiv)
   三句话综述...

2. ...

## 主题热度
...

## 机构动态
...

## 值得关注的新论文
...
```

**Actions** (右上角):
- Export as Markdown
- Copy to clipboard
- Share to 小红书 (生成图卡)
- Share to LinkedIn

---

### 页面 7: Institutions (list)

**URL**: `/institutions`

**布局**: Table 风格列表 + 详情侧板

**列**:
- Flag (国旗图标)
- 机构名
- 类型 (university / big_tech / bank / ...)
- 近 X 天论文数
- 排名变化 (↑↓ 带数字)
- 是否在白名单
- 操作 (view / add to whitelist / remove)

**详情侧板** (点击某行后抽屉式展开):
- 机构全名 + 地址 + logo
- 近期论文时间线
- 活跃作者 Top 10
- 主题分布饼图
- "View all papers from this institution" button

---

### 页面 8: Authors (list)

**URL**: `/authors`

**布局**: 和 Institutions 类似, table + 详情侧板

**列**:
- 头像占位符
- 作者名
- 当前机构
- h-index
- 近 X 天论文数
- Tracked ⭐
- 操作

**详情侧板**:
- 作者名 + 机构历史时间线
- h-index / paper count / citation count
- 主题演化折线图 (近 5 年该作者主题构成变化)
- 最近论文列表
- Track / Untrack toggle

---

### 页面 9: Settings (最多 tab)

**URL**: `/settings/:tab`

**布局**: 左 sidebar (w-56) Tab 列表 + 右主区表单

**Tab 列表** (14 个):
1. 📡 Sources
2. 🔑 Keywords
3. 🌱 Seeds
4. 🏷️ Topics
5. 🏛️ Institutions
6. 👨‍🏫 Tracked Authors
7. 🎖️ Tier Rules
8. 🎓 Conferences
9. ⚙️ Pipeline
10. 📅 Schedule
11. 🎨 Display
12. 🔌 API Keys
13. 💾 Data
14. 🧪 Integrations (v2 hook, 显示 "Zotero coming in v1.x" placeholder 内容)
15. ℹ️ About

**通用设计模式**:
- 顶部: Tab 标题 + 一句话说明
- 中部: 表单 / 表格 / 开关
- 底部: `[Save]` / `[Reset to defaults]` / `[Export config]` / `[Import config]`
- 右上角: 修改未保存时有 orange dot, hover 提示

**重要 tab 详细设计**:

#### 🌱 Seeds Tab
- 三列 grid: CS 侧 / Finance 侧 / 交叉
- 每个 seed 一行:
  - 标题
  - ArXiv ID / DOI (小字 mono)
  - Weight slider (0-2)
  - Tags (chips)
  - [Remove] button
- 顶部按钮: `Add by ArXiv ID` / `Add by DOI` / `Add by Search` / `Import from Markdown`
- 底部: `Re-embed all seeds` button + 显示 "Last embedded: 2 days ago, 148 active seeds"

#### 🏷️ Topics Tab
- 每个主题一张卡:
  - Name (editable)
  - Slug (auto-gen from name)
  - Side dropdown (cs / finance / crosscut)
  - Color picker
  - English description (multi-line textarea)
  - Chinese description (multi-line textarea)
  - Weight slider
  - Drag handle 用于排序
- `[Add new topic]` 在底部
- `[Re-embed all topics]` button

#### 🏛️ Institutions Tab
- Tab 内再分 4 个子 tab: Academic-CS / Academic-Fin / Industry-AI / Industry-Fin / Government
- Table: ROR ID / Name / Country / Type / Departments / Tags / Priority / Actions
- Search 输入 + "Search ROR" 弹窗 (搜 ROR dump)
- Bulk import CSV

#### 🎖️ Tier Rules Tab
- Section "Tier A Venues": chip editor
- Section "Tier B Score Formula":
  - 显示公式: `score = 0.3 * similarity + 0.2 * inst_whitelist + 0.15 * citation_velocity + 0.1 * pwc + 0.1 * hf_daily + 0.15 * tracked_author`
  - 每个权重一个 slider, 和必须 = 1 (自动重新分配)
  - Threshold slider (默认 0.5)
- 底部有个"Simulate" 按钮: 用当前规则跑最近 100 篇论文, 显示 A/B/C 分布

#### ⚙️ Pipeline Tab
- Level 1 enabled toggle
- Level 2:
  - Similarity threshold slider (0.1–0.6)
  - "Test on recent papers" button → 弹窗显示当前阈值下近 7 天的 pass rate
- Level 3 enabled toggle
- Embedding model: `bge-m3 (local)` / `text-embedding-3-small (OpenAI)` radio
- TL;DR:
  - Enabled toggle
  - Languages: ☑ English ☑ 中文
  - Max tokens slider
- Topic classification: enabled + multilabel toggle
- Weekly digest: enabled + language + model radio

#### 💾 Data Tab
- Stats display:
  - Database size: 2.3 GB
  - Papers: 34,127
  - Institutions: 1,842
  - Authors: 12,453
- Buttons:
  - `Backup now`
  - `Restore from backup`
  - `Clear ignored papers older than 30 days`
  - `Re-run enrichment for papers missing TL;DR`
  - `Reset database` (danger, 二次确认)
- 数据质量指标 section:
  - Affiliation coverage: 87%
  - TL;DR coverage: 94%
  - Topic classification coverage: 96%

---

### 全局组件: Command Palette

**快捷键**: `Cmd+K`

**UI**: 居中弹框 (shadcn Command 组件)

**内容**:
```
[🔍 Search papers, authors, institutions...]

Quick Actions
├── Go to Feed
├── Go to Dashboard
├── Go to Settings
├── Run ingest now
├── Generate weekly digest
└── ...

Recent Papers
├── [Paper 1 title]
├── ...

Tracked Authors
├── ...
```

**三种搜索模式切换** (顶部 tab):
- Keyword (FTS5)
- Semantic (embedding)
- Metadata (精确字段匹配)

---

## 六、Mock 数据

请准备 `mocks/` 目录, 包含:
- `papers.json`: 200 篇 mock 论文 (多样化: 覆盖所有 tier / topic / source / status)
- `authors.json`: 50 个 mock 作者
- `institutions.json`: 30 个 mock 机构 (带 lat/lng)
- `conferences.json`: 15 个 mock 会议
- `digests.json`: 3 篇 mock 周报
- `settings.json`: 所有 Settings 的 mock 配置

Mock 数据要真实: 用真实的 AI×Finance 论文标题风格 (可以参考 BloombergGPT / FinGPT / FinMem 这种). 不要用 "lorem ipsum" 敷衍.

---

## 七、Design System 要求

### 颜色 (建议 palette, 可调整)

```
Tier Badges:
  A: emerald-500 (代表顶会/顶刊, 最高质量)
  B: sky-500 (代表强候选)
  C: slate-400 (代表边缘, 默认折叠)

Topic Sides:
  CS: violet-500 (紫色系)
  Finance: amber-500 (琥珀色系)
  Crosscut: teal-500 (青色系, 代表融合)

Status:
  Must Read: rose-500 (红色边框)
  Saved: blue-500
  Read: gray
  Ignored: opacity-40

Signals:
  Code: green
  HF Daily: orange
  Tracked author: yellow
  High citation: purple

Background:
  Light mode: white / gray-50 / gray-100
  Dark mode: zinc-900 / zinc-800 / zinc-700
```

### 圆角

- Cards: rounded-lg (8px)
- Buttons: rounded-md (6px)
- Badges: rounded-full
- Inputs: rounded-md

### 阴影

尽量克制. 只有卡片 hover 时有 shadow-sm. 不要用 shadow-lg.

### 字号

- Page title: text-2xl font-bold
- Section header: text-lg font-semibold
- Card title: text-base font-medium
- Body: text-sm
- Meta: text-xs text-muted-foreground
- Mono (arxiv id, doi): text-xs font-mono

### 间距

- 页面 padding: p-6
- 卡片间距: gap-3 (密集) 或 gap-4 (舒适)
- 卡片内 padding: p-4

---

## 八、交付清单

Claude Design 最终产出应包含:

```
design/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── index.html
├── README.md                    # 每个页面对应哪个 brief 章节
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── layout/              # TopBar, SideNav, StatusBar
│   │   ├── paper/               # PaperCard, PaperDetail
│   │   ├── feed/                # FeedGrouping, FeedFilter
│   │   ├── dashboard/           # all widgets
│   │   ├── explore/
│   │   ├── network/
│   │   ├── conferences/
│   │   ├── digest/
│   │   ├── institutions/
│   │   ├── authors/
│   │   └── settings/            # 14 个 tabs
│   ├── pages/
│   │   ├── Feed.tsx
│   │   ├── Explore.tsx
│   │   ├── TopicDeepDive.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Network.tsx
│   │   ├── Conferences.tsx
│   │   ├── Digest.tsx
│   │   ├── Institutions.tsx
│   │   ├── Authors.tsx
│   │   └── Settings/
│   │       └── *.tsx (14 个 tab 组件)
│   ├── mocks/
│   │   ├── papers.json
│   │   ├── authors.json
│   │   ├── institutions.json
│   │   ├── conferences.json
│   │   └── digests.json
│   ├── hooks/
│   ├── lib/
│   │   └── utils.ts
│   ├── stores/                  # zustand if needed
│   └── types/                   # TypeScript types matching spec schema
│       ├── paper.ts
│       ├── author.ts
│       ├── institution.ts
│       └── conference.ts
└── .eslintrc, .prettierrc, etc.
```

**README.md 必含**:
1. 如何运行 (`pnpm install && pnpm dev`)
2. 页面导航图 (哪个 URL 对应哪个章节)
3. 已知限制 (哪些交互是 mock 的, 哪些还没实现)
4. 和 SPEC 的映射关系

---

## 九、验收标准

以下每一条都要满足:

- [ ] `pnpm dev` 能启动, 无 console error
- [ ] 所有 11 个页面都能导航到
- [ ] 所有 14 个 Settings tab 都有内容 (哪怕只是 placeholder)
- [ ] Feed 页面的分面浏览 (Group by Topic / Institution / Tier / Source / Flat) 实际能切换
- [ ] Feed 页面的三键操作 (j/k/s/x/m/Enter) 有键盘绑定 (mock 效果即可, 点一下有视觉反馈)
- [ ] Dashboard 所有 widget 都用 recharts 画出来
- [ ] Ego network 用 react-force-graph-2d 实际渲染一个小网络
- [ ] Dark mode 可切换, 所有页面在 dark mode 下正常
- [ ] 中文字体在所有有中文的地方渲染正常
- [ ] Command Palette (Cmd+K) 能弹出
- [ ] 空状态 / loading 状态 / error 状态各至少有一处示范

---

## 十、特别说明给 Claude Design

1. **优先度**: Feed > Dashboard > Explore > Settings > 其他. 如果时间有限, 先做好 Feed.
2. **可以自由发挥视觉细节**, 但交互逻辑必须严格按本文档.
3. **遇到本文档没覆盖的细节**, 先按"macOS 原生应用的惯例"决定, 再在 README 里记下决定.
4. **不要在设计阶段写实际的 API 调用代码**, 全用 mock. Claude Code 后续会接入真实 backend.
5. **组件要写得能被直接迁移**, 不要过度依赖 design 项目的特殊结构. 理想情况下整个 `src/components/` 能原样 copy 到主项目.
6. **所有可交互元素都要有反馈**, 哪怕是 console.log('clicked'). 这样用户操作时知道"有东西响应了".

---

**完成后, 请在 README 顶部写明: "Ready for Claude Code implementation against SPEC v1.1"**
