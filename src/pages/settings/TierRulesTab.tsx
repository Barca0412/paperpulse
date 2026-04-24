import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { SettingsSection } from "./_parts";
import { useTiers } from "@/hooks/useSettings";
import { simulateTiers, type SimulateResult } from "@/lib/settings";
import { Plus, Trash2, Play } from "lucide-react";

const WEIGHT_KEYS = [
  "level2_similarity",
  "institution_whitelist",
  "citation_velocity",
  "pwc_has_code",
  "hf_daily_papers",
  "tracked_author",
] as const;

type WeightKey = (typeof WEIGHT_KEYS)[number];

const WEIGHT_LABELS: Record<WeightKey, string> = {
  level2_similarity: "L2 semantic similarity",
  institution_whitelist: "Institution whitelist",
  citation_velocity: "Citation velocity",
  pwc_has_code: "Code on PapersWithCode",
  hf_daily_papers: "HuggingFace Daily",
  tracked_author: "Tracked author",
};

export default function TierRulesTab() {
  const { state, save, saving } = useTiers();

  const [venues, setVenues] = useState<string[]>([]);
  const [newVenue, setNewVenue] = useState("");
  const [weights, setWeights] = useState<Record<WeightKey, number>>({
    level2_similarity: 0.3,
    institution_whitelist: 0.2,
    citation_velocity: 0.15,
    pwc_has_code: 0.1,
    hf_daily_papers: 0.1,
    tracked_author: 0.15,
  });
  const [threshold, setThreshold] = useState(0.5);

  const [simResult, setSimResult] = useState<SimulateResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    if (state.kind !== "ok") return;
    const tr = state.data.tier_rules;
    setVenues(tr.A?.venues ?? []);
    const w = tr.B_score?.weights ?? {};
    setWeights({
      level2_similarity: w.level2_similarity ?? 0.3,
      institution_whitelist: w.institution_whitelist ?? 0.2,
      citation_velocity: w.citation_velocity ?? 0.15,
      pwc_has_code: w.pwc_has_code ?? 0.1,
      hf_daily_papers: w.hf_daily_papers ?? 0.1,
      tracked_author: w.tracked_author ?? 0.15,
    });
    setThreshold(tr.B_score?.threshold ?? 0.5);
  }, [state]);

  if (state.kind === "loading")
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (state.kind === "error")
    return <div className="p-6 text-sm text-destructive">{state.message}</div>;

  function addVenue() {
    const v = newVenue.trim();
    if (!v) return;
    if (venues.includes(v)) return;
    setVenues([...venues, v]);
    setNewVenue("");
  }

  function removeVenue(v: string) {
    setVenues(venues.filter((x) => x !== v));
  }

  async function onSimulate() {
    setSimulating(true);
    setSimError(null);
    try {
      const r = await simulateTiers(venues, weights, threshold);
      setSimResult(r);
    } catch (e) {
      setSimError(String(e));
    } finally {
      setSimulating(false);
    }
  }

  function onSave() {
    save({
      tier_rules: {
        A: { venues, auto_include: true },
        B_score: { weights, threshold },
        C: {},
      },
    });
  }

  const weightsTotal = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <SettingsSection
        title="Tier A venues"
        description="Papers published at these venues skip L2 and are tier A by default."
      >
        <div className="flex items-center gap-2 mb-3">
          <Input
            className="h-8 text-xs max-w-sm"
            placeholder="Add venue, e.g. NeurIPS"
            value={newVenue}
            onChange={(e) => setNewVenue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addVenue();
            }}
          />
          <Button size="sm" variant="outline" onClick={addVenue}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {venues.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 text-[10px]">
              {v}
              <button
                onClick={() => removeVenue(v)}
                className="hover:text-destructive"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          {venues.length === 0 && (
            <span className="text-xs text-muted-foreground">
              No Tier-A venues configured.
            </span>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Tier B weights"
        description="Linear combination of signals; paper lands in Tier B when the sum clears the threshold."
      >
        <div className="space-y-3">
          {WEIGHT_KEYS.map((k) => (
            <div key={k} className="grid grid-cols-[200px_60px_1fr] gap-3 items-center">
              <span className="text-xs">{WEIGHT_LABELS[k]}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {weights[k].toFixed(2)}
              </span>
              <Slider
                value={[weights[k]]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) =>
                  setWeights((w) => ({ ...w, [k]: v }))
                }
              />
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground pt-1">
            Σ weights = {weightsTotal.toFixed(2)} (no auto-normalization)
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Tier B threshold"
        description="Papers scoring at or above this value are Tier B; below are Tier C."
      >
        <div className="grid grid-cols-[200px_60px_1fr] gap-3 items-center">
          <span className="text-xs">Threshold</span>
          <span className="font-mono text-xs text-muted-foreground">
            {threshold.toFixed(2)}
          </span>
          <Slider
            value={[threshold]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={([v]) => setThreshold(v)}
          />
        </div>
      </SettingsSection>

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={onSimulate} disabled={simulating}>
          <Play className="h-3 w-3" />{" "}
          {simulating ? "Simulating…" : "Simulate"}
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save tier rules"}
        </Button>
        <span className="text-[11px] text-muted-foreground ml-2">
          Save triggers L3 rescore for every L1-passed paper.
        </span>
      </div>

      {simError && (
        <div className="text-xs text-destructive">{simError}</div>
      )}
      {simResult && (
        <div className="rounded border p-3 text-xs flex gap-6">
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            <span className="font-mono">{simResult.total}</span>
          </div>
          <div>
            <Badge variant="default" className="mr-1">A</Badge>
            <span className="font-mono">{simResult.tier_a}</span>
          </div>
          <div>
            <Badge variant="secondary" className="mr-1">B</Badge>
            <span className="font-mono">{simResult.tier_b}</span>
          </div>
          <div>
            <Badge variant="outline" className="mr-1">C</Badge>
            <span className="font-mono">{simResult.tier_c}</span>
          </div>
        </div>
      )}
    </div>
  );
}
