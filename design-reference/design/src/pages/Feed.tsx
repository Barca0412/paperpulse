import { useMemo, useState, useEffect } from "react";
import { useStore, type TierFilter, type StatusFilter } from "@/stores/app";
import { useSearchParams } from "react-router-dom";
import { PaperCard } from "@/components/paper/PaperCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TOPICS, TOPIC_BY_SLUG } from "@/mocks/topics";
import { INSTITUTIONS } from "@/mocks/institutions";
import {
  Search, ChevronDown, Flame, Code2, UserCheck, Calendar, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "date_desc" | "relevance" | "tier";

export default function Feed() {
  const papers = useStore((s) => s.papers);
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const resetFilters = useStore((s) => s.resetFilters);
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(searchParams.get("p"));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const ids = visible.map((p) => p.id);
        const idx = selected ? ids.indexOf(selected) : -1;
        const next = e.key === "j" ? Math.min(idx + 1, ids.length - 1) : Math.max(idx - 1, 0);
        if (ids[next]) setSelected(ids[next]);
      }
      if (e.key === "o" && selected) {
        setExpanded((s) => {
          const n = new Set(s);
          n.has(selected) ? n.delete(selected) : n.add(selected);
          return n;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const visible = useMemo(() => {
    let out = papers.slice();
    if (filters.tier.length) out = out.filter((p) => filters.tier.includes(p.tier));
    if (filters.status.length) out = out.filter((p) => filters.status.includes(p.status));
    if (filters.topics.length) out = out.filter((p) => p.topics.some((t) => filters.topics.includes(t)));
    if (filters.institutions.length) out = out.filter((p) => p.authors.some((a) => filters.institutions.includes(a.institutionId)));
    if (filters.hasCode) out = out.filter((p) => p.hasCode);
    if (filters.hfDaily) out = out.filter((p) => p.hfDaily);
    if (filters.trackedAuthor) out = out.filter((p) => p.trackedAuthor);
    if (filters.relevanceMin > 0) out = out.filter((p) => p.relevance >= filters.relevanceMin);
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase();
      out = out.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tldrEN.toLowerCase().includes(q) ||
          p.authors.some((a) => a.name.toLowerCase().includes(q)),
      );
    }
    if (sort === "relevance") out.sort((a, b) => b.relevance - a.relevance);
    else if (sort === "tier") out.sort((a, b) => a.tier.localeCompare(b.tier) || b.relevance - a.relevance);
    else out.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [papers, filters, sort]);

  // Group by date for rails
  const byDate = useMemo(() => {
    const g: Record<string, typeof papers> = {};
    for (const p of visible) {
      const d = p.date.slice(0, 10);
      (g[d] ||= []).push(p);
    }
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  const dateHeader = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
    if (diff === 0) return `Today · ${d}`;
    if (diff === 1) return `Yesterday · ${d}`;
    if (diff < 7) return `${diff} days ago · ${d}`;
    return new Date(d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  };

  const activeFilterCount =
    filters.tier.length + filters.status.length + filters.topics.length + filters.institutions.length +
    (filters.hasCode ? 1 : 0) + (filters.hfDaily ? 1 : 0) + (filters.trackedAuthor ? 1 : 0) +
    (filters.relevanceMin > 0 ? 1 : 0);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Filter rail */}
      <aside className="w-60 shrink-0 border-r overflow-hidden flex flex-col">
        <div className="px-3 py-3 border-b flex items-center gap-2">
          <h3 className="text-xs font-semibold">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{activeFilterCount}</Badge>
          )}
          {activeFilterCount > 0 && (
            <Button size="sm" variant="ghost" className="ml-auto h-6 text-[10px]" onClick={resetFilters}>
              Clear
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            <Section title="Tier">
              <div className="flex gap-1">
                {(["A", "B", "C"] as TierFilter[]).map((t) => {
                  const on = filters.tier.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        setFilter("tier", on ? filters.tier.filter((x) => x !== t) : [...filters.tier, t])
                      }
                      className={cn(
                        "h-7 flex-1 rounded border text-xs font-mono transition-colors",
                        on ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-accent",
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Status">
              <div className="space-y-1">
                {(["unread", "saved", "must_read", "ignored"] as StatusFilter[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={filters.status.includes(s)}
                      onCheckedChange={() =>
                        setFilter("status", filters.status.includes(s) ? filters.status.filter((x) => x !== s) : [...filters.status, s])
                      }
                    />
                    <span className="capitalize">{s.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Relevance ≥">
              <div className="flex items-center gap-2 pt-1">
                <Slider
                  min={0} max={10} step={0.1}
                  value={[filters.relevanceMin]}
                  onValueChange={(v) => setFilter("relevanceMin", v[0])}
                />
                <span className="font-mono text-xs w-8 text-right">{filters.relevanceMin.toFixed(1)}</span>
              </div>
            </Section>

            <Section title="Signals">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-xs"><Checkbox checked={filters.hfDaily} onCheckedChange={(v) => setFilter("hfDaily", !!v)} /> <Flame className="h-3 w-3 text-orange-500" /> HF Daily</label>
                <label className="flex items-center gap-2 text-xs"><Checkbox checked={filters.hasCode} onCheckedChange={(v) => setFilter("hasCode", !!v)} /> <Code2 className="h-3 w-3 text-emerald-500" /> Has code</label>
                <label className="flex items-center gap-2 text-xs"><Checkbox checked={filters.trackedAuthor} onCheckedChange={(v) => setFilter("trackedAuthor", !!v)} /> <UserCheck className="h-3 w-3 text-yellow-500" /> Tracked author</label>
              </div>
            </Section>

            <TopicsFilter />
            <InstitutionsFilter />
          </div>
        </ScrollArea>
      </aside>

      {/* Feed list */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b flex items-center gap-3 bg-background/80 backdrop-blur sticky top-0">
          <div className="relative w-96">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
            <Input
              value={filters.query}
              onChange={(e) => setFilter("query", e.target.value)}
              placeholder="Search title, TL;DR, author…  (⌘K for global)"
              className="h-8 pl-7 text-xs"
            />
            {filters.query && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setFilter("query", "")}>
                <X className="h-3 w-3 opacity-50" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quick:</span>
            {[
              { label: "Today", fn: () => setFilter("query", "") },
              { label: "Must read", fn: () => setFilter("status", ["must_read"]) },
              { label: "Tier A", fn: () => setFilter("tier", ["A"]) },
              { label: "With code", fn: () => setFilter("hasCode", true) },
            ].map((p) => (
              <Button key={p.label} size="sm" variant="outline" className="h-7 text-[11px]" onClick={p.fn}>
                {p.label}
              </Button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest first</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="tier">Tier</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground font-mono">{visible.length} papers</span>
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1">
          {byDate.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Search className="h-5 w-5 opacity-50" />
              </div>
              <h3 className="font-semibold">No papers match your filters</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Try loosening a filter, or <button className="underline" onClick={resetFilters}>clear all</button>.
              </p>
            </div>
          ) : (
            <div className="px-6 py-4">
              {byDate.map(([date, ps]) => (
                <div key={date} className="mb-6">
                  <div className="flex items-baseline gap-3 mb-2 pt-1 sticky top-0 bg-background z-[1] py-1">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {dateHeader(date)}
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-mono">{ps.length} papers</span>
                  </div>
                  <div className="space-y-2">
                    {ps.map((p) => (
                      <PaperCard
                        key={p.id}
                        paper={p}
                        selected={selected === p.id}
                        expanded={expanded.has(p.id)}
                        onSelect={() => setSelected(p.id)}
                        onToggleExpand={() => setExpanded((s) => {
                          const n = new Set(s);
                          n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                          return n;
                        })}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="text-center py-6 text-xs text-muted-foreground">
                <kbd className="font-mono">j/k</kbd> to navigate · <kbd className="font-mono">o</kbd> to open · <kbd className="font-mono">s</kbd> to save
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function TopicsFilter() {
  const { filters, setFilter } = useStore();
  const [open, setOpen] = useState(true);
  const shown = TOPICS.slice(0, 10);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-full mb-1.5">
        Topics <ChevronDown className={cn("h-3 w-3 transition", open && "rotate-180")} />
        {filters.topics.length > 0 && <Badge variant="secondary" className="h-4 text-[9px] px-1 ml-auto">{filters.topics.length}</Badge>}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-wrap gap-1">
          {shown.map((t) => {
            const on = filters.topics.includes(t.slug);
            return (
              <button
                key={t.slug}
                onClick={() => setFilter("topics", on ? filters.topics.filter((x) => x !== t.slug) : [...filters.topics, t.slug])}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full border transition-colors",
                  on ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-accent",
                )}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function InstitutionsFilter() {
  const { filters, setFilter } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-full mb-1.5">
        Institutions <ChevronDown className={cn("h-3 w-3 transition", open && "rotate-180")} />
        {filters.institutions.length > 0 && <Badge variant="secondary" className="h-4 text-[9px] px-1 ml-auto">{filters.institutions.length}</Badge>}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {INSTITUTIONS.slice(0, 15).map((i) => {
            const on = filters.institutions.includes(i.id);
            return (
              <label key={i.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                <Checkbox
                  checked={on}
                  onCheckedChange={() => setFilter("institutions", on ? filters.institutions.filter((x) => x !== i.id) : [...filters.institutions, i.id])}
                />
                <span className="flex-1 truncate">{i.flag} {i.short}</span>
                {i.whitelisted && <Badge variant="tierA" className="text-[9px]">W</Badge>}
              </label>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
