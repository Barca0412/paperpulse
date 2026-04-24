import { useState } from "react";
import { useFeed } from "@/hooks/useFeed";
import { api } from "@/lib/api";

export default function Feed() {
  const { state, reload } = useFeed(100);
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
      <header className="px-6 py-3 border-b flex items-center gap-3">
        <h1 className="text-lg font-semibold">Feed</h1>
        <span className="text-xs text-muted-foreground">
          {state.kind === "ok" ? `${state.data.total} papers` : ""}
        </span>
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
        {state.kind === "ok" && state.data.papers.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-base font-semibold">No papers yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Click <em>Ingest now</em> to fetch arXiv + NBER. First run takes ~30s.
            </p>
          </div>
        )}
        {state.kind === "ok" && state.data.papers.length > 0 && (
          <ul className="space-y-2">
            {state.data.papers.map((p) => (
              <li key={p.id} className="rounded border p-3 hover:bg-accent/30">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    {p.source}
                  </span>
                  {p.published_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {p.published_at.slice(0, 10)}
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
                    <a
                      className="underline"
                      href={p.html_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      HTML
                    </a>
                  )}
                  {p.pdf_url && (
                    <a
                      className="underline"
                      href={p.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
