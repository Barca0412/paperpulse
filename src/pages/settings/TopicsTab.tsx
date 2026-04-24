import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SettingsSection } from "./_parts";
import { useTopics } from "@/hooks/useSettings";
import type { Topic } from "@/lib/settings";
import { Plus, Trash2 } from "lucide-react";

function emptyTopic(): Topic {
  return {
    name: "",
    slug: "",
    side: "crosscut",
    description_en: "",
    description_zh: "",
    weight: 1.0,
    color: null,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TopicColumn({
  topics,
  onChange,
  onRemove,
  onAdd,
  label,
}: {
  topics: Topic[];
  onChange: (i: number, patch: Partial<Topic>) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase">
          {label}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {topics.length}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="ml-auto"
        >
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      {topics.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">No topics yet.</p>
      )}
      {topics.map((t, i) => (
        <div key={i} className="rounded border p-3 space-y-2">
          <div className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-5 h-8 text-xs"
              placeholder="Name"
              value={t.name}
              onChange={(e) => {
                const name = e.target.value;
                onChange(i, {
                  name,
                  slug: t.slug || slugify(name),
                });
              }}
            />
            <Input
              className="col-span-3 h-8 text-xs font-mono"
              placeholder="slug"
              value={t.slug}
              onChange={(e) => onChange(i, { slug: e.target.value })}
            />
            <Select
              value={t.side}
              onValueChange={(v) => onChange(i, { side: v as Topic["side"] })}
            >
              <SelectTrigger className="col-span-3 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cs">CS</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="crosscut">Crosscut</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(i)}
              className="col-span-1 h-8"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Textarea
            className="text-xs"
            rows={2}
            placeholder="English description — used as L2 anchor"
            value={t.description_en}
            onChange={(e) => onChange(i, { description_en: e.target.value })}
          />
          <Textarea
            className="text-xs"
            rows={2}
            placeholder="中文描述 — 用作 L2 anchor"
            value={t.description_zh}
            onChange={(e) => onChange(i, { description_zh: e.target.value })}
          />
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground min-w-[60px]">
              weight {t.weight.toFixed(2)}
            </span>
            <Slider
              value={[t.weight]}
              min={0}
              max={2}
              step={0.05}
              onValueChange={([v]) => onChange(i, { weight: v })}
              className="flex-1"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TopicsTab() {
  const { state, save, saving } = useTopics();
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    if (state.kind !== "ok") return;
    setTopics(state.data.topics);
  }, [state]);

  if (state.kind === "loading")
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (state.kind === "error")
    return <div className="p-6 text-sm text-destructive">{state.message}</div>;

  function patchAt(i: number, patch: Partial<Topic>) {
    setTopics((prev) => prev.map((t, j) => (i === j ? { ...t, ...patch } : t)));
  }
  function removeAt(i: number) {
    setTopics((prev) => prev.filter((_, j) => j !== i));
  }
  function addSide(side: Topic["side"]) {
    setTopics((prev) => [...prev, { ...emptyTopic(), side }]);
  }

  const finance = topics.filter((t) => t.side === "finance");
  const cs = topics.filter((t) => t.side === "cs");
  const crosscut = topics.filter((t) => t.side === "crosscut");

  return (
    <div className="p-6 max-w-6xl">
      <SettingsSection
        title="Topics"
        description="L2 anchor topics. Descriptions (EN + ZH) are embedded as bilingual anchors. Weight boosts/depresses matches in the L2 similarity score. Changing topics rebuilds the anchor cache and re-scores recent papers."
      >
        <div className="grid grid-cols-3 gap-4">
          <TopicColumn
            
            topics={finance}
            onChange={(i, patch) => {
              const globalIndex = topics.findIndex(
                (t, _j) => t === finance[i],
              );
              if (globalIndex >= 0) patchAt(globalIndex, patch);
            }}
            onRemove={(i) => {
              const g = topics.findIndex((t) => t === finance[i]);
              if (g >= 0) removeAt(g);
            }}
            onAdd={() => addSide("finance")}
            label="Finance"
          />
          <TopicColumn
            
            topics={cs}
            onChange={(i, patch) => {
              const g = topics.findIndex((t) => t === cs[i]);
              if (g >= 0) patchAt(g, patch);
            }}
            onRemove={(i) => {
              const g = topics.findIndex((t) => t === cs[i]);
              if (g >= 0) removeAt(g);
            }}
            onAdd={() => addSide("cs")}
            label="CS"
          />
          <TopicColumn
            
            topics={crosscut}
            onChange={(i, patch) => {
              const g = topics.findIndex((t) => t === crosscut[i]);
              if (g >= 0) patchAt(g, patch);
            }}
            onRemove={(i) => {
              const g = topics.findIndex((t) => t === crosscut[i]);
              if (g >= 0) removeAt(g);
            }}
            onAdd={() => addSide("crosscut")}
            label="Crosscut"
          />
        </div>
      </SettingsSection>

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={() => save({ topics })} disabled={saving}>
          {saving ? "Saving…" : "Save topics"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Anchor cache rebuilds; primary_topic re-derived on save.
        </span>
      </div>
    </div>
  );
}
