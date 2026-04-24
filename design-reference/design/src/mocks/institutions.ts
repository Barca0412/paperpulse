import type { Institution } from "@/types";

export const INSTITUTIONS: Institution[] = [
  { id: "bloomberg", rorId: "03pvr2x14", name: "Bloomberg LP", short: "Bloomberg", country: "USA", flag: "🇺🇸", type: "big_tech", whitelisted: true, paper30d: 23, rankDelta: 2, lat: 40.76, lng: -73.97 },
  { id: "stanford", rorId: "00f54p054", name: "Stanford University", short: "Stanford", country: "USA", flag: "🇺🇸", type: "university", whitelisted: true, paper30d: 41, rankDelta: 0, lat: 37.42, lng: -122.16 },
  { id: "mit", rorId: "042nb2s44", name: "Massachusetts Institute of Technology", short: "MIT", country: "USA", flag: "🇺🇸", type: "university", whitelisted: true, paper30d: 38, rankDelta: 1, lat: 42.36, lng: -71.09 },
  { id: "cmu", rorId: "05x2bcf33", name: "Carnegie Mellon University", short: "CMU", country: "USA", flag: "🇺🇸", type: "university", whitelisted: true, paper30d: 27, rankDelta: -1 },
  { id: "tsinghua", rorId: "03cve4549", name: "Tsinghua University", short: "Tsinghua", country: "China", flag: "🇨🇳", type: "university", whitelisted: true, paper30d: 29, rankDelta: 3 },
  { id: "pku", rorId: "02v51f717", name: "Peking University", short: "PKU", country: "China", flag: "🇨🇳", type: "university", whitelisted: true, paper30d: 22, rankDelta: 1 },
  { id: "hku", rorId: "02zhqgq86", name: "The University of Hong Kong", short: "HKU", country: "Hong Kong", flag: "🇭🇰", type: "university", whitelisted: true, paper30d: 14, rankDelta: 0 },
  { id: "lse", rorId: "0090zs177", name: "London School of Economics", short: "LSE", country: "UK", flag: "🇬🇧", type: "university", whitelisted: true, paper30d: 11, rankDelta: -2 },
  { id: "oxford", rorId: "052gg0110", name: "University of Oxford", short: "Oxford", country: "UK", flag: "🇬🇧", type: "university", whitelisted: true, paper30d: 17, rankDelta: 0 },
  { id: "ant", rorId: "00s7x9m11", name: "Ant Group", short: "Ant", country: "China", flag: "🇨🇳", type: "big_tech", whitelisted: true, paper30d: 15, rankDelta: 4 },
  { id: "jpm", rorId: "04ebmn122", name: "JPMorgan Chase AI Research", short: "JPM", country: "USA", flag: "🇺🇸", type: "bank", whitelisted: true, paper30d: 18, rankDelta: 1 },
  { id: "gs", rorId: "gs00001", name: "Goldman Sachs", short: "Goldman", country: "USA", flag: "🇺🇸", type: "bank", whitelisted: false, paper30d: 4, rankDelta: 0 },
  { id: "citadel", rorId: "citadel1", name: "Citadel", short: "Citadel", country: "USA", flag: "🇺🇸", type: "buy_side", whitelisted: true, paper30d: 3, rankDelta: 0 },
  { id: "twosigma", rorId: "twosig1", name: "Two Sigma", short: "Two Sigma", country: "USA", flag: "🇺🇸", type: "buy_side", whitelisted: true, paper30d: 6, rankDelta: 2 },
  { id: "deepmind", rorId: "00njsd438", name: "Google DeepMind", short: "DeepMind", country: "UK", flag: "🇬🇧", type: "big_tech", whitelisted: true, paper30d: 34, rankDelta: 0 },
  { id: "openai", rorId: "openai01", name: "OpenAI", short: "OpenAI", country: "USA", flag: "🇺🇸", type: "big_tech", whitelisted: true, paper30d: 12, rankDelta: -1 },
  { id: "anthropic", rorId: "anthropic1", name: "Anthropic", short: "Anthropic", country: "USA", flag: "🇺🇸", type: "big_tech", whitelisted: true, paper30d: 9, rankDelta: 2 },
  { id: "microsoft", rorId: "00d0nc645", name: "Microsoft Research", short: "MSR", country: "USA", flag: "🇺🇸", type: "big_tech", whitelisted: true, paper30d: 21, rankDelta: 0 },
  { id: "meta", rorId: "04dg87t97", name: "Meta AI (FAIR)", short: "Meta", country: "USA", flag: "🇺🇸", type: "big_tech", whitelisted: true, paper30d: 19, rankDelta: 1 },
  { id: "nber", rorId: "013kt2c29", name: "NBER", short: "NBER", country: "USA", flag: "🇺🇸", type: "think_tank", whitelisted: true, paper30d: 32, rankDelta: 0 },
  { id: "fed", rorId: "03mesm933", name: "Federal Reserve Board", short: "Fed", country: "USA", flag: "🇺🇸", type: "central_bank", whitelisted: true, paper30d: 16, rankDelta: 0 },
  { id: "ecb", rorId: "01k5qnb77", name: "European Central Bank", short: "ECB", country: "EU", flag: "🇪🇺", type: "central_bank", whitelisted: true, paper30d: 12, rankDelta: 1 },
  { id: "boe", rorId: "boe00001", name: "Bank of England", short: "BoE", country: "UK", flag: "🇬🇧", type: "central_bank", whitelisted: true, paper30d: 8, rankDelta: 0 },
  { id: "bis", rorId: "bis00001", name: "Bank for International Settlements", short: "BIS", country: "Switzerland", flag: "🇨🇭", type: "central_bank", whitelisted: true, paper30d: 7, rankDelta: -1 },
  { id: "imf", rorId: "imf00001", name: "IMF", short: "IMF", country: "USA", flag: "🇺🇸", type: "gov", whitelisted: true, paper30d: 11, rankDelta: 0 },
  { id: "chicago", rorId: "024mw5h28", name: "University of Chicago", short: "Chicago", country: "USA", flag: "🇺🇸", type: "university", whitelisted: true, paper30d: 13, rankDelta: 0 },
  { id: "columbia", rorId: "00hj8s172", name: "Columbia University", short: "Columbia", country: "USA", flag: "🇺🇸", type: "university", whitelisted: true, paper30d: 15, rankDelta: 0 },
  { id: "nyu", rorId: "0190ak572", name: "NYU Stern", short: "NYU", country: "USA", flag: "🇺🇸", type: "university", whitelisted: true, paper30d: 14, rankDelta: -1 },
  { id: "hkust", rorId: "00q4vv597", name: "HKUST", short: "HKUST", country: "Hong Kong", flag: "🇭🇰", type: "university", whitelisted: true, paper30d: 10, rankDelta: 1 },
  { id: "cepr", rorId: "cepr0001", name: "CEPR", short: "CEPR", country: "UK", flag: "🇬🇧", type: "think_tank", whitelisted: true, paper30d: 18, rankDelta: 0 },
];

export const INST_BY_ID: Record<string, Institution> = Object.fromEntries(
  INSTITUTIONS.map((i) => [i.id, i]),
);
