import type { Topic } from "@/types";

export const TOPICS: Topic[] = [
  { slug: "llm_for_finance", name: "LLM Agents for Finance", side: "crosscut", color: "teal", descEN: "Multi-agent LLM systems for trading, analysis, and decision support.", descZH: "用于交易、分析与决策支持的多智能体大模型系统。", weight: 1.2 },
  { slug: "rl_trading", name: "RL for Trading", side: "crosscut", color: "teal", descEN: "Reinforcement learning for execution, market making, and portfolios.", descZH: "用于执行、做市与组合管理的强化学习。", weight: 1.1 },
  { slug: "ml_asset_pricing", name: "ML for Asset Pricing", side: "finance", color: "amber", descEN: "Machine learning in empirical asset pricing and return prediction.", descZH: "机器学习在实证资产定价与收益预测中的应用。", weight: 1.0 },
  { slug: "agent_simulation", name: "Agent-Based Simulation", side: "crosscut", color: "teal", descEN: "Heterogeneous agent markets, ABM for systemic risk.", descZH: "异质主体市场与用于系统性风险的 ABM。", weight: 0.9 },
  { slug: "foundation_models", name: "Foundation Models", side: "cs", color: "violet", descEN: "Pretraining, scaling, and evaluation of foundation models.", descZH: "基础模型的预训练、缩放与评测。", weight: 0.8 },
  { slug: "alignment", name: "Alignment & Safety", side: "cs", color: "violet", descEN: "RLHF, DPO, constitutional AI, and safety evals.", descZH: "RLHF、DPO、宪法 AI 与安全评测。", weight: 0.7 },
  { slug: "mech_interp", name: "Mechanistic Interpretability", side: "cs", color: "violet", descEN: "Circuits, features, SAEs.", descZH: "电路、特征与稀疏自编码器。", weight: 0.6 },
  { slug: "market_microstructure", name: "Market Microstructure", side: "finance", color: "amber", descEN: "Limit order books, HFT, price impact.", descZH: "限价订单簿、高频交易与价格冲击。", weight: 0.9 },
  { slug: "risk_regulation", name: "Risk & Regulation", side: "finance", color: "amber", descEN: "Bank capital, stress testing, macroprudential policy.", descZH: "银行资本、压力测试与宏观审慎政策。", weight: 0.7 },
  { slug: "climate_finance", name: "Climate Finance", side: "finance", color: "amber", descEN: "Transition risk, green assets, carbon pricing.", descZH: "转型风险、绿色资产与碳定价。", weight: 0.6 },
  { slug: "stablecoins", name: "Stablecoins & CBDC", side: "finance", color: "amber", descEN: "Monetary design of crypto and CBDCs.", descZH: "加密与央行数字货币的货币设计。", weight: 0.7 },
  { slug: "macro_ml", name: "Macro Forecasting", side: "crosscut", color: "teal", descEN: "Nowcasting and macro forecasting with ML.", descZH: "用机器学习做即时预测与宏观预测。", weight: 0.8 },
];

export const TOPIC_BY_SLUG: Record<string, Topic> = Object.fromEntries(
  TOPICS.map((t) => [t.slug, t]),
);
