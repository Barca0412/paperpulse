import type { Paper, Source, Tier, PaperStatus } from "@/types";
import { TOPICS } from "./topics";
import { INSTITUTIONS } from "./institutions";
import { AUTHORS } from "./authors";

// Realistic AI×Finance titles pool. These are original compositions, not real papers.
const TITLE_TEMPLATES = [
  "{X}: A Multi-Agent LLM Framework for Portfolio Rebalancing under Regime Shifts",
  "Do Large Language Models Understand Earnings Calls? Evidence from {Y} Disclosures",
  "{X}: Deep Reinforcement Learning for Optimal Execution in Fragmented Markets",
  "Retrieval-Augmented Reasoning for Macro Nowcasting with {Y} Central-Bank Texts",
  "The Cross-Section of Expected Returns, Revisited: A Transformer-Based Factor Zoo",
  "{X}: A Foundation Model for Limit Order Book Dynamics",
  "Agentic Simulation of Heterogeneous Traders: Calibration on {Y} NASDAQ Microdata",
  "Mechanistic Interpretability of Finance-Tuned LLMs: Circuits for Sentiment",
  "Stablecoin Runs as Coordination Failures: A Game-Theoretic Deep Learning Approach",
  "Tail Risk Forecasting with State-Space Transformers on {Y} Cross-Country Panels",
  "{X}: Long-Horizon Factor Timing via Bayesian Neural Operators",
  "Constitutional AI for Financial Advice: Safety Evaluation on {Y} Scenarios",
  "Transition Risk Pricing in Corporate Bonds: A Climate-Aware Factor Model",
  "Market Making with Latent Intent: A Partially Observed MDP Framework",
  "From Earnings Drift to Attention Drift: Retail Flows in an LLM-Attention Era",
  "{X}: Benchmark for Financial Reasoning over Multi-Modal Filings",
  "Self-Improving Trading Agents via Reinforcement Learning from Verifier Feedback",
  "On the Spurious Correlations of ML Asset Pricing Models: A Causal Audit",
  "Central Bank Communication as a Nonlinear Macro Shock: A BERT-VAR Approach",
  "Liquidity Provision with Attention: Transformers in High-Frequency Trading",
  "{X}: Sparse Autoencoders Recover Factor Structure in Large Panels",
  "Systemic Stablecoin Risk: Network Spillovers via a Graph Attention Model",
  "Forecasting FX with News Embeddings: A {Y}-Currency Out-of-Sample Study",
  "Distributional Reinforcement Learning for Drawdown-Aware Portfolio Construction",
  "The Price of Interpretability: A Regulated Benchmark for Credit Scoring Models",
  "{X}: Synthetic Time Series for Asset Pricing via Diffusion Models",
  "Collusion in Algorithmic Market Making: An LLM-Agent Experiment",
  "Macroprudential Policy as Constrained Optimization over Agent Populations",
  "Large-Scale Multi-Task Learning of Return Predictors across {Y} Anomalies",
  "A Compositional Benchmark for Quantitative Reasoning in Finance LLMs",
  "{X}: Continual Pretraining on Central-Bank Transcripts",
  "Inflation Expectations from Social Media: An Embedding-Based Extraction",
  "Retail Sentiment Shocks and Momentum: A Causal Forest Analysis",
  "Do Bigger Models Price Better? Scaling Laws for Factor Models",
  "{X}: Cross-Modal Pretraining with Charts, Filings, and Prices",
  "Reinforcement Learning with Human Feedback for Robo-Advisory",
  "Counterfactual Option Pricing with Causal Neural ODEs",
  "{X}: Toward a Unified Benchmark for Financial Agents",
  "Green Factor Investing under Parameter Uncertainty: A Robust ML View",
  "Attention Networks for Credit Default Prediction under Covariate Shift",
];

const X_NAMES = ["FinAgent-X", "Quanta", "LOB-GPT", "MacroBench", "PriceNet", "FactorMind", "MarketPilot", "AlphaForge", "CreditLM", "SignalFlow", "OrderGPT", "EchoTrader"];
const Y_WORDS = ["SEC", "ECB", "Fed", "SFC", "multi-lingual", "50-firm", "30-year", "G10", "180-country", "1bn-token"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

// Deterministic mulberry32
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SOURCES: Source[] = ["arxiv", "nber", "cepr", "fed", "ecb", "boe", "bis", "imf", "openreview", "crossref"];
const TIERS: Tier[] = ["A", "B", "C"];
const STATUSES: PaperStatus[] = ["unread", "unread", "unread", "unread", "saved", "must_read", "read", "ignored"];

function makeTLDR(title: string, seed: number): { en: string; zh: string } {
  const r = rng(seed);
  const frames = [
    {
      en: `We introduce a novel framework that ${["rebalances portfolios", "forecasts returns", "prices derivatives", "simulates markets"][Math.floor(r() * 4)]} by combining ${["transformer architectures", "multi-agent LLMs", "diffusion models", "sparse autoencoders"][Math.floor(r() * 4)]} with ${["causal inference", "reinforcement learning", "Bayesian updating", "graph attention"][Math.floor(r() * 4)]}. On a panel of ${["US equities", "G10 FX", "investment-grade bonds", "S&P 500 intraday data"][Math.floor(r() * 4)]}, we improve Sharpe by ${(r() * 0.6 + 0.2).toFixed(2)}× over a strong baseline.`,
      zh: `提出一个结合 Transformer 与强化学习的框架，用于投资组合再平衡。基于过去十年的美股面板实验显示 Sharpe 提升约 ${(r() * 0.6 + 0.2).toFixed(2)} 倍，并通过消融验证了各模块的独立贡献。`,
    },
    {
      en: `This paper uses a finance-tuned LLM to measure ${["central-bank tone", "retail sentiment", "earnings-call surprise", "policy uncertainty"][Math.floor(r() * 4)]}. The resulting index predicts ${["inflation", "credit spreads", "volatility", "cross-sectional returns"][Math.floor(r() * 4)]} out-of-sample with R² of ${(r() * 0.2 + 0.1).toFixed(2)}.`,
      zh: `使用金融微调的大语言模型抽取央行语调，构造情绪指数。该指数在样本外对通胀和信用利差具有稳健的预测力，并与传统 VAR 模型形成互补。`,
    },
    {
      en: `We formalize market making as a partially observed MDP where the agent infers latent order-flow intent. An actor-critic with distributional value heads yields ${(r() * 30 + 15).toFixed(0)}% lower inventory risk than symmetric baselines on LOBSTER data.`,
      zh: `将做市问题建模为部分可观测马尔可夫决策过程，引入对潜在委托意图的推断。在 LOBSTER 数据上，相对对称基线可将库存风险降低约 ${(r() * 30 + 15).toFixed(0)}%。`,
    },
    {
      en: `We audit ML asset-pricing models for spurious factor exposures using a causal ablation toolkit. Several celebrated "anomalies" collapse once ${["industry controls", "size buckets", "microcap screens", "peer-cohort adjustments"][Math.floor(r() * 4)]} are added, raising concerns about published robustness.`,
      zh: `用因果消融工具审计机器学习资产定价模型，发现多个广为报道的"异象"在加入行业控制或小盘筛除后消失，对稳健性声明提出质疑。`,
    },
    {
      en: `We release a benchmark of ${Math.floor(r() * 900 + 300)} reasoning tasks over financial filings and show that even the largest frontier models fail on multi-step quantitative questions at rates above ${(r() * 20 + 35).toFixed(0)}%.`,
      zh: `发布一个覆盖约一千个跨文件推理任务的金融基准，前沿模型在多步定量题上的错误率仍在三成以上，为构建专用 agent 留出明确空间。`,
    },
  ];
  const f = frames[Math.floor(r() * frames.length)];
  return { en: f.en, zh: f.zh };
}

function makeAbstract(seed: number): string {
  const r = rng(seed);
  return `This paper addresses a central question in empirical ${["asset pricing", "market microstructure", "macro-finance", "risk management"][Math.floor(r() * 4)]}: how should practitioners integrate modern machine-learning primitives without sacrificing interpretability or regulatory auditability? We develop a method that combines ${["transformer encoders", "graph attention networks", "hierarchical VAEs", "diffusion decoders"][Math.floor(r() * 4)]} with a sparse factor structure, producing both competitive out-of-sample performance and an explicit decomposition of risk premia. Empirical evaluation uses ${Math.floor(r() * 30 + 10)} years of data across ${Math.floor(r() * 20 + 5)} countries. The results support three conclusions. First, model complexity alone does not deliver predictive gains once transaction costs are properly accounted for. Second, prior-informed regularization yields robust improvements on long-only strategies. Third, a causal ablation reveals that roughly ${Math.floor(r() * 20 + 40)}% of reported alpha survives strict out-of-period testing. We release code, pretrained weights, and a reproducibility notebook.`;
}

export function generatePapers(): Paper[] {
  const papers: Paper[] = [];
  const today = new Date("2026-04-24T08:00:00Z");
  for (let i = 0; i < 220; i++) {
    const r = rng(i * 7919 + 13);
    const titleTpl = pick(TITLE_TEMPLATES, hash(`title${i}`));
    const title = titleTpl
      .replace("{X}", pick(X_NAMES, hash(`x${i}`)))
      .replace("{Y}", pick(Y_WORDS, hash(`y${i}`)));

    // Date: 0-45 days ago, biased toward recent
    const daysAgo = Math.floor(Math.pow(r(), 1.8) * 45);
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - daysAgo);

    const tier: Tier = r() < 0.22 ? "A" : r() < 0.55 ? "B" : "C";
    const source = pick(SOURCES, hash(`s${i}`));
    const topicCount = 1 + Math.floor(r() * 2.5);
    const topicsShuf = [...TOPICS].sort(() => r() - 0.5);
    const topics = topicsShuf.slice(0, topicCount).map((t) => t.slug);

    // Authors: 2-5 authors
    const numAuthors = 2 + Math.floor(r() * 4);
    const shuffled = [...AUTHORS].sort(() => r() - 0.5);
    const authors = shuffled.slice(0, numAuthors).map((a) => ({
      name: a.name,
      authorId: a.id,
      institutionId: a.institutionId,
    }));

    const trackedAuthor = authors.some((au) => {
      const a = AUTHORS.find((x) => x.id === au.authorId);
      return a?.tracked;
    });

    const relevance = tier === "A" ? 7 + r() * 3 : tier === "B" ? 5 + r() * 3 : 2 + r() * 4;
    const citationsPerWeek = tier === "A" ? Math.floor(r() * 20 + 5) : tier === "B" ? Math.floor(r() * 8) : Math.floor(r() * 3);
    const hasCode = r() < 0.45;
    const hfDaily = tier === "A" ? r() < 0.25 : r() < 0.05;

    // Status distribution — most today unread
    let status: PaperStatus = "unread";
    if (daysAgo > 14) status = pick(STATUSES, hash(`st${i}`));
    else if (daysAgo > 3 && r() < 0.3) status = pick(["saved", "read", "must_read", "ignored"] as PaperStatus[], hash(`st2${i}`));

    // arxiv-like id
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = String(date.getUTCFullYear()).slice(-2);
    const arxivId = source === "arxiv" ? `${year}${month}.${String(10000 + (hash(`ax${i}`) % 89999)).slice(0, 5)}` : undefined;
    const doi = source !== "arxiv" ? `10.1${Math.floor(r() * 999) + 100}/${source}.${i}` : undefined;

    const tldr = makeTLDR(title, i * 31 + 7);

    const venue = source === "arxiv" ? "arXiv" : source === "nber" ? "NBER WP" : source === "cepr" ? "CEPR DP" : source === "fed" ? "FEDS Notes" : source === "ecb" ? "ECB WP Series" : source === "boe" ? "BoE Staff WP" : source === "bis" ? "BIS WP" : source === "imf" ? "IMF WP" : source === "openreview" ? "OpenReview" : "J. of Finance";

    papers.push({
      id: `p${i}`,
      arxivId,
      doi,
      title,
      authors,
      venue,
      source,
      date: date.toISOString(),
      tier,
      topics,
      relevance,
      citationsPerWeek,
      hasCode,
      hfDaily,
      trackedAuthor,
      abstractEN: makeAbstract(i * 53),
      tldrEN: tldr.en,
      tldrZH: tldr.zh,
      status,
      pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}` : `https://doi.org/${doi}`,
    });
  }
  // Sort newest first
  return papers.sort((a, b) => b.date.localeCompare(a.date));
}

export const PAPERS: Paper[] = generatePapers();
