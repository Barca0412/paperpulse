import { Bell, Moon, Sun, User } from "lucide-react";
import { useStore } from "@/stores/app";
import { Button } from "@/components/ui/button";

// TODO Phase 6 PR #6.5: restore Cmd+K command palette button (placeholder span for now).

export function TopBar() {
  const { darkMode, toggleDarkMode } = useStore();
  return (
    <header className="h-12 shrink-0 border-b bg-background/80 backdrop-blur flex items-center px-3 gap-3">
      {/* macOS draws its real traffic lights in a separate title bar above us
          (default tauri titleBarStyle), so our header starts at the true left
          edge — no left-pad needed. design-reference's fake lights were for
          browser-only mockup mode. */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="h-3.5 w-3.5 text-white">
            <path
              d="M6 20 L11 14 L15 17 L20 10 L26 18"
              stroke="currentColor"
              strokeWidth="2.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="font-semibold text-sm tracking-tight">PaperPulse</div>
        <span className="text-[10px] text-muted-foreground font-mono">v0.1</span>
      </div>

      <div className="ml-6 flex-1 max-w-md h-7 px-2.5 rounded-md border bg-muted/40 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Search disabled — search ships in Phase 6 (M13)</span>
        <kbd className="ml-auto font-mono text-[10px] px-1 py-0.5 rounded bg-background border opacity-50">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title="Toggle dark mode">
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Account">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
