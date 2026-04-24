import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { StatusBar } from "./StatusBar";
import { useStore } from "@/stores/app";

// TODO Phase 6 PR #6.5: wire CommandPalette (Cmd+K) — depends on FTS5 search.

export function AppShell() {
  const darkMode = useStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <SideNav />
        <main className="flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
