import { useMemo, useState } from "react";
import { useAuthors } from "@/hooks/useAuthors";
import type { Author } from "@/lib/types";
import { openExternal } from "@/lib/open-url";

// Phase 2 minimal. Tracked-author toggle + per-author h-index / topic mix
// deferred to Phase 3 (Settings) and Phase 5 (enrichment).

export default function Authors() {
  const state = useAuthors(30, 200);
  const [q, setQ] = useState("");

  const filtered = useMemo<Author[]>(() => {
    if (state.kind !== "ok") return [];
    if (!q.trim()) return state.data;
    const lc = q.toLowerCase();
    return state.data.filter((a) => a.name.toLowerCase().includes(lc));
  }, [state, q]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 border-b flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Authors</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {state.kind === "ok"
              ? `${state.data.length} authors · sorted by 30-day paper count`
              : ""}
          </p>
        </div>
        <input
          className="h-7 text-xs px-2 w-64 ml-auto rounded border bg-background"
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </header>

      <div className="flex-1 overflow-auto p-6">
        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Loading authors…</p>
        )}

        {state.kind === "error" && (
          <div className="rounded border border-destructive/50 p-4 text-sm">
            <p className="font-medium text-destructive">Failed to load authors</p>
            <p className="mt-1 text-muted-foreground">{state.message}</p>
          </div>
        )}

        {state.kind === "ok" && state.data.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-base font-semibold">No authors yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Authors populate as papers are enriched. Run a few ingest cycles.
            </p>
          </div>
        )}

        {state.kind === "ok" && filtered.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3 w-32">OpenAlex / ORCID</th>
                  <th className="py-2 px-3 w-24 text-right">30d papers</th>
                  <th className="py-2 px-3 w-24 text-right">Total</th>
                  <th className="py-2 px-3 w-20 text-center">Tracked</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{a.name}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">
                      {a.orcid ? (
                        <button
                          type="button"
                          className="underline hover:text-foreground"
                          onClick={() =>
                            openExternal(`https://orcid.org/${a.orcid}`)
                          }
                        >
                          {a.orcid}
                        </button>
                      ) : a.openalex_id ? (
                        <button
                          type="button"
                          className="underline hover:text-foreground"
                          onClick={() => openExternal(a.openalex_id!)}
                        >
                          {a.openalex_id.replace(
                            "https://openalex.org/",
                            "",
                          )}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {a.paper_count_30d}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {a.paper_count_total}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {a.is_tracked ? (
                        <span className="text-yellow-500">★</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
