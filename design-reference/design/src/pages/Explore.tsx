import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useStore } from "@/stores/app";
import { TOPICS, TOPIC_BY_SLUG } from "@/mocks/topics";
import { INST_BY_ID } from "@/mocks/institutions";
import { AUTHOR_BY_ID } from "@/mocks/authors";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Download, ArrowLeft } from "lucide-react";
import { shortDate, relativeDate } from "@/lib/utils";
import { PaperCard } from "@/components/paper/PaperCard";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export default function Explore() {
  const papers = useStore((s) => s.papers);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (!q.trim()) return papers;
    const needle = q.toLowerCase();
    return papers.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.tldrEN.toLowerCase().includes(needle) ||
        p.authors.some((a) => a.name.toLowerCase().includes(needle)),
    );
  }, [papers, q]);

  // Timeline grouping
  const byMonth = useMemo(() => {
    const m: Record<string, typeof papers> = {};
    for (const p of filtered) {
      const key = p.date.slice(0, 7);
      (m[key] ||= []).push(p);
    }
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-5 border-b">
        <h1 className="text-xl font-bold tracking-tight">Explore</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Full-history search & flexible queries. Feed is today; Explore is the archive.
        </p>
      </div>

      <Tabs defaultValue="table" className="h-full">
        <div className="px-6 py-3 border-b bg-muted/20 flex items-center gap-3">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="topics">Topic deep dive</TabsTrigger>
          </TabsList>

          <div className="relative ml-auto w-80">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
            <Input
              className="h-7 pl-7 text-xs"
              placeholder="Search title, TL;DR, author…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button size="sm" variant="outline">
            <Download className="h-3 w-3" /> Export CSV
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-3 w-3" /> BibTeX
          </Button>
        </div>

        <TabsContent value="table" className="px-6 py-4">
          {selected.length > 0 && (
            <div className="mb-3 p-2 rounded border bg-muted/40 flex items-center gap-2 text-xs">
              <span className="font-medium">{selected.length} selected</span>
              <Button size="sm" variant="outline">Batch save</Button>
              <Button size="sm" variant="outline">Batch tag</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
            </div>
          )}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <th className="w-8 py-2 px-2"></th>
                  <th className="py-2 px-2 font-medium">Title</th>
                  <th className="py-2 px-2 font-medium w-40">Authors</th>
                  <th className="py-2 px-2 font-medium w-24">Venue</th>
                  <th className="py-2 px-2 font-medium w-20">Date</th>
                  <th className="py-2 px-2 font-medium w-12">Tier</th>
                  <th className="py-2 px-2 font-medium w-32">Topics</th>
                  <th className="py-2 px-2 font-medium w-16">Score</th>
                  <th className="py-2 px-2 font-medium w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 80).map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2">
                      <Checkbox
                        checked={selected.includes(p.id)}
                        onCheckedChange={() =>
                          setSelected((s) => s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id])
                        }
                      />
                    </td>
                    <td className="py-2 px-2 max-w-0">
                      <div className="font-medium truncate">{p.title}</div>
                    </td>
                    <td className="py-2 px-2 truncate text-muted-foreground">
                      {p.authors.slice(0, 2).map((a) => a.name).join(", ")}
                      {p.authors.length > 2 && " et al."}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground uppercase font-mono">{p.source}</td>
                    <td className="py-2 px-2 font-mono text-muted-foreground">{shortDate(p.date)}</td>
                    <td className="py-2 px-2">
                      <Badge variant={p.tier === "A" ? "tierA" : p.tier === "B" ? "tierB" : "tierC"} className="font-mono">{p.tier}</Badge>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        {p.topics.slice(0, 2).map((t) => {
                          const tp = TOPIC_BY_SLUG[t];
                          return tp ? <Badge key={t} variant={tp.side} className="text-[9px]">{tp.name}</Badge> : null;
                        })}
                      </div>
                    </td>
                    <td className="py-2 px-2 font-mono">{p.relevance.toFixed(1)}</td>
                    <td className="py-2 px-2 text-muted-foreground capitalize">{p.status.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Showing 80 of {filtered.length} papers · drag column edges to resize, click header to sort
          </p>
        </TabsContent>

        <TabsContent value="timeline" className="px-6 py-4">
          <div className="space-y-6">
            {byMonth.map(([month, ps]) => (
              <div key={month}>
                <div className="flex items-baseline gap-3 mb-2 sticky top-0 bg-background py-1">
                  <h3 className="font-mono text-sm font-semibold">{month}</h3>
                  <span className="text-xs text-muted-foreground">{ps.length} papers</span>
                </div>
                <div className="space-y-1.5 border-l-2 border-border pl-4 ml-1">
                  {ps.slice(0, 12).map((p) => (
                    <div key={p.id} className="flex items-start gap-2 text-xs py-1">
                      <span className="font-mono text-muted-foreground w-14 shrink-0">{p.date.slice(8, 10)} · {p.date.slice(5, 7)}</span>
                      <Badge variant={p.tier === "A" ? "tierA" : p.tier === "B" ? "tierB" : "tierC"} className="font-mono shrink-0">{p.tier}</Badge>
                      <span className="line-clamp-1 flex-1">{p.title}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {p.authors[0]?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="topics" className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TOPICS.map((t) => {
              const c = papers.filter((p) => p.topics.includes(t.slug)).length;
              return (
                <Link key={t.slug} to={`/explore/topic/${t.slug}`}>
                  <Card className="hover:border-foreground/30 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{t.name}</CardTitle>
                        <Badge variant={t.side}>{t.side}</Badge>
                      </div>
                      <CardDescription>{c} papers · weight {t.weight.toFixed(1)}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground line-clamp-2">
                      {t.descEN}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function TopicDeepDive() {
  const { slug } = useParams();
  const nav = useNavigate();
  const papers = useStore((s) => s.papers);
  const topic = slug ? TOPIC_BY_SLUG[slug] : undefined;

  const topicPapers = useMemo(
    () => papers.filter((p) => slug && p.topics.includes(slug)),
    [papers, slug],
  );

  const byMonth = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of topicPapers) {
      const k = p.date.slice(0, 7);
      m[k] = (m[k] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));
  }, [topicPapers]);

  const topInsts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of topicPapers) for (const a of p.authors) c[a.institutionId] = (c[a.institutionId] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, count]) => ({
      name: INST_BY_ID[id]?.short || id, count,
    }));
  }, [topicPapers]);

  const topAuths = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of topicPapers) for (const a of p.authors) if (a.authorId) c[a.authorId] = (c[a.authorId] || 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, count]) => ({
      name: AUTHOR_BY_ID[id]?.name || id, count,
    }));
  }, [topicPapers]);

  const adjacent = useMemo(() => {
    const co: Record<string, number> = {};
    for (const p of topicPapers) for (const t of p.topics) if (t !== slug) co[t] = (co[t] || 0) + 1;
    return Object.entries(co).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [topicPapers, slug]);

  if (!topic) return <div className="p-6 text-sm">Topic not found.</div>;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b">
        <Button variant="ghost" size="sm" onClick={() => nav("/explore")}>
          <ArrowLeft className="h-3 w-3" /> Back to Explore
        </Button>
        <div className="mt-2 flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{topic.name}</h1>
          <Badge variant={topic.side} className="capitalize">{topic.side}</Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {topicPapers.length} papers · since 2026-02
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{topic.descEN}</p>
        <p className="text-xs text-muted-foreground mt-0.5 zh">{topic.descZH}</p>
      </div>

      <div className="p-6 grid grid-cols-2 gap-4">
        <Card className="col-span-2">
          <CardHeader className="pb-2"><CardTitle>发文趋势 · Publication trend</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" width={24} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Line dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle>🏛️ Top institutions</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <BarChart data={topInsts} layout="vertical" margin={{ left: 48 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" fontSize={10} width={60} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle>👨‍🏫 Top authors</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <BarChart data={topAuths} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" fontSize={10} width={80} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="pb-2"><CardTitle>🔗 Adjacent topics (co-occurrence)</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {adjacent.map(([t, c]) => {
              const tp = TOPIC_BY_SLUG[t];
              if (!tp) return null;
              const score = (c / topicPapers.length).toFixed(2);
              return (
                <Link key={t} to={`/explore/topic/${t}`} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-accent text-sm">
                  <Badge variant={tp.side}>{tp.side}</Badge>
                  <span className="flex-1">{tp.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">co-occur {score}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="col-span-2">
          <h3 className="text-sm font-semibold mb-2">📄 Papers in this topic</h3>
          <div className="space-y-2">
            {topicPapers.slice(0, 10).map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
