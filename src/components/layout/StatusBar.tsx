// Phase 1 placeholder. PR #1.7 replaces with a live /api/v1/hello probe.
export function StatusBar() {
  return (
    <footer className="h-7 shrink-0 border-t bg-muted/30 flex items-center gap-4 px-3 text-[11px] text-muted-foreground font-mono">
      <span className="opacity-50">●</span>
      <span>sidecar status: wired in PR #1.7</span>
      <div className="ml-auto flex items-center gap-3">
        <span>PaperPulse v0.1.0</span>
      </div>
    </footer>
  );
}
