import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Newspaper,
  BarChart3,
  Settings as SettingsIcon,
  RefreshCw,
  FileText,
  Users,
  Building2,
  Search,
} from "lucide-react";
import { useStore } from "@/stores/app";
import { PAPERS } from "@/mocks/papers";
import { AUTHORS } from "@/mocks/authors";

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useStore();
  const navigate = useNavigate();
  const go = (path: string) => () => {
    navigate(path);
    setCommandOpen(false);
  };

  useEffect(() => {
    if (!commandOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen]);

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search papers, authors, institutions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={go("/feed")}>
            <Newspaper className="mr-2 h-4 w-4" />
            Go to Feed
          </CommandItem>
          <CommandItem onSelect={go("/dashboard")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Go to Dashboard
          </CommandItem>
          <CommandItem onSelect={go("/settings/sources")}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            Go to Settings
          </CommandItem>
          <CommandItem onSelect={() => { console.log("ingest"); setCommandOpen(false); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Run ingest now
          </CommandItem>
          <CommandItem onSelect={() => { console.log("digest"); setCommandOpen(false); }}>
            <FileText className="mr-2 h-4 w-4" />
            Generate weekly digest
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Recent papers">
          {PAPERS.slice(0, 6).map((p) => (
            <CommandItem key={p.id} onSelect={go(`/feed?p=${p.id}`)}>
              <Search className="mr-2 h-4 w-4 opacity-60" />
              <span className="truncate">{p.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tracked authors">
          {AUTHORS.filter((a) => a.tracked).slice(0, 6).map((a) => (
            <CommandItem key={a.id} onSelect={go(`/authors?id=${a.id}`)}>
              <Users className="mr-2 h-4 w-4 opacity-60" />
              {a.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Institutions">
          <CommandItem onSelect={go("/institutions")}>
            <Building2 className="mr-2 h-4 w-4 opacity-60" />
            Browse institutions
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
