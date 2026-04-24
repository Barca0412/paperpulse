import { useState } from "react";
import { INSTITUTIONS } from "@/mocks/institutions";
import { AUTHORS } from "@/mocks/authors";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, X, ResponsiveContainer } from "lucide-react";
import { PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

export default function Institutions() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = INSTITUTIONS.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()) || i.short.toLowerCase().includes(q.toLowerCase()));
  const sel = INSTITUTIONS.find((i) => i.id === selected);

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Institutions</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{INSTITUTIONS.length} institutions · whitelisted contribute to tier promotion.</p>
          </div>
          <Input
            className="h-7 text-xs w-64 ml-auto"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="p-6">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <th className="w-10 py-2 px-2"></th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2 w-28">Type</th>
                  <th className="py-2 px-2 w-24">Country</th>
                  <th className="py-2 px-2 w-20 text-right">30d papers</th>
                  <th className="py-2 px-2 w-20 text-right">Δ rank</th>
                  <th className="py-2 px-2 w-24 text-center">Whitelisted</th>
                  <th className="py-2 px-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => setSelected(i.id)}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="py-2 px-2 text-base">{i.flag}</td>
                    <td className="py-2 px-2"><div className="font-medium">{i.name}</div><div className="text-[10px] text-muted-foreground font-mono">{i.rorId}</div></td>
                    <td className="py-2 px-2 text-muted-foreground capitalize">{i.type.replace("_", " ")}</td>
                    <td className="py-2 px-2 text-muted-foreground">{i.country}</td>
                    <td className="py-2 px-2 text-right font-mono">{i.paper30d}</td>
                    <td className="py-2 px-2 text-right font-mono">
                      {i.rankDelta > 0 ? <span className="text-emerald-600">↑{i.rankDelta}</span> : i.rankDelta < 0 ? <span className="text-rose-600">↓{Math.abs(i.rankDelta)}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 px-2 text-center">{i.whitelisted ? <Badge variant="tierA">yes</Badge> : <Badge variant="secondary">no</Badge>}</td>
                    <td className="py-2 px-2"><Button size="sm" variant="ghost" className="text-[11px]">View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {sel && (
        <aside className="w-96 border-l shrink-0 overflow-y-auto bg-muted/10">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <div className="text-3xl">{sel.flag}</div>
            <div className="flex-1">
              <div className="font-semibold">{sel.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{sel.rorId}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Papers 30d" value={sel.paper30d.toString()} />
              <Stat label="Type" value={sel.type.replace("_", " ")} />
              <Stat label="Whitelist" value={sel.whitelisted ? "Yes" : "No"} />
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs">Active authors</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {AUTHORS.filter((a) => a.institutionId === sel.id).slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white text-[10px] font-semibold flex items-center justify-center">
                      {a.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <span className="flex-1">{a.name}</span>
                    <span className="text-muted-foreground font-mono">h{a.hIndex}</span>
                    {a.tracked && <span className="text-yellow-500">★</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1">View all papers</Button>
              <Button size="sm" variant="outline">{sel.whitelisted ? "Remove" : "Add to whitelist"}</Button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2 bg-background">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-sm font-semibold mt-0.5 capitalize">{value}</div>
    </div>
  );
}
