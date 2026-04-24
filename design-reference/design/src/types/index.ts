export type Tier = "A" | "B" | "C";
export type TopicSide = "cs" | "finance" | "crosscut";
export type PaperStatus = "unread" | "saved" | "must_read" | "read" | "ignored";
export type Source =
  | "arxiv"
  | "nber"
  | "cepr"
  | "fed"
  | "ecb"
  | "boe"
  | "bis"
  | "imf"
  | "openreview"
  | "crossref";

export interface Topic {
  slug: string;
  name: string;
  side: TopicSide;
  color: string;
  descEN: string;
  descZH: string;
  weight: number;
}

export interface Institution {
  id: string;
  rorId: string;
  name: string;
  short: string;
  country: string;
  flag: string;
  type:
    | "university"
    | "big_tech"
    | "bank"
    | "central_bank"
    | "buy_side"
    | "sell_side"
    | "gov"
    | "think_tank";
  whitelisted: boolean;
  paper30d: number;
  rankDelta: number;
  lat?: number;
  lng?: number;
}

export interface Author {
  id: string;
  name: string;
  institutionId: string;
  hIndex: number;
  paper30d: number;
  tracked: boolean;
  topicMix: { topic: string; pct: number }[];
}

export interface Paper {
  id: string;
  arxivId?: string;
  doi?: string;
  title: string;
  authors: { name: string; authorId?: string; institutionId: string }[];
  venue: string;
  source: Source;
  date: string; // ISO
  tier: Tier;
  topics: string[]; // slugs
  relevance: number; // 0-10
  citationsPerWeek: number;
  hasCode: boolean;
  hfDaily: boolean;
  trackedAuthor: boolean;
  abstractEN: string;
  tldrEN: string;
  tldrZH: string;
  status: PaperStatus;
  pdfUrl?: string;
  notes?: string;
}

export interface Conference {
  id: string;
  name: string;
  year: number;
  location: string;
  startDate: string;
  endDate: string;
  abstractDeadline?: string;
  paperDeadline: string;
  authorResponse?: string;
  decision?: string;
  topics: string[];
  url: string;
  verification: "verified" | "needs_review" | "single_source" | "manual";
  sourcesAgreeing: number;
  relatedPapers: number;
}

export interface Digest {
  id: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  title: string;
  markdown: string;
  topPapers: string[]; // paper ids
}
