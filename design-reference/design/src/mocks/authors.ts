import type { Author } from "@/types";

export const AUTHORS: Author[] = [
  { id: "a1", name: "Bryan Kelly", institutionId: "chicago", hIndex: 48, paper30d: 3, tracked: true, topicMix: [{ topic: "ml_asset_pricing", pct: 60 }, { topic: "macro_ml", pct: 25 }, { topic: "rl_trading", pct: 15 }] },
  { id: "a2", name: "Dacheng Xiu", institutionId: "chicago", hIndex: 41, paper30d: 2, tracked: true, topicMix: [{ topic: "ml_asset_pricing", pct: 70 }, { topic: "macro_ml", pct: 30 }] },
  { id: "a3", name: "Stefan Nagel", institutionId: "chicago", hIndex: 52, paper30d: 1, tracked: false, topicMix: [{ topic: "ml_asset_pricing", pct: 80 }, { topic: "risk_regulation", pct: 20 }] },
  { id: "a4", name: "Markus Pelger", institutionId: "stanford", hIndex: 27, paper30d: 2, tracked: true, topicMix: [{ topic: "ml_asset_pricing", pct: 90 }, { topic: "foundation_models", pct: 10 }] },
  { id: "a5", name: "Jian Liu", institutionId: "bloomberg", hIndex: 18, paper30d: 4, tracked: true, topicMix: [{ topic: "llm_for_finance", pct: 70 }, { topic: "rl_trading", pct: 30 }] },
  { id: "a6", name: "Alice Wang", institutionId: "stanford", hIndex: 22, paper30d: 2, tracked: false, topicMix: [{ topic: "llm_for_finance", pct: 50 }, { topic: "foundation_models", pct: 50 }] },
  { id: "a7", name: "Bob Chen", institutionId: "bloomberg", hIndex: 15, paper30d: 3, tracked: false, topicMix: [{ topic: "llm_for_finance", pct: 100 }] },
  { id: "a8", name: "Xiaoyan Zhang", institutionId: "tsinghua", hIndex: 33, paper30d: 2, tracked: true, topicMix: [{ topic: "ml_asset_pricing", pct: 60 }, { topic: "market_microstructure", pct: 40 }] },
  { id: "a9", name: "Wei Xiong", institutionId: "pku", hIndex: 45, paper30d: 1, tracked: false, topicMix: [{ topic: "market_microstructure", pct: 70 }, { topic: "risk_regulation", pct: 30 }] },
  { id: "a10", name: "Shihao Gu", institutionId: "cmu", hIndex: 14, paper30d: 3, tracked: true, topicMix: [{ topic: "ml_asset_pricing", pct: 80 }, { topic: "rl_trading", pct: 20 }] },
  { id: "a11", name: "Yong Liu", institutionId: "ant", hIndex: 21, paper30d: 3, tracked: true, topicMix: [{ topic: "llm_for_finance", pct: 50 }, { topic: "agent_simulation", pct: 50 }] },
  { id: "a12", name: "Priya Natarajan", institutionId: "jpm", hIndex: 17, paper30d: 2, tracked: false, topicMix: [{ topic: "llm_for_finance", pct: 60 }, { topic: "rl_trading", pct: 40 }] },
  { id: "a13", name: "Sanjeev Arora", institutionId: "stanford", hIndex: 72, paper30d: 1, tracked: false, topicMix: [{ topic: "foundation_models", pct: 80 }, { topic: "alignment", pct: 20 }] },
  { id: "a14", name: "Percy Liang", institutionId: "stanford", hIndex: 65, paper30d: 2, tracked: true, topicMix: [{ topic: "foundation_models", pct: 50 }, { topic: "alignment", pct: 50 }] },
  { id: "a15", name: "Chris Olah", institutionId: "anthropic", hIndex: 31, paper30d: 1, tracked: true, topicMix: [{ topic: "mech_interp", pct: 100 }] },
  { id: "a16", name: "Neel Nanda", institutionId: "deepmind", hIndex: 24, paper30d: 2, tracked: true, topicMix: [{ topic: "mech_interp", pct: 80 }, { topic: "alignment", pct: 20 }] },
  { id: "a17", name: "John Cochrane", institutionId: "stanford", hIndex: 78, paper30d: 1, tracked: false, topicMix: [{ topic: "ml_asset_pricing", pct: 70 }, { topic: "risk_regulation", pct: 30 }] },
  { id: "a18", name: "Markus Brunnermeier", institutionId: "columbia", hIndex: 61, paper30d: 2, tracked: false, topicMix: [{ topic: "risk_regulation", pct: 60 }, { topic: "stablecoins", pct: 40 }] },
  { id: "a19", name: "Emmanuel Farhi", institutionId: "mit", hIndex: 55, paper30d: 1, tracked: false, topicMix: [{ topic: "macro_ml", pct: 70 }, { topic: "stablecoins", pct: 30 }] },
  { id: "a20", name: "Lars Hansen", institutionId: "chicago", hIndex: 82, paper30d: 1, tracked: false, topicMix: [{ topic: "ml_asset_pricing", pct: 100 }] },
  { id: "a21", name: "Rama Cont", institutionId: "oxford", hIndex: 45, paper30d: 2, tracked: true, topicMix: [{ topic: "market_microstructure", pct: 80 }, { topic: "risk_regulation", pct: 20 }] },
  { id: "a22", name: "Eric Jondeau", institutionId: "lse", hIndex: 29, paper30d: 1, tracked: false, topicMix: [{ topic: "risk_regulation", pct: 100 }] },
  { id: "a23", name: "Amy Wang", institutionId: "tsinghua", hIndex: 12, paper30d: 3, tracked: false, topicMix: [{ topic: "llm_for_finance", pct: 100 }] },
  { id: "a24", name: "David Silver", institutionId: "deepmind", hIndex: 68, paper30d: 2, tracked: false, topicMix: [{ topic: "rl_trading", pct: 50 }, { topic: "foundation_models", pct: 50 }] },
  { id: "a25", name: "Raj Rajkumar", institutionId: "cmu", hIndex: 33, paper30d: 2, tracked: false, topicMix: [{ topic: "agent_simulation", pct: 100 }] },
  { id: "a26", name: "Emily Zhou", institutionId: "hku", hIndex: 18, paper30d: 2, tracked: true, topicMix: [{ topic: "climate_finance", pct: 70 }, { topic: "risk_regulation", pct: 30 }] },
  { id: "a27", name: "Mark Carney", institutionId: "boe", hIndex: 22, paper30d: 0, tracked: false, topicMix: [{ topic: "climate_finance", pct: 60 }, { topic: "risk_regulation", pct: 40 }] },
  { id: "a28", name: "Hyun Song Shin", institutionId: "bis", hIndex: 51, paper30d: 2, tracked: true, topicMix: [{ topic: "stablecoins", pct: 50 }, { topic: "risk_regulation", pct: 50 }] },
  { id: "a29", name: "Markus Leippold", institutionId: "lse", hIndex: 27, paper30d: 1, tracked: false, topicMix: [{ topic: "climate_finance", pct: 100 }] },
  { id: "a30", name: "Zhenyu Wang", institutionId: "hkust", hIndex: 25, paper30d: 2, tracked: false, topicMix: [{ topic: "ml_asset_pricing", pct: 60 }, { topic: "macro_ml", pct: 40 }] },
];

export const AUTHOR_BY_ID: Record<string, Author> = Object.fromEntries(
  AUTHORS.map((a) => [a.id, a]),
);
