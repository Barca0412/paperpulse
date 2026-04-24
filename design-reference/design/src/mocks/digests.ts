import type { Digest } from "@/types";

const w17md = `# AI × Finance 研究动态周报
## 2026 年第 17 周 (04-20 ~ 04-26)

## 本周概览

本周共捕捉 412 篇新论文（较上周 +12%），其中 Tier A 共 38 篇。最热门的三个主题是：**LLM Agents for Finance**、**RL for Trading**、**ML for Asset Pricing**。机构上 Bloomberg 与 Ant 本周各有 4 篇进入 Tier A，值得持续跟踪。

## 本周 Top 5 必读

1. **FinAgent-X: A Multi-Agent LLM Framework for Portfolio Rebalancing** (Bloomberg × Stanford, arXiv)
   提出一种 critic-planner-executor 三体架构，在 2018-2024 年回测中将 Sharpe 从 1.1 提升到 1.7。值得关注的是其"critic 否决率"的设计，作者给出的 ablation 显示这是收益主要来源。

2. **Mechanistic Interpretability of Finance-Tuned LLMs** (Anthropic, OpenReview)
   用稀疏自编码器在金融微调模型上复现了"情绪电路"，识别出 3 个与 EPS 惊喜相关的专门 attention head。方法论与 Olah 团队 2024 年风格一致，但数据是 Bloomberg 新闻而非 Wikipedia。

3. **Stablecoin Runs as Coordination Failures** (BIS, NBER WP)
   把 Terra 崩盘建模为多均衡博弈，论证 T+1 赎回窗是唯一能够消除坏均衡的机制设计。对 CBDC 讨论有直接参考价值。

4. **The Cross-Section of Expected Returns, Revisited** (Chicago × NYU, SSRN)
   用 transformer encoder 重新估计 Kelly-Pruitt (2022) 的 IPCA 模型，发现前 10 个主成分足以解释 92% 的回报方差，相比原文的 5 个因子显著增加。

5. **RLVR for Long-Horizon Trading** (DeepMind, arXiv)
   把 RLVR（verifier feedback）思路应用到 30 天持仓决策，用一个专门的 "verifier" 判断执行计划是否会违反风控约束。代码已开源。

## 主题热度

- **LLM Agents for Finance** 仍是本周最热主题，占新增论文 18%（持续 4 周领跑）
- **Mechanistic Interpretability** 明显升温，较 4 周平均 +42%
- **Climate Finance** 连续两周下降，主要因为 COP 之后的 publication lull
- **Stablecoins & CBDC** 本周有 BIS 三篇重磅，值得拉一个 deep dive

## 机构动态

- **Bloomberg** 本周 4 篇 Tier A，连续 6 周保持产业界第一
- **Ant Group** 本周首次进入 Tier A 三甲（4 篇），主要是 agent 方向
- **Fed Board** 一篇关于 large-language-model 政策沟通的 FEDS Notes 引起讨论
- **Goldman Sachs** 本周 0 篇新论文，保持低产业的一贯模式

## 值得关注的追踪作者

- **Bryan Kelly** (Chicago): 两篇新论文，都在 ML asset pricing 方向
- **Hyun Song Shin** (BIS): 两篇都在 stablecoin systemic risk

## 下周预期

- ICML 2026 决定将在 5/2 公布，预计接下来一周会有大量 camera-ready 版本上 arXiv
- 美联储 5/1 议息会议，预计 5/2-5/3 会出现一批 macro-ML 分析论文
`;

const w16md = `# AI × Finance 研究动态周报
## 2026 年第 16 周 (04-13 ~ 04-19)

## 本周概览

本周捕捉 368 篇新论文。ICLR 2026 接收列表公布，在这之后 arXiv 上出现一批 camera-ready 论文，整体 Tier A 比例较前一周上升 3pp。

## 本周 Top 5 必读

1. **LOB-GPT: A Foundation Model for Limit Order Book Dynamics** (Meta × NYU Stern, ICLR camera-ready)
   本周最有分量的论文之一。在 2 万亿 LOB tick 上预训练，下游任务（execution、市场做市、波动率预测）大幅超过 baseline。

2. **Constitutional AI for Financial Advice** (Anthropic × Stanford HAI, arXiv)
   把 Anthropic 的宪法 AI 范式应用到 robo-advisory，重点在合规性（Reg BI, MiFID II）。公开了一个 400 条 scenario 的评测集。

3. **Forecasting FX with News Embeddings** (Citadel × HKUST, SSRN)
   在 10 种主要货币对上做 out-of-sample 验证，news embedding 在短周期（1-5 天）统计显著，长周期退化。该发现与 Bianchi-Büchner 一致。

4. **Tail Risk Forecasting with State-Space Transformers** (LSE × BIS, BIS WP)
   引入 Mamba 架构做尾部 VaR 估计，在亚洲金融危机/2008/2020 三次事件上的 backtesting 优于传统 GARCH-EVT。

5. **Collusion in Algorithmic Market Making** (Ant × HKUST, arXiv)
   用 LLM agent 仿真做市商相互博弈，发现当观测信息充分时，agent 会自发收敛到类卡特尔报价。

## 主题热度

（…省略）
`;

const w15md = `# AI × Finance 研究动态周报
## 2026 年第 15 周 (04-06 ~ 04-12)

## 本周概览

本周捕捉 334 篇新论文。NeurIPS 2026 abstract deadline 临近（5/15），部分作者已经把前置工作传到 arXiv，本周 foundation model 方向论文数量持续偏高。

## 本周 Top 5 必读

1. **Distributional RL for Drawdown-Aware Portfolio Construction** (Two Sigma × CMU, arXiv)
2. **Do Bigger Models Price Better? Scaling Laws for Factor Models** (JPM AI Research, NBER WP)
3. **Retrieval-Augmented Reasoning for Macro Nowcasting** (ECB × LSE, ECB WP Series)
4. **Transition Risk Pricing in Corporate Bonds** (Oxford × Imperial, CEPR DP)
5. **On the Spurious Correlations of ML Asset Pricing Models** (Chicago, JoF forthcoming)

## 主题热度

（…省略）
`;

export const DIGESTS: Digest[] = [
  { id: "d17", weekNumber: 17, year: 2026, startDate: "2026-04-20", endDate: "2026-04-26", title: "2026 W17: FinAgent-X, Stablecoin Runs, RLVR", markdown: w17md, topPapers: ["p0", "p1", "p2", "p3", "p4"] },
  { id: "d16", weekNumber: 16, year: 2026, startDate: "2026-04-13", endDate: "2026-04-19", title: "2026 W16: LOB-GPT, Constitutional AI for Advice", markdown: w16md, topPapers: [] },
  { id: "d15", weekNumber: 15, year: 2026, startDate: "2026-04-06", endDate: "2026-04-12", title: "2026 W15: Distributional RL, Scaling Factor Models", markdown: w15md, topPapers: [] },
];
