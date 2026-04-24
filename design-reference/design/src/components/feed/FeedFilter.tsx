import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/stores/app";
import { TOPICS } from "@/mocks/topics";
import { INSTITUTIONS } from "@/mocks/institutions";
import { useState } from "react";

const SOURCE_LIST = ["arxiv", "nber", "cepr", "fed", "ecb", "boe", "bis", "imf", "openreview", "crossref"];
const STATUSES = ["all", "unread", "saved", "must_read", "read", "ignored"] as const;

export function FeedFilter() {
  const { filters, setFilter, resetFilters } = useStore();
  const [instSearch, setInstSearch] = useState("");

  const toggle = (key: "tiers" | "sources" | "topics" | "institutions", val: string) => {
    const curr = filters[key];
    setFilter(key, curr.includes(val) ? curr.filter((x) => x !== val) : [...curr, val]);
  };

  const section = "px-3 py-2.5";
  const label = "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2";

  const filteredInsts = INSTITUTIONS.filter((i) =>
    i.name.toLowerCase().includes(instSearch.toLowerCase()),
  );

  return (
    <aside className="w-64 shrink-0 border-l bg-background flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <h3 className="text-xs font-semibold">Filters</h3>
        <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={resetFilters}>
          Reset all
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className={section}>
          <div className={label}>Tier</div>
          <div className="space-y-1.5">
            {["A", "B", "C"].map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.tiers.includes(t)}
                  onCheckedChange={() => toggle("tiers", t)}
                />
                <span className="text-xs font-mono">{t}</span>
              </label>
            ))}
          </div>
        </div>
        <Separator />
        <div className={section}>
          <div className={label}>Source</div>
          <div className="space-y-1.5">
            {SOURCE_LIST.map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.sources.includes(s)}
                  onCheckedChange={() => toggle("sources", s)}
                />
                <span className="text-xs font-mono uppercase">{s}</span>
              </label>
            ))}
          </div>
        </div>
        <Separator />
        <div className={section}>
          <div className={label}>Relevance ≥ {filters.minRelevance.toFixed(1)}</div>
          <Slider
            min={0}
            max={10}
            step={0.5}
            value={[filters.minRelevance]}
            onValueChange={([v]) => setFilter("minRelevance", v)}
          />
        </div>
        <Separator />
        <div className={section}>
          <div className={label}>Status</div>
          <RadioGroup
            value={filters.status}
            onValueChange={(v) => setFilter("status", v as typeof filters.status)}
          >
            {STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <RadioGroupItem value={s} id={`st-${s}`} />
                <Label htmlFor={`st-${s}`} className="text-xs capitalize cursor-pointer">
                  {s.replace("_", " ")}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <Separator />
        <div className={section}>
          <div className={label}>Topics</div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {TOPICS.map((t) => (
              <label key={t.slug} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.topics.includes(t.slug)}
                  onCheckedChange={() => toggle("topics", t.slug)}
                />
                <span className="text-xs truncate">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
        <Separator />
        <div className={section}>
          <div className={label}>Institutions</div>
          <Input
            placeholder="Search…"
            value={instSearch}
            onChange={(e) => setInstSearch(e.target.value)}
            className="h-7 text-xs mb-2"
          />
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredInsts.map((i) => (
              <label key={i.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.institutions.includes(i.id)}
                  onCheckedChange={() => toggle("institutions", i.id)}
                />
                <span className="text-xs truncate">{i.flag} {i.short}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
