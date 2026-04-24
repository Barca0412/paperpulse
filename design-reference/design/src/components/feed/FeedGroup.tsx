import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  defaultOpen?: boolean;
  color?: string;
  accent?: React.ReactNode;
  children: React.ReactNode;
}

export function FeedGroup({ title, subtitle, count, defaultOpen = true, accent, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-5">
      <header
        className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm flex items-center gap-2 py-1.5 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <button className="text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {accent}
        <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
        <Badge variant="secondary" className="font-mono">{count}</Badge>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </header>
      <div className={cn("mt-2 space-y-2 transition-all", !open && "hidden")}>
        {children}
      </div>
    </section>
  );
}
