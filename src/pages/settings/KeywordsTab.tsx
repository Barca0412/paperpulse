import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "./_parts";
import { useKeywords } from "@/hooks/useSettings";

function lines(arr: string[]): string {
  return arr.join("\n");
}
function parse(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

type Buckets = {
  cs_core: string;
  finance_core: string;
  crosscut: string;
  strong_negative: string;
  weak_negative: string;
  immune: string;
};

const EMPTY: Buckets = {
  cs_core: "",
  finance_core: "",
  crosscut: "",
  strong_negative: "",
  weak_negative: "",
  immune: "",
};

export default function KeywordsTab() {
  const { state, save, saving } = useKeywords();
  const [buckets, setBuckets] = useState<Buckets>(EMPTY);

  useEffect(() => {
    if (state.kind !== "ok") return;
    setBuckets({
      cs_core: lines(state.data.positive.cs_core ?? []),
      finance_core: lines(state.data.positive.finance_core ?? []),
      crosscut: lines(state.data.positive.crosscut ?? []),
      strong_negative: lines(state.data.strong_negative ?? []),
      weak_negative: lines(state.data.weak_negative ?? []),
      immune: lines(state.data.immune ?? []),
    });
  }, [state]);

  if (state.kind === "loading")
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading keywords…</div>
    );
  if (state.kind === "error")
    return <div className="p-6 text-sm text-destructive">{state.message}</div>;

  function onSave() {
    save({
      positive: {
        cs_core: parse(buckets.cs_core),
        finance_core: parse(buckets.finance_core),
        crosscut: parse(buckets.crosscut),
      },
      strong_negative: parse(buckets.strong_negative),
      weak_negative: parse(buckets.weak_negative),
      immune: parse(buckets.immune),
    });
  }

  return (
    <div className="p-6 max-w-4xl">
      <SettingsSection
        title="Keywords"
        description="L1 text filter. Positive terms are OR-ed (one hit passes). Negative terms penalize L2 scores; immune terms suppress the penalty. One term per line; case-insensitive."
      >
        <div className="space-y-5">
          {(["cs_core", "finance_core", "crosscut"] as const).map((k) => (
            <div key={k}>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px]">
                  {k.replace("_", " ")}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  positive
                </span>
              </div>
              <Textarea
                value={buckets[k]}
                onChange={(e) =>
                  setBuckets((b) => ({ ...b, [k]: e.target.value }))
                }
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          ))}
          {(["strong_negative", "weak_negative", "immune"] as const).map((k) => (
            <div key={k}>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={k === "immune" ? "default" : "destructive"}
                  className="text-[10px]"
                >
                  {k.replace("_", " ")}
                </Badge>
              </div>
              <Textarea
                value={buckets[k]}
                onChange={(e) =>
                  setBuckets((b) => ({ ...b, [k]: e.target.value }))
                }
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save keywords"}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              L1 rescores every paper automatically on save.
            </span>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
