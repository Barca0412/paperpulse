import type {
  Author,
  FeedQuery,
  FeedResponse,
  HealthResponse,
  IngestResponse,
  Institution,
} from "./types";

const BASE =
  (import.meta as unknown as { env: { VITE_BACKEND_URL?: string } }).env
    .VITE_BACKEND_URL ?? "http://127.0.0.1:8765";

async function jget<T>(path: string): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`${path} → ${resp.status} ${await resp.text()}`);
  return (await resp.json()) as T;
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`${path} → ${resp.status} ${await resp.text()}`);
  return (await resp.json()) as T;
}

function feedQuery(q: FeedQuery): string {
  const p = new URLSearchParams();
  if (q.limit !== undefined) p.set("limit", String(q.limit));
  if (q.group_by) p.set("group_by", q.group_by);
  if (q.time_window) p.set("time_window", q.time_window);
  if (q.sort) p.set("sort", q.sort);
  if (q.tier && q.tier.length) p.set("tier", q.tier.join(","));
  if (q.source && q.source.length) p.set("source", q.source.join(","));
  if (q.topic && q.topic.length) p.set("topic", q.topic.join(","));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const api = {
  health: () => jget<HealthResponse>("/api/v1/hello"),
  getFeed: (q: FeedQuery = {}) =>
    jget<FeedResponse>(`/api/v1/feed${feedQuery({ limit: 100, ...q })}`),
  runIngestNow: (sources?: string[]) =>
    jpost<IngestResponse>("/api/v1/settings/ingest/run-now", {
      sources: sources ?? null,
    }),
  getInstitutions: (windowDays = 30, limit = 50) =>
    jget<Institution[]>(
      `/api/v1/institutions?window_days=${windowDays}&limit=${limit}`,
    ),
  getAuthors: (windowDays = 30, limit = 100) =>
    jget<Author[]>(
      `/api/v1/authors?window_days=${windowDays}&limit=${limit}`,
    ),
};
