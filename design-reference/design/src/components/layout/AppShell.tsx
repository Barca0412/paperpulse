import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { StatusBar } from "./StatusBar";
import { useStore } from "@/stores/app";
import { CommandPalette } from "@/components/CommandPalette";

export function AppShell() {
  const darkMode = useStore((s) => s.darkMode);
  const setCommandOpen = useStore((s) => s.setCommandOpen);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <SideNav />
        <main className="flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
    </div>
  );
}
