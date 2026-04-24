// Mirrors backend Pydantic schema in backend/paperpulse/api/feed.py.
// When backend grows fields, update both sides — types live in spec §6.1.

export type Tier = "A" | "B" | "C";
export type PaperStatus = "unread" | "read" | "saved" | "must_read" | "ignored";

export type PaperAuthor = {
  name: string;
  author_id?: string;
  affiliation_ids?: string[];
  is_first?: boolean;
  is_last?: boolean;
  is_corresponding?: boolean;
};

export type Paper = {
  id: string;
  source: string;
  arxiv_id: string | null;
  doi: string | null;
  title: string;
  abstract: string | null;
  authors: PaperAuthor[];
  published_at: string | null;
  pdf_url: string | null;
  html_url: string | null;
  tier: Tier | null;
  primary_topic: string | null;
  relevance_score: number | null;
  tldr_en: string | null;
  tldr_zh: string | null;
  user_status: PaperStatus;
};

export type GroupBy = "flat" | "topic" | "tier" | "source" | "institution";
export type SortKey = "date" | "relevance" | "citations";
export type TimeWindow = "today" | "week" | "month" | "all";

export type FeedGroup = {
  label: string;
  label_type: string;
  count: number;
  papers: Paper[];
};

export type FeedResponse =
  | { total: number; group_by: "flat"; papers: Paper[] }
  | { total: number; group_by: Exclude<GroupBy, "flat">; groups: FeedGroup[] };

export type FeedQuery = {
  limit?: number;
  group_by?: GroupBy;
  time_window?: TimeWindow;
  sort?: SortKey;
  tier?: string[];
  source?: string[];
  topic?: string[];
};

export type IngestResponse = { queued: string[] };

export type HealthResponse = { status: string; version: string };

export type Institution = {
  id: string;
  name: string;
  country_code: string | null;
  city: string | null;
  type: string | null;
  ror_id: string | null;
  in_whitelist: boolean;
  paper_count_30d: number;
  paper_count_total: number;
};

export type Author = {
  id: string;
  name: string;
  openalex_id: string | null;
  orcid: string | null;
  is_tracked: boolean;
  paper_count_30d: number;
  paper_count_total: number;
};
