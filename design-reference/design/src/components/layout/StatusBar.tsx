import { useState } from "react";
import { useStore } from "@/stores/app";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function StatusBar() {
  const papers = useStore((s) => s.papers);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const today = new Date();
  const newToday = papers.filter(
    (p) => new Date(p.date).toDateString() === today.toDateString(),
  ).length;

  const sources = [
    { name: "arxiv.org", status: "healthy", last: "5m ago" },
    { name: "nber.org", status: "healthy", last: "31m ago" },
    { name: "cepr.org", status: "healthy", last: "1h ago" },
    { name: "federalreserve.gov", status: "healthy", last: "28m ago" },
    { name: "ecb.europa.eu", status: "healthy", last: "42m ago" },
    { name: "bankofengland.co.uk", status: "degraded", last: "6h ago" },
    { name: "bis.org", status: "healthy", last: "2h ago" },
    { name: "imf.org", status: "healthy", last: "1h ago" },
    { name: "openreview.net", status: "healthy", last: "12m ago" },
    { name: "crossref.org", status: "healthy", last: "3m ago" },
  ];
  const healthy = sources.filter((s) => s.status === "healthy").length;

  return (
    <footer className="h-7 shrink-0 border-t bg-muted/30 flex items-center gap-4 px-3 text-[11px] text-muted-foreground font-mono">
      <span>Last sync <span className="text-foreground/80">07:32</span></span>
      <span>·</span>
      <span><span className="text-foreground/80 font-semibold">{newToday}</span> new today</span>
      <span>·</span>
      <Popover open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 hover:text-foreground">
            <span className={healthy === sources.length ? "text-emerald-500" : "text-amber-500"}>●</span>
            {healthy}/{sources.length} sources healthy
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 font-sans">
          <div className="text-xs font-medium mb-2">Source health</div>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className={s.status === "healthy" ? "text-emerald-500" : "text-amber-500"}>●</span>
                  <span className="font-mono">{s.name}</span>
                </span>
                <span className="text-muted-foreground font-mono">{s.last}</span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      <div className="ml-auto flex items-center gap-3">
        <span>Tier A+B · Today</span>
        <span>·</span>
        <span>PaperPulse v1.0.0</span>
      </div>
    </footer>
  );
}
