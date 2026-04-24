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
