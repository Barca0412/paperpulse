import { useState } from "react";
import { useFeed } from "@/hooks/useFeed";
import { api } from "@/lib/api";
import { openExternal } from "@/lib/open-url";
import type {
  GroupBy,
  Paper,
  SortKey,
  TimeWindow,
  FeedGroup,
} from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

function PaperRow({ p }: { p: Paper }) {
  return (
    <li className="rounded border p-3 hover:bg-accent/30">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          {p.source}
        </span>
        {p.published_at && (
          <span className="text-[10px] text-muted-foreground">
            {p.published_at.slice(0, 10)}
          </span>
        )}
        {p.tier && (
          <Badge
            variant={p.tier === "A" ? "default" : "secondary"}
            className="text-[9px] h-4 px-1.5"
          >
            {p.tier}
          </Badge>
        )}
        {p.primary_topic && (
          <span className="text-[10px] text-muted-foreground">
            · {p.primary_topic}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium leading-snug mt-1">{p.title}</h3>
      {p.authors.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {p.authors
            .slice(0, 3)
            .map((a) => a.name)
            .join(", ")}
          {p.authors.length > 3 && ` et al. (${p.authors.length})`}
        </p>
      )}
      {p.abstract && (
        <p className="text-xs mt-2 line-clamp-2 text-muted-foreground">
          {p.abstract}
        </p>
      )}
      <div className="mt-2 flex gap-2 text-[10px]">
        {p.html_url && (
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => openExternal(p.html_url!)}
          >
            HTML
          </button>
        )}
        {p.pdf_url && (
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => openExternal(p.pdf_url!)}
          >
            PDF
          </button>
        )}
      </div>
    </li>
  );
}

function GroupSection({ g }: { g: FeedGroup }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left py-1 group"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <h2 className="text-sm font-semibold">{g.label}</h2>
        <span className="text-[10px] text-muted-foreground">({g.count})</span>
      </button>
      {open && (
        <ul className="space-y-2 mt-2">
          {g.papers.map((p) => (
            <PaperRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Feed() {
  const [groupBy, setGroupBy] = useState<GroupBy>("flat");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("all");
  const [sort, setSort] = useState<SortKey>("date");

  const { state, reload } = useFeed({
    group_by: groupBy,
    time_window: timeWindow,
    sort,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onRunIngest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.runIngestNow();
      setMsg(
        r.queued.length
          ? `Queued ${r.queued.join(", ")} — refresh in ~30s.`
          : "No sources enabled. Edit config/sources.yml to enable arxiv / nber.",
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">Feed</h1>
        <span className="text-xs text-muted-foreground">
          {state.kind === "ok" ? `${state.data.total} papers` : ""}
        </span>

        <div className="flex items-center gap-2 ml-4">
          <Select
            value={timeWindow}
            onValueChange={(v) => setTimeWindow(v as TimeWindow)}
          >
            <SelectTrigger className="h-7 text-xs w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as GroupBy)}
          >
            <SelectTrigger className="h-7 text-xs w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat</SelectItem>
              <SelectItem value="topic">Group: topic</SelectItem>
              <SelectItem value="tier">Group: tier</SelectItem>
              <SelectItem value="source">Group: source</SelectItem>
              <SelectItem value="institution">Group: institution</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-7 text-xs w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort: date</SelectItem>
              <SelectItem value="relevance">Sort: relevance</SelectItem>
              <SelectItem value="citations">Sort: citations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="h-7 px-3 text-xs rounded border hover:bg-accent"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onRunIngest}
            disabled={busy}
            className="h-7 px-3 text-xs rounded bg-foreground text-background disabled:opacity-50"
          >
            {busy ? "Queuing…" : "Ingest now"}
          </button>
        </div>
      </header>

      {msg && <div className="px-6 py-2 text-xs bg-muted">{msg}</div>}

      <div className="flex-1 overflow-auto px-6 py-4">
        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Loading feed…</p>
        )}
        {state.kind === "error" && (
          <div className="rounded border border-destructive/50 p-4 text-sm">
            <p className="font-medium text-destructive">Failed to load feed</p>
            <p className="mt-1 text-muted-foreground">{state.message}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 h-7 px-3 text-xs rounded border hover:bg-accent"
            >
              Retry
            </button>
          </div>
        )}

        {state.kind === "ok" && state.data.group_by === "flat" && (
          state.data.papers.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-base font-semibold">No papers match</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Try widening the time window, or click <em>Ingest now</em>.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {state.data.papers.map((p) => (
                <PaperRow key={p.id} p={p} />
              ))}
            </ul>
          )
        )}

        {state.kind === "ok" && state.data.group_by !== "flat" && (
          state.data.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups to show.</p>
          ) : (
            <div>
              {state.data.groups.map((g) => (
                <GroupSection key={g.label} g={g} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
