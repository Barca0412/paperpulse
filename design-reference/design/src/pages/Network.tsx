import { useEffect, useRef, useState, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { AUTHORS } from "@/mocks/authors";
import { INST_BY_ID } from "@/mocks/institutions";
import { useStore } from "@/stores/app";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Node {
  id: string;
  name: string;
  group: "center" | "hop1" | "hop2";
  tracked?: boolean;
  inst?: string;
  val?: number;
}
interface Link { source: string; target: string; weight: number }

export default function NetworkPage() {
  const papers = useStore((s) => s.papers);
  const [center, setCenter] = useState<string>("a1"); // Bryan Kelly
  const [hops, setHops] = useState<1 | 2 | 3>(2);
  const [win, setWin] = useState<"30d" | "90d" | "all">("90d");
  const [centerKind, setCenterKind] = useState<"author" | "inst">("author");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 520 });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      const r = wrapRef.current!.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const graph = useMemo(() => {
    const cutoff = win === "30d" ? Date.now() - 30 * 86400000 : win === "90d" ? Date.now() - 90 * 86400000 : 0;
    const relevantPapers = papers.filter((p) => new Date(p.date).getTime() >= cutoff);
    const coAuthors: Record<string, Set<string>> = {};
    for (const p of relevantPapers) {
      for (const a of p.authors) {
        if (!a.authorId) continue;
        coAuthors[a.authorId] ||= new Set();
        for (const b of p.authors) if (b.authorId && b.authorId !== a.authorId) coAuthors[a.authorId].add(b.authorId);
      }
    }
    const linksMap: Record<string, number> = {};
    const addLink = (a: string, b: string) => {
      const k = [a, b].sort().join("|");
      linksMap[k] = (linksMap[k] || 0) + 1;
    };

    const nodesMap: Record<string, Node> = {};
    const centerAuthor = AUTHORS.find((a) => a.id === center);
    if (!centerAuthor) return { nodes: [], links: [] };
    nodesMap[center] = { id: center, name: centerAuthor.name, group: "center", tracked: centerAuthor.tracked, inst: INST_BY_ID[centerAuthor.institutionId]?.short, val: 12 };

    const hop1 = [...(coAuthors[center] || [])];
    for (const id of hop1) {
      const a = AUTHORS.find((x) => x.id === id);
      if (!a) continue;
      nodesMap[id] = { id, name: a.name, group: "hop1", tracked: a.tracked, inst: INST_BY_ID[a.institutionId]?.short, val: 6 };
      addLink(center, id);
    }
    if (hops >= 2) {
      for (const h1 of hop1) {
        const neigh = [...(coAuthors[h1] || [])];
        for (const id of neigh) {
          if (id === center) continue;
          if (!nodesMap[id]) {
            const a = AUTHORS.find((x) => x.id === id);
            if (!a) continue;
            nodesMap[id] = { id, name: a.name, group: "hop2", tracked: a.tracked, inst: INST_BY_ID[a.institutionId]?.short, val: 3 };
          }
          addLink(h1, id);
        }
      }
    }
    const links: Link[] = Object.entries(linksMap).map(([k, w]) => {
      const [source, target] = k.split("|");
      return { source, target, weight: w };
    });
    return { nodes: Object.values(nodesMap), links };
  }, [center, hops, win, papers]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-bold tracking-tight">Network</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Ego-network of an author or institution across recent co-authorship.</p>
      </div>

      <div className="px-6 py-3 border-b bg-muted/20 flex items-center gap-2 flex-wrap">
        <Select value={centerKind} onValueChange={(v) => setCenterKind(v as "author" | "inst")}>
          <SelectTrigger className="w-24 h-7"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="author">Author</SelectItem>
            <SelectItem value="inst">Institution</SelectItem>
          </SelectContent>
        </Select>
        <Select value={center} onValueChange={setCenter}>
          <SelectTrigger className="w-56 h-7"><SelectValue /></SelectTrigger>
          <SelectContent>
            {AUTHORS.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} — {INST_BY_ID[a.institutionId]?.short}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Hops</span>
          {[1, 2, 3].map((h) => (
            <Button key={h} size="sm" variant={hops === h ? "secondary" : "outline"} onClick={() => setHops(h as 1 | 2 | 3)} className="h-7 w-7 p-0 font-mono">{h}</Button>
          ))}
        </div>
        <Select value={win} onValueChange={(v) => setWin(v as "30d" | "90d" | "all")}>
          <SelectTrigger className="w-28 h-7"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
          <Legend color="#ef4444" label="center" />
          <Legend color="#0ea5e9" label="1-hop" />
          <Legend color="#94a3b8" label="2-hop" />
          <span><span className="text-yellow-500">★</span> tracked</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div ref={wrapRef} className="flex-1 min-w-0 bg-muted/10">
          <ForceGraph2D
            graphData={graph}
            width={dims.w}
            height={dims.h}
            nodeLabel={(n: any) => `${n.name} · ${n.inst || ""}`}
            nodeVal={(n: any) => n.val || 3}
            onNodeClick={(n: any) => setSelectedNode(n)}
            linkColor={() => "rgba(148,163,184,0.3)"}
            backgroundColor="transparent"
            nodeCanvasObject={(node: any, ctx, scale) => {
              const r = Math.sqrt(node.val || 3) * 3;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              const color = node.group === "center" ? "#ef4444" : node.group === "hop1" ? "#0ea5e9" : "#94a3b8";
              ctx.fillStyle = color;
              ctx.fill();
              if (node.tracked) {
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 2 / scale;
                ctx.stroke();
              }
              const label = node.name;
              ctx.font = `${11 / scale}px Inter, sans-serif`;
              ctx.fillStyle = "hsl(215, 16%, 46%)";
              ctx.textAlign = "center";
              ctx.fillText(label, node.x, node.y + r + 10 / scale);
            }}
          />
        </div>
        <Card className="w-72 shrink-0 m-3 self-start">
          <CardHeader className="pb-2"><CardTitle>Node details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {selectedNode ? (
              <>
                <div className="text-base font-semibold">{selectedNode.name}</div>
                <div className="text-muted-foreground">{selectedNode.inst}</div>
                <div className="flex gap-1">
                  <Badge>{selectedNode.group}</Badge>
                  {selectedNode.tracked && <Badge variant="tierA">tracked</Badge>}
                </div>
                <div className="space-y-1 pt-2">
                  <div>Papers in window: <span className="font-mono">{AUTHORS.find((a) => a.id === selectedNode.id)?.paper30d ?? "—"}</span></div>
                  <div>h-index: <span className="font-mono">{AUTHORS.find((a) => a.id === selectedNode.id)?.hIndex ?? "—"}</span></div>
                </div>
                <div className="flex gap-1 pt-2">
                  <Button size="sm" variant="outline" className="text-[11px]">View papers</Button>
                  <Button size="sm" variant="outline" className="text-[11px]">Track</Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Click a node to inspect.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
