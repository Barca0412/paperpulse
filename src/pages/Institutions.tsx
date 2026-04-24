import { useMemo, useState } from "react";
import { useInstitutions } from "@/hooks/useInstitutions";
import type { Institution } from "@/lib/types";

// Phase 2 minimal. Full design-reference (flag emoji, rank delta, side panel
// with active authors, whitelist toggle) requires country-to-flag map +
// historical rank data + whitelist write API — deferred to Phase 3 (Settings)
// and Phase 6 (detail panels per spec §12.8).

const TYPE_LABELS: Record<string, string> = {
  university: "University",
  gov: "Government",
  company: "Company",
  nonprofit: "Nonprofit",
  healthcare: "Healthcare",
  bank: "Bank",
  central_bank: "Central bank",
};

function displayType(t: string | null): string {
  if (!t) return "—";
  return TYPE_LABELS[t] ?? t.replace("_", " ");
}

export default function Institutions() {
  const state = useInstitutions(30, 100);
  const [q, setQ] = useState("");

  const filtered = useMemo<Institution[]>(() => {
    if (state.kind !== "ok") return [];
    if (!q.trim()) return state.data;
    const lc = q.toLowerCase();
    return state.data.filter(
      (i) =>
        i.name.toLowerCase().includes(lc) ||
        (i.country_code ?? "").toLowerCase().includes(lc),
    );
  }, [state, q]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 border-b flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Institutions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {state.kind === "ok"
              ? `${state.data.length} institutions · sorted by 30-day paper count`
              : ""}
          </p>
        </div>
        <input
          className="h-7 text-xs px-2 w-64 ml-auto rounded border bg-background"
          placeholder="Search by name or country…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </header>

      <div className="flex-1 overflow-auto p-6">
        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Loading institutions…</p>
        )}

        {state.kind === "error" && (
          <div className="rounded border border-destructive/50 p-4 text-sm">
            <p className="font-medium text-destructive">Failed to load institutions</p>
            <p className="mt-1 text-muted-foreground">{state.message}</p>
          </div>
        )}

        {state.kind === "ok" && state.data.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-base font-semibold">No institutions yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Institutions populate as papers are enriched with OpenAlex / ar5iv
              affiliations. Run a few ingest cycles and the retry queue will fill
              this in (every 4h in the background).
            </p>
          </div>
        )}

        {state.kind === "ok" && filtered.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3 w-28">Type</th>
                  <th className="py-2 px-3 w-20">Country</th>
                  <th className="py-2 px-3 w-24 text-right">30d papers</th>
                  <th className="py-2 px-3 w-24 text-right">Total</th>
                  <th className="py-2 px-3 w-24 text-center">Whitelist</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {i.ror_id ?? i.id}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {displayType(i.type)}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {i.country_code ?? "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {i.paper_count_30d}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {i.paper_count_total}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {i.in_whitelist ? (
                        <span className="text-emerald-500">✓</span>
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
