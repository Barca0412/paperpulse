import { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  X,
  ExternalLink,
  Code2,
  Flame,
  Star,
  TrendingUp,
  UserCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import type { Paper } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn, relativeDate } from "@/lib/utils";
import { TOPIC_BY_SLUG } from "@/mocks/topics";
import { INST_BY_ID } from "@/mocks/institutions";
import { useStore } from "@/stores/app";

interface Props {
  paper: Paper;
  selected?: boolean;
  expanded?: boolean;
  onSelect?: () => void;
  onToggleExpand?: () => void;
}

const tierVariant = { A: "tierA", B: "tierB", C: "tierC" } as const;

export function PaperCard({ paper, selected, expanded, onSelect, onToggleExpand }: Props) {
  const setStatus = useStore((s) => s.setStatus);
  const [note, setNote] = useState(paper.notes ?? "");
  const [score, setScore] = useState([paper.relevance]);

  const insts = Array.from(
    new Set(paper.authors.map((a) => INST_BY_ID[a.institutionId]?.short).filter(Boolean)),
  );
  const shownAuthors = paper.authors.slice(0, 3);
  const extraAuthors = paper.authors.length - shownAuthors.length;

  const isSaved = paper.status === "saved";
  const isMust = paper.status === "must_read";
  const isIgnored = paper.status === "ignored";

  return (
    <article
      className={cn(
        "group relative rounded-lg border bg-card px-4 py-3 transition-all",
        "hover:shadow-sm hover:border-foreground/20",
        selected && "ring-1 ring-ring border-ring",
        isMust && "border-l-[3px] border-l-rose-500",
        isIgnored && "opacity-40",
      )}
      onClick={onSelect}
    >
      {selected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sky-500 rounded-l-lg" />
      )}
      {/* Header row */}
      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-muted-foreground">
        <Badge variant={tierVariant[paper.tier]} className="font-mono">
          {paper.tier}
        </Badge>
        {paper.topics.slice(0, 3).map((slug) => {
          const t = TOPIC_BY_SLUG[slug];
          if (!t) return null;
          return (
            <Badge key={slug} variant={t.side}>
              {t.name}
            </Badge>
          );
        })}
        <span className="ml-auto font-mono">{relativeDate(paper.date)}</span>
        {isSaved && <BookmarkCheck className="h-3.5 w-3.5 text-sky-500" />}
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold leading-snug text-foreground/95 line-clamp-2" title={paper.title}>
        {paper.title}
      </h3>

      {/* Authors & insts */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
        <span>
          {shownAuthors.map((a) => a.name).join(", ")}
          {extraAuthors > 0 && <span className="italic"> et al.</span>}
        </span>
        <span className="opacity-40">·</span>
        <span className="text-foreground/70">{insts.join(" · ")}</span>
        <span className="opacity-40">·</span>
        <span className="font-mono text-[10px]">{paper.arxivId || paper.doi}</span>
      </div>

      {/* TL;DR */}
      <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">{paper.tldrEN}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground zh">{paper.tldrZH}</p>

      {/* Signals row */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          <span className="font-mono font-medium text-foreground/80">{paper.relevance.toFixed(1)}</span>
        </span>
        {paper.citationsPerWeek > 0 && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-purple-500" />
            <span className="font-mono">{paper.citationsPerWeek} cites/7d</span>
          </span>
        )}
        {paper.hasCode && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Code2 className="h-3 w-3" />
            code
          </span>
        )}
        {paper.hfDaily && (
          <span className="flex items-center gap-1 text-orange-500">
            <Flame className="h-3 w-3" />
            HF Daily
          </span>
        )}
        {paper.trackedAuthor && (
          <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <UserCheck className="h-3 w-3" />
            tracked
          </span>
        )}
        <span className="ml-auto uppercase text-[10px] tracking-wider font-mono opacity-60">
          {paper.source}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              Abstract
            </div>
            <p className="text-xs leading-relaxed text-foreground/85">{paper.abstractEN}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                All authors
              </div>
              <div className="text-foreground/80">
                {paper.authors.map((a) => `${a.name} (${INST_BY_ID[a.institutionId]?.short || "?"})`).join(", ")}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                Venue · ID
              </div>
              <div className="font-mono text-foreground/80">
                {paper.venue} · {paper.arxivId || paper.doi}
              </div>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              My score
            </div>
            <div className="flex items-center gap-3">
              <Slider min={0} max={10} step={0.1} value={score} onValueChange={setScore} className="max-w-xs" />
              <span className="font-mono text-sm w-10 text-right">{score[0].toFixed(1)}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              Notes
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Your private notes…"
              className="text-xs"
            />
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="mt-3 flex items-center gap-1.5">
        <Button
          size="sm"
          variant={isSaved ? "secondary" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            setStatus(paper.id, isSaved ? "unread" : "saved");
          }}
        >
          <Bookmark className="h-3 w-3" />
          {isSaved ? "Saved" : "Save"}
        </Button>
        <Button
          size="sm"
          variant={isMust ? "secondary" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            setStatus(paper.id, isMust ? "unread" : "must_read");
          }}
          className={isMust ? "text-rose-600 dark:text-rose-400" : ""}
        >
          <AlertCircle className="h-3 w-3" />
          Must read
        </Button>
        <Button
          size="sm"
          variant={isIgnored ? "secondary" : "ghost"}
          onClick={(e) => {
            e.stopPropagation();
            setStatus(paper.id, isIgnored ? "unread" : "ignored");
          }}
        >
          <X className="h-3 w-3" />
          Ignore
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={paper.pdfUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />
            PDF
          </a>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Expand
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
