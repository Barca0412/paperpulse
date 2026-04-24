import { create } from "zustand";
import type { Paper, PaperStatus } from "@/types";
import { PAPERS } from "@/mocks/papers";

export type GroupBy = "topic" | "institution" | "tier" | "source" | "flat";
export type SortBy = "relevance" | "date" | "citations";
export type TimeWindow = "today" | "week" | "month" | "all";

interface AppState {
  papers: Paper[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;

  // Feed controls
  timeWindow: TimeWindow;
  setTimeWindow: (v: TimeWindow) => void;
  groupBy: GroupBy;
  setGroupBy: (v: GroupBy) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;

  // Filters
  filters: {
    tiers: string[];
    sources: string[];
    minRelevance: number;
    status: PaperStatus | "all";
    topics: string[];
    institutions: string[];
  };
  setFilter: <K extends keyof AppState["filters"]>(k: K, v: AppState["filters"][K]) => void;
  resetFilters: () => void;

  // Selection
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;

  // Paper actions
  setStatus: (id: string, s: PaperStatus) => void;
}

const defaultFilters = {
  tiers: ["A", "B"],
  sources: ["arxiv", "nber", "cepr", "fed", "ecb", "boe", "bis", "imf", "openreview", "crossref"],
  minRelevance: 0,
  status: "all" as const,
  topics: [] as string[],
  institutions: [] as string[],
};

export const useStore = create<AppState>((set) => ({
  papers: PAPERS,
  darkMode: typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches,
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  commandOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),

  timeWindow: "today",
  setTimeWindow: (v) => set({ timeWindow: v }),
  groupBy: "topic",
  setGroupBy: (v) => set({ groupBy: v }),
  sortBy: "relevance",
  setSortBy: (v) => set({ sortBy: v }),

  filters: defaultFilters,
  setFilter: (k, v) =>
    set((s) => ({ filters: { ...s.filters, [k]: v } as AppState["filters"] })),
  resetFilters: () => set({ filters: defaultFilters }),

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
  expandedId: null,
  setExpandedId: (id) => set({ expandedId: id }),

  setStatus: (id, s) =>
    set((st) => ({
      papers: st.papers.map((p) => (p.id === id ? { ...p, status: s } : p)),
    })),
}));
