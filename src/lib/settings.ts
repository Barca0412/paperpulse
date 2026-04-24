const BASE =
  (import.meta as unknown as { env: { VITE_BACKEND_URL?: string } }).env
    .VITE_BACKEND_URL ?? "http://127.0.0.1:8765";

export interface KeywordsPayload {
  positive: { cs_core: string[]; finance_core: string[]; crosscut: string[] };
  strong_negative: string[];
  weak_negative: string[];
  immune: string[];
}

export async function getKeywords(): Promise<KeywordsPayload> {
  const r = await fetch(`${BASE}/api/v1/settings/keywords`);
  if (!r.ok) throw new Error(`getKeywords ${r.status} ${await r.text()}`);
  return (await r.json()) as KeywordsPayload;
}

export async function saveKeywords(p: KeywordsPayload): Promise<KeywordsPayload> {
  const r = await fetch(`${BASE}/api/v1/settings/keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw new Error(`saveKeywords ${r.status} ${await r.text()}`);
  return (await r.json()) as KeywordsPayload;
}

export interface SeedPaper {
  id: string | null;
  title: string;
  abstract: string | null;
  doi: string | null;
  arxiv_id: string | null;
  base_weight: number;
  half_life_days: number | null;
  added_at: string | null;
}

export interface SeedsPayload {
  seed_papers: SeedPaper[];
  user_must_read_papers: SeedPaper[];
  seed_meta: Record<string, unknown>;
}

export async function getSeeds(): Promise<SeedsPayload> {
  const r = await fetch(`${BASE}/api/v1/settings/seeds`);
  if (!r.ok) throw new Error(`getSeeds ${r.status} ${await r.text()}`);
  const body = (await r.json()) as Partial<SeedsPayload>;
  return {
    seed_papers: body.seed_papers ?? [],
    user_must_read_papers: body.user_must_read_papers ?? [],
    seed_meta: body.seed_meta ?? {},
  };
}

export async function saveSeeds(p: SeedsPayload): Promise<SeedsPayload> {
  const r = await fetch(`${BASE}/api/v1/settings/seeds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw new Error(`saveSeeds ${r.status} ${await r.text()}`);
  const body = (await r.json()) as Partial<SeedsPayload>;
  return {
    seed_papers: body.seed_papers ?? [],
    user_must_read_papers: body.user_must_read_papers ?? [],
    seed_meta: body.seed_meta ?? {},
  };
}

export interface Topic {
  name: string;
  slug: string;
  side: "cs" | "finance" | "crosscut";
  description_en: string;
  description_zh: string;
  weight: number;
  color: string | null;
}

export interface TopicsPayload {
  topics: Topic[];
}

export async function getTopics(): Promise<TopicsPayload> {
  const r = await fetch(`${BASE}/api/v1/settings/topics`);
  if (!r.ok) throw new Error(`getTopics ${r.status} ${await r.text()}`);
  const body = (await r.json()) as Partial<TopicsPayload>;
  return { topics: body.topics ?? [] };
}

export async function saveTopics(p: TopicsPayload): Promise<TopicsPayload> {
  const r = await fetch(`${BASE}/api/v1/settings/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw new Error(`saveTopics ${r.status} ${await r.text()}`);
  const body = (await r.json()) as Partial<TopicsPayload>;
  return { topics: body.topics ?? [] };
}

export interface TiersPayload {
  tier_rules: {
    A: { venues: string[]; auto_include?: boolean };
    B_score: { weights: Record<string, number>; threshold: number };
    C?: Record<string, unknown>;
  };
}

export async function getTiers(): Promise<TiersPayload> {
  const r = await fetch(`${BASE}/api/v1/settings/tiers`);
  if (!r.ok) throw new Error(`getTiers ${r.status} ${await r.text()}`);
  const body = (await r.json()) as Partial<TiersPayload>;
  return {
    tier_rules: body.tier_rules ?? {
      A: { venues: [], auto_include: true },
      B_score: { weights: {}, threshold: 0.5 },
      C: {},
    },
  };
}

export async function saveTiers(p: TiersPayload): Promise<TiersPayload> {
  const r = await fetch(`${BASE}/api/v1/settings/tiers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!r.ok) throw new Error(`saveTiers ${r.status} ${await r.text()}`);
  const body = (await r.json()) as Partial<TiersPayload>;
  return {
    tier_rules: body.tier_rules ?? p.tier_rules,
  };
}

export interface SimulateResult {
  total: number;
  tier_a: number;
  tier_b: number;
  tier_c: number;
}

export async function simulateTiers(
  A_venues: string[],
  B_weights: Record<string, number>,
  B_threshold: number,
): Promise<SimulateResult> {
  const r = await fetch(`${BASE}/api/v1/settings/tiers/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ A_venues, B_weights, B_threshold }),
  });
  if (!r.ok) throw new Error(`simulateTiers ${r.status} ${await r.text()}`);
  return (await r.json()) as SimulateResult;
}
