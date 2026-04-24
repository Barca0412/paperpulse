import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Rss, Target, Building2, Users, Star, Newspaper, FileText,
  Hammer, Bell, Database, Plug, Cloud, HelpCircle, BookOpen,
} from "lucide-react";

const sections = [
  {
    heading: "Pipeline",
    items: [
      { to: "sources", icon: Rss, label: "Sources" },
      { to: "topics", icon: Target, label: "Topics" },
      { to: "institutions", icon: Building2, label: "Institutions" },
      { to: "authors", icon: Users, label: "Authors" },
      { to: "scoring", icon: Star, label: "Scoring" },
    ],
  },
  {
    heading: "Delivery",
    items: [
      { to: "feed", icon: Newspaper, label: "Feed display" },
      { to: "digest", icon: FileText, label: "Digest" },
      { to: "llm", icon: Hammer, label: "LLM" },
      { to: "notifications", icon: Bell, label: "Notifications" },
    ],
  },
  {
    heading: "System",
    items: [
      { to: "data", icon: Database, label: "Data" },
      { to: "integrations", icon: Plug, label: "Integrations" },
      { to: "deployment", icon: Cloud, label: "Deployment" },
      { to: "about", icon: HelpCircle, label: "About" },
    ],
  },
];

export default function Settings() {
  const loc = useLocation();
  const breadcrumb = loc.pathname.replace("/settings/", "").split("/").filter(Boolean);
  return (
    <div className="h-full flex overflow-hidden">
      <aside className="w-52 border-r shrink-0 overflow-y-auto bg-muted/20">
        <div className="px-3 py-3 border-b">
          <h2 className="text-sm font-bold">Settings</h2>
          <p className="text-[10px] text-muted-foreground">14 sections</p>
        </div>
        {sections.map((sec) => (
          <div key={sec.heading} className="py-2">
            <div className="px-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {sec.heading}
            </div>
            <nav className="px-1 flex flex-col gap-0.5">
              {sec.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded text-xs hover:bg-accent/70",
                      isActive && "bg-accent font-medium",
                    )
                  }
                >
                  <it.icon className="h-3.5 w-3.5 opacity-75" />
                  {it.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </aside>
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-6 py-2.5 text-[11px] text-muted-foreground font-mono">
          Settings / {breadcrumb.join(" / ")}
        </div>
        <Outlet />
      </div>
    </div>
  );
}
