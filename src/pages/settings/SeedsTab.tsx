import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "./_parts";
import { useSeeds } from "@/hooks/useSettings";
import type { SeedPaper } from "@/lib/settings";
import { Plus, Trash2 } from "lucide-react";

type Row = SeedPaper;

function emptyRow(): Row {
  return {
    id: null,
    title: "",
    abstract: "",
    doi: null,
    arxiv_id: null,
    base_weight: 1.0,
    half_life_days: null,
    added_at: null,
  };
}

function SeedTable({
  rows,
  onChange,
  onRemove,
  showHalfLife,
}: {
  rows: Row[];
  onChange: (i: number, patch: Partial<Row>) => void;
  onRemove: (i: number) => void;
  showHalfLife: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4">No seeds yet.</p>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-start">
          <Input
            className="col-span-4 h-8 text-xs"
            placeholder="Title"
            value={r.title}
            onChange={(e) => onChange(i, { title: e.target.value })}
          />
          <Input
            className="col-span-2 h-8 text-xs font-mono"
            placeholder="arxiv / doi"
            value={r.arxiv_id ?? r.doi ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim() || null;
              if (v && v.includes("/")) onChange(i, { doi: v });
              else onChange(i, { arxiv_id: v });
            }}
          />
          <Input
            className="col-span-1 h-8 text-xs font-mono"
            type="number"
            step="0.1"
            value={r.base_weight}
            onChange={(e) =>
              onChange(i, { base_weight: Number(e.target.value) || 0 })
            }
          />
          {showHalfLife && (
            <Input
              className="col-span-1 h-8 text-xs font-mono"
              type="number"
              step="1"
              placeholder="half-life"
              value={r.half_life_days ?? ""}
              onChange={(e) =>
                onChange(i, {
                  half_life_days: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          )}
          <Textarea
            className={`${showHalfLife ? "col-span-3" : "col-span-4"} text-xs min-h-[32px]`}
            rows={2}
            placeholder="Abstract (used as L2 anchor)"
            value={r.abstract ?? ""}
            onChange={(e) => onChange(i, { abstract: e.target.value })}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(i)}
            className="col-span-1 h-8"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function SeedsTab() {
  const { state, save, saving } = useSeeds();
  const [canon, setCanon] = useState<Row[]>([]);
  const [mustRead, setMustRead] = useState<Row[]>([]);

  useEffect(() => {
    if (state.kind !== "ok") return;
    setCanon(state.data.seed_papers);
    setMustRead(state.data.user_must_read_papers);
  }, [state]);

  if (state.kind === "loading")
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (state.kind === "error")
    return <div className="p-6 text-sm text-destructive">{state.message}</div>;

  function patchAt<T>(list: T[], i: number, patch: Partial<T>): T[] {
    return list.map((x, j) => (i === j ? { ...x, ...patch } : x));
  }

  function addUserSeed() {
    setMustRead((rows) => [
      ...rows,
      { ...emptyRow(), added_at: new Date().toISOString() },
    ]);
  }

  function addCanonSeed() {
    setCanon((rows) => [...rows, emptyRow()]);
  }

  function onSave() {
    save({
      seed_papers: canon,
      user_must_read_papers: mustRead,
      seed_meta: state.kind === "ok" ? state.data.seed_meta : {},
    });
  }

  return (
    <div className="p-6 max-w-5xl">
      <SettingsSection
        title="Seeds"
        description="L2 anchor papers. Canonical seeds carry full weight indefinitely; user 'must-read' seeds apply a half-life decay so temporary interests fade. Anchor cache re-embeds on save."
      >
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary">Canonical ({canon.length})</Badge>
          <span className="text-[10px] text-muted-foreground">no decay</span>
          <Button
            size="sm"
            variant="outline"
            onClick={addCanonSeed}
            className="ml-auto"
          >
            <Plus className="h-3 w-3" /> Add canonical
          </Button>
        </div>
        <SeedTable
          rows={canon}
          onChange={(i, patch) => setCanon((r) => patchAt(r, i, patch))}
          onRemove={(i) => setCanon((r) => r.filter((_, j) => j !== i))}
          showHalfLife={false}
        />
      </SettingsSection>

      <SettingsSection
        title=" "
        description=""
      >
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="default">Must-read ({mustRead.length})</Badge>
          <span className="text-[10px] text-muted-foreground">
            half-life decay
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={addUserSeed}
            className="ml-auto"
          >
            <Plus className="h-3 w-3" /> Add must-read
          </Button>
        </div>
        <SeedTable
          rows={mustRead}
          onChange={(i, patch) => setMustRead((r) => patchAt(r, i, patch))}
          onRemove={(i) => setMustRead((r) => r.filter((_, j) => j !== i))}
          showHalfLife={true}
        />
      </SettingsSection>

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save seeds"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          L2 rescores recent papers on save.
        </span>
      </div>
    </div>
  );
}
