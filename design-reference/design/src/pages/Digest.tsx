import { useState } from "react";
import { DIGESTS } from "@/mocks/digests";
import { Button } from "@/components/ui/button";
import { Copy, Download, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Minimal markdown renderer for headings/lists/strong (we control the input).
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (!buffer.length) return;
    // list or paragraph
    const isList = buffer.every((l) => /^\d+\.\s|^\-\s/.test(l));
    if (isList) {
      const ordered = /^\d+\./.test(buffer[0]);
      const Tag = ordered ? "ol" : "ul";
      out.push(
        <Tag key={out.length}>
          {buffer.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(l.replace(/^(\d+\.|\-)\s/, "")) }} />
          ))}
        </Tag>,
      );
    } else {
      out.push(<p key={out.length} dangerouslySetInnerHTML={{ __html: inline(buffer.join(" ")) }} />);
    }
    buffer = [];
  };
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  for (const line of lines) {
    if (/^#\s/.test(line)) {
      flush();
      out.push(<h1 key={out.length}>{line.replace(/^#\s/, "")}</h1>);
    } else if (/^##\s/.test(line)) {
      flush();
      out.push(<h2 key={out.length}>{line.replace(/^##\s/, "")}</h2>);
    } else if (/^###\s/.test(line)) {
      flush();
      out.push(<h3 key={out.length}>{line.replace(/^###\s/, "")}</h3>);
    } else if (line.trim() === "") {
      flush();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return out;
}

export default function Digest() {
  const [current, setCurrent] = useState(DIGESTS[0].id);
  const d = DIGESTS.find((x) => x.id === current)!;

  return (
    <div className="h-full flex overflow-hidden">
      <aside className="w-64 shrink-0 border-r overflow-y-auto">
        <div className="px-3 py-3 border-b">
          <h3 className="text-xs font-semibold">Weekly Digests</h3>
          <p className="text-[10px] text-muted-foreground">Generated every Monday</p>
        </div>
        <ul className="p-1">
          {DIGESTS.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => setCurrent(it.id)}
                className={cn(
                  "w-full text-left px-2.5 py-2 rounded-md text-xs hover:bg-accent/50 transition-colors",
                  current === it.id && "bg-accent",
                )}
              >
                <div className="font-mono text-[10px] text-muted-foreground">
                  {it.year} · W{it.weekNumber}
                </div>
                <div className="font-medium leading-snug mt-0.5">{it.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {it.startDate} → {it.endDate}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-6 py-3 flex items-center gap-2">
          <div className="text-xs text-muted-foreground font-mono">{d.year} W{d.weekNumber}</div>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="outline"><Download className="h-3 w-3" /> Markdown</Button>
            <Button size="sm" variant="outline"><Copy className="h-3 w-3" /> Copy</Button>
            <Button size="sm" variant="outline"><Share2 className="h-3 w-3" /> Share</Button>
          </div>
        </div>
        <article className="max-w-3xl mx-auto px-8 py-6 prose-digest zh">
          {renderMarkdown(d.markdown)}
        </article>
      </div>
    </div>
  );
}
