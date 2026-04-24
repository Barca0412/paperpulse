import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { cn } from "@/lib/utils";
import KeywordsTab from "./KeywordsTab";
import SeedsTab from "./SeedsTab";
import TopicsTab from "./TopicsTab";

const TABS = [
  { slug: "keywords", label: "Keywords" },
  { slug: "seeds", label: "Seeds" },
  { slug: "topics", label: "Topics" },
  { slug: "tiers", label: "Tier Rules" },
];

function Stub({ pr }: { pr: string }) {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      Coming in {pr}.
    </div>
  );
}

export default function Settings() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 border-b">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Edit filter rules. Changes take effect immediately.
        </p>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <nav className="w-48 border-r p-3 flex flex-col gap-1 shrink-0">
          {TABS.map((t) => (
            <NavLink
              key={t.slug}
              to={t.slug}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-xs rounded hover:bg-muted transition-colors",
                  isActive && "bg-muted font-medium",
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route index element={<Navigate to="keywords" replace />} />
            <Route path="keywords" element={<KeywordsTab />} />
            <Route path="seeds" element={<SeedsTab />} />
            <Route path="topics" element={<TopicsTab />} />
            <Route path="tiers" element={<Stub pr="PR #3.5" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
