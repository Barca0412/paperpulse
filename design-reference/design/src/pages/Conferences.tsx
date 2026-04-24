import { useState } from "react";
import { CONFERENCES } from "@/mocks/conferences";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertTriangle, HelpCircle, User, ExternalLink, MapPin, CalendarDays } from "lucide-react";
import { shortDate } from "@/lib/utils";

const verifyIcon = {
  verified: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  needs_review: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  single_source: <HelpCircle className="h-3.5 w-3.5 text-slate-400" />,
  manual: <User className="h-3.5 w-3.5 text-sky-500" />,
};
const verifyLabel = { verified: "Verified", needs_review: "Needs review", single_source: "Single source", manual: "Manual" };

function daysAway(iso?: string) {
  if (!iso) return null;
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  return diff;
}

export default function Conferences() {
  const [reviewConf, setReviewConf] = useState<string | null>(null);
  const sorted = [...CONFERENCES].sort((a, b) => a.paperDeadline.localeCompare(b.paperDeadline));

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-bold tracking-tight">Conferences</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Deadlines, dates, and verification status.</p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="px-6 py-3 border-b bg-muted/20">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="p-6 grid grid-cols-2 gap-4">
          {sorted.map((c) => {
            const d = daysAway(c.paperDeadline);
            return (
              <Card key={c.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{c.name} {c.year}</CardTitle>
                      <CardDescription className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location}</span>
                        <span className="flex items-center gap-1 font-mono"><CalendarDays className="h-3 w-3" />{shortDate(c.startDate)} – {shortDate(c.endDate)}</span>
                      </CardDescription>
                    </div>
                    <button
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border hover:bg-accent"
                      onClick={() => c.verification === "needs_review" && setReviewConf(c.id)}
                    >
                      {verifyIcon[c.verification]}
                      {verifyLabel[c.verification]}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="rounded-md border p-2 bg-muted/30 font-mono grid grid-cols-[100px_1fr_auto] gap-y-1 gap-x-2">
                    {c.abstractDeadline && (
                      <>
                        <span className="text-muted-foreground">Abstract</span>
                        <span>{shortDate(c.abstractDeadline)}</span>
                        <span className="text-muted-foreground">{daysAway(c.abstractDeadline)}d</span>
                      </>
                    )}
                    <span className="text-muted-foreground">Paper</span>
                    <span className="font-semibold">{shortDate(c.paperDeadline)}</span>
                    <span className={d !== null && d < 30 ? "text-rose-500 font-semibold" : "text-muted-foreground"}>
                      {d !== null ? `${d}d` : ""}
                    </span>
                    {c.authorResponse && (
                      <>
                        <span className="text-muted-foreground">Response</span>
                        <span>{shortDate(c.authorResponse)}</span>
                        <span className="text-muted-foreground">{daysAway(c.authorResponse)}d</span>
                      </>
                    )}
                    {c.decision && (
                      <>
                        <span className="text-muted-foreground">Decision</span>
                        <span>{shortDate(c.decision)}</span>
                        <span className="text-muted-foreground">{daysAway(c.decision)}d</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.topics.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground">{c.relatedPapers} papers in PaperPulse</span>
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline flex items-center gap-1">
                      Official <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="calendar" className="p-6">
          <CalendarView />
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewConf} onOpenChange={(v) => !v && setReviewConf(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deadline needs review</DialogTitle>
            <DialogDescription>
              We found conflicting deadlines from multiple sources. Pick the correct one.
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs space-y-2">
            <div className="p-2 rounded border"><span className="font-mono text-muted-foreground">aideadlin.es</span>: May 15, 2026</div>
            <div className="p-2 rounded border"><span className="font-mono text-muted-foreground">conferences.yml</span>: May 22, 2026</div>
          </div>
          <RadioGroup defaultValue="b" className="gap-1.5 mt-2">
            <div className="flex items-center gap-2"><RadioGroupItem value="a" id="a" /><Label htmlFor="a">May 15</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="b" id="b" /><Label htmlFor="b">May 22</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="c" id="c" /><Label htmlFor="c">Other</Label></div>
          </RadioGroup>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={() => setReviewConf(null)}>Remind me later</Button>
            <Button size="sm" onClick={() => setReviewConf(null)}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarView() {
  const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
  return (
    <div className="grid grid-cols-3 gap-3">
      {months.map((m) => {
        const deadlines = CONFERENCES.filter((c) => c.paperDeadline.startsWith(m) || c.abstractDeadline?.startsWith(m));
        const [y, mo] = m.split("-");
        const label = new Date(+y, +mo - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
        const daysInMonth = new Date(+y, +mo, 0).getDate();
        const firstWeekday = new Date(+y, +mo - 1, 1).getDay();
        const cells: (number | null)[] = Array(firstWeekday).fill(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        return (
          <Card key={m}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
                {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="font-semibold text-muted-foreground py-0.5">{d}</div>)}
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dayStr = `${m}-${String(day).padStart(2, "0")}`;
                  const dl = deadlines.filter((c) => c.paperDeadline === dayStr || c.abstractDeadline === dayStr);
                  return (
                    <div key={i} className={`aspect-square rounded flex flex-col items-center justify-center relative ${dl.length ? "bg-rose-500/15" : ""}`}>
                      <span className="font-mono text-muted-foreground">{day}</span>
                      {dl.length > 0 && <span className="absolute bottom-0.5 text-[8px] font-semibold text-rose-600 truncate max-w-full px-0.5">{dl[0].name}</span>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
