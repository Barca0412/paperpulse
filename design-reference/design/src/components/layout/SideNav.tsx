import { NavLink } from "react-router-dom";
import {
  Newspaper,
  Search,
  BarChart3,
  Network,
  GraduationCap,
  FileText,
  Building2,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainItems = [
  { to: "/feed", icon: Newspaper, label: "Feed" },
  { to: "/explore", icon: Search, label: "Explore" },
  { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { to: "/network", icon: Network, label: "Network" },
  { to: "/conferences", icon: GraduationCap, label: "Conferences" },
  { to: "/digest", icon: FileText, label: "Weekly Digest" },
];

const libraryItems = [
  { to: "/institutions", icon: Building2, label: "Institutions" },
  { to: "/authors", icon: Users, label: "Authors" },
];

const itemCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-foreground/80 hover:bg-accent/70 transition-colors",
    isActive && "bg-accent text-foreground font-medium",
  );

export function SideNav() {
  return (
    <aside className="w-56 shrink-0 border-r bg-muted/30 flex flex-col h-full">
      <nav className="flex flex-col gap-0.5 p-2">
        {mainItems.map((it) => (
          <NavLink key={it.to} to={it.to} className={itemCls}>
            <it.icon className="h-4 w-4 opacity-80" />
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Library
      </div>
      <nav className="flex flex-col gap-0.5 p-2 pt-0">
        {libraryItems.map((it) => (
          <NavLink key={it.to} to={it.to} className={itemCls}>
            <it.icon className="h-4 w-4 opacity-80" />
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-2 border-t">
        <NavLink to="/settings/sources" className={itemCls}>
          <SettingsIcon className="h-4 w-4 opacity-80" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
