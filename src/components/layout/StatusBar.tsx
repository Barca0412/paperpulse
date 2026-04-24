import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Health = { ok: boolean; version?: string; error?: string };

export function StatusBar() {
  const [state, setState] = useState<Health | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      api
        .health()
        .then((h) => !cancelled && setState({ ok: true, version: h.version }))
        .catch(
          (e) =>
            !cancelled &&
            setState({
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            }),
        );
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <footer className="h-7 shrink-0 border-t bg-muted/30 flex items-center gap-3 px-3 text-[11px] text-muted-foreground font-mono">
      <span className={state?.ok ? "text-emerald-500" : "text-red-500"}>●</span>
      <span>
        sidecar{" "}
        {state ? (state.ok ? `online · v${state.version}` : "offline") : "checking…"}
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span>PaperPulse v0.1.0</span>
      </div>
    </footer>
  );
}
