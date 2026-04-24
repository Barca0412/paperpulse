import { useMemo, useState } from "react";
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
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useStore } from "@/stores/app";
import { TOPICS, TOPIC_BY_SLUG } from "@/mocks/topics";
import { INSTITUTIONS } from "@/mocks/institutions";
import { AUTHORS } from "@/mocks/authors";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Win = "7d" | "30d" | "90d" | "all";
const WIN_DAYS: Record<Win, number> = { "7d": 7, "30d": 30, "90d": 90, all: 365 };

export default function Dashboard() {
  const papers = useStore((s) => s.papers);
  const [win, setWin] = useState<Win>("30d");
  const [compare, setCompare] = useState(true);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - WIN_DAYS[win] * 86400000;
    return papers.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [papers, win]);

  // Today numbers
  const today = new Date().toDateString();
  const newToday = papers.filter((p) => new Date(p.date).toDateString() === today).length;
  const thisWeek = papers.filter((p) => Date.now() - new Date(p.date).getTime() < 7 * 86400000).length;
  const thisMonth = filtered.length;
  const mustRead = papers.filter((p) => p.status === "must_read").length;

  // Trend: per-day paper count by tier
  const trendData = useMemo(() => {
    const days: Record<string, { date: string; A: number; B: number; C: number }> = {};
    for (const p of filtered) {
      const d = p.date.slice(5, 10);
      if (!days[d]) days[d] = { date: d, A: 0, B: 0, C: 0 };
      days[d][p.tier]++;
    }
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // Topic heat: top 5 topics over time (weekly buckets)
  const topicData = useMemo(() => {
    const buckets: Record<string, Record<string, number>> = {};
    for (const p of filtered) {
      const week = p.date.slice(0, 10).slice(5);
      if (!buckets[week]) buckets[week] = {};
      for (const t of p.topics.slice(0, 1)) buckets[week][t] = (buckets[week][t] || 0) + 1;
    }
    const rows = Object.entries(buckets)
      .map(([w, m]) => ({ week: w, ...m }))
      .sort((a, b) => a.week.localeCompare(b.week));
    return rows.slice(-12);
  }, [filtered]);
  const topTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of filtered) for (const t of p.topics) counts[t] = (counts[t] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s);
  }, [filtered]);

  // Tier distribution
  const tierData = ["A", "B", "C"].map((t) => ({
    name: `Tier ${t}`,
    value: filtered.filter((p) => p.tier === t).length,
    color: t === "A" ? "#10b981" : t === "B" ? "#0ea5e9" : "#94a3b8",
  }));

  // Top institutions
  const instData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of filtered) for (const a of p.authors) counts[a.institutionId] = (counts[a.institutionId] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, c]) => ({
        name: INSTITUTIONS.find((i) => i.id === id)?.short || id,
        count: c,
        whitelisted: INSTITUTIONS.find((i) => i.id === id)?.whitelisted,
      }));
  }, [filtered]);

  // Top authors
  const authData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of filtered) for (const a of p.authors) if (a.authorId) counts[a.authorId] = (counts[a.authorId] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, c]) => ({
        name: AUTHORS.find((a) => a.id === id)?.name || id,
        count: c,
        tracked: AUTHORS.find((a) => a.id === id)?.tracked,
      }));
  }, [filtered]);

  // Source distribution
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of filtered) counts[p.source] = (counts[p.source] || 0) + 1;
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const TOPIC_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6"];

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-5 border-b flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="compare" className="text-xs">Compare to previous period</Label>
            <Switch id="compare" checked={compare} onCheckedChange={setCompare} />
          </div>
          <Select value={win} onValueChange={(v) => setWin(v as Win)}>
            <SelectTrigger className="w-24 h-7"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 gap-4">
        {/* KPI card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Today's Numbers</CardTitle>
            <CardDescription>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <Kpi label="New today" value={newToday} delta={+9} />
              <Kpi label="This week" value={thisWeek} delta={+12} />
              <Kpi label={`Last ${WIN_DAYS[win]}d`} value={thisMonth} delta={+4} />
              <Kpi label="Must read" value={mustRead} delta={+3} tone="rose" />
            </div>
          </CardContent>
        </Card>

        {/* Ingestion trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Ingestion Trend</CardTitle>
            <CardDescription>Paper counts per day, stacked by tier</CardDescription>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" width={24} />
                <Tooltip contentStyle={{ fontSize: 11, padding: 6 }} />
                <Area dataKey="A" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Area dataKey="B" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4} />
                <Area dataKey="C" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Topic heat */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Topic Heat Trend</CardTitle>
            <CardDescription>Top 5 topics vs. past weeks</CardDescription>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer>
              <LineChart data={topicData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" width={24} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                {topTopics.map((t, i) => (
                  <Line
                    key={t}
                    dataKey={t}
                    stroke={TOPIC_COLORS[i]}
                    name={TOPIC_BY_SLUG[t]?.name}
                    strokeWidth={1.6}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tier distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Tier Distribution</CardTitle>
            <CardDescription>How papers break down A / B / C</CardDescription>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={tierData} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {tierData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top institutions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Institutions</CardTitle>
            <CardDescription>Papers in window · whitelisted highlighted</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={instData} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 50 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" fontSize={10} width={68} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="count">
                  {instData.map((d, i) => <Cell key={i} fill={d.whitelisted ? "#10b981" : "#cbd5e1"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top authors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Authors</CardTitle>
            <CardDescription>Tracked authors highlighted</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={authData} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 50 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" fontSize={10} width={88} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="count">
                  {authData.map((d, i) => <Cell key={i} fill={d.tracked ? "#f59e0b" : "#cbd5e1"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Source Distribution</CardTitle>
            <CardDescription>Where papers come from</CardDescription>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer>
              <BarChart data={sourceData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} width={24} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent digest teaser */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Digest</CardTitle>
            <CardDescription>2026 W17 · Top 5 picks</CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {papers.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-start gap-2 border-b pb-2 last:border-0">
                <Badge variant={p.tier === "A" ? "tierA" : p.tier === "B" ? "tierB" : "tierC"} className="font-mono mt-0.5">
                  {p.tier}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-tight line-clamp-2">{p.title}</div>
                  <div className="text-muted-foreground text-[11px] mt-0.5 truncate">
                    {p.authors.slice(0, 2).map((a) => a.name).join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, tone }: { label: string; value: number; delta: number; tone?: "rose" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-2xl font-bold tabular-nums ${tone === "rose" ? "text-rose-600 dark:text-rose-400" : ""}`}>
          {value}
        </span>
        <span className={`text-xs font-mono ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {delta >= 0 ? "+" : ""}{delta}
        </span>
      </div>
    </div>
  );
}
