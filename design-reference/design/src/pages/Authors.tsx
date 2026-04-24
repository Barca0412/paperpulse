import { useState } from "react";
import { AUTHORS } from "@/mocks/authors";
import { INST_BY_ID } from "@/mocks/institutions";
import { TOPIC_BY_SLUG } from "@/mocks/topics";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, Star } from "lucide-react";
import { useStore } from "@/stores/app";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export default function Authors() {
  const [q, setQ] = useState("");
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  const filtered = AUTHORS.filter((a) => {
    if (trackedOnly && !a.tracked) return false;
    return a.name.toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => b.hIndex - a.hIndex);
  const s = AUTHORS.find((a) => a.id === sel);
  const papers = useStore((st) => st.papers);

  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Authors</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{AUTHORS.length} authors · {AUTHORS.filter((a) => a.tracked).length} tracked.</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs"><Switch checked={trackedOnly} onCheckedChange={setTrackedOnly} /> Tracked only</label>
            <Input className="h-7 text-xs w-64" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <th className="w-8 py-2 px-2"></th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2 w-36">Institution</th>
                  <th className="py-2 px-2 w-16 text-right">h-idx</th>
                  <th className="py-2 px-2 w-20 text-right">30d papers</th>
                  <th className="py-2 px-2 w-20 text-center">Tracked</th>
                  <th className="py-2 px-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} onClick={() => setSel(a.id)} className="border-b hover:bg-muted/30 cursor-pointer">
                    <td className="py-2 px-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white text-[10px] font-semibold flex items-center justify-center">
                        {a.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                    </td>
                    <td className="py-2 px-2"><div className="font-medium">{a.name}</div></td>
                    <td className="py-2 px-2 text-muted-foreground">{INST_BY_ID[a.institutionId]?.short}</td>
                    <td className="py-2 px-2 text-right font-mono">{a.hIndex}</td>
                    <td className="py-2 px-2 text-right font-mono">{a.paper30d}</td>
                    <td className="py-2 px-2 text-center">{a.tracked && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 inline" />}</td>
                    <td className="py-2 px-2"><Button size="sm" variant="ghost" className="text-[11px]">View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {s && (
        <aside className="w-96 border-l shrink-0 overflow-y-auto bg-muted/10">
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white text-sm font-semibold flex items-center justify-center">
              {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground">{INST_BY_ID[s.institutionId]?.name}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSel(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="h-index" value={s.hIndex.toString()} />
              <Stat label="30d papers" value={s.paper30d.toString()} />
              <Stat label="Tracked" value={s.tracked ? "Yes" : "No"} />
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs">Topic mix</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {s.topicMix.map((t) => {
                  const tp = TOPIC_BY_SLUG[t.topic];
                  return (
                    <div key={t.topic} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span>{tp?.name}</span>
                        <span className="font-mono text-muted-foreground">{t.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-sky-500" style={{ width: `${t.pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs">Recent papers</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {papers.filter((p) => p.authors.some((a) => a.authorId === s.id)).slice(0, 4).map((p) => (
                  <div key={p.id} className="border-b pb-1.5 last:border-0">
                    <div className="font-medium leading-tight line-clamp-2">{p.title}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.date.slice(0, 10)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button size="sm" className="w-full" variant={s.tracked ? "outline" : "default"}>
              <Star className="h-3 w-3" /> {s.tracked ? "Untrack" : "Track"} this author
            </Button>
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
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
