import { useState } from "react";
import { SettingsSection, SettingsRow, SettingsCard } from "./_parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, Play, Pause, CheckCircle2, AlertTriangle, Edit3,
  Power, Flame, Code2, UserCheck, TestTube, Save, History, Copy, ExternalLink,
} from "lucide-react";
import { INSTITUTIONS } from "@/mocks/institutions";
import { AUTHORS } from "@/mocks/authors";
import { TOPICS } from "@/mocks/topics";
import { cn } from "@/lib/utils";

// ═══════════════════════════ SOURCES ═══════════════════════════
const SOURCES = [
  { id: "arxiv", name: "arXiv OAI-PMH", categories: ["cs.LG", "q-fin.CP", "q-fin.PM", "q-fin.TR", "stat.ML"], enabled: true, freq: "hourly", last: "12 min ago", status: "ok" as const, count: 3212 },
  { id: "ssrn", name: "SSRN Top Finance", categories: ["FEN", "CGN"], enabled: true, freq: "daily", last: "6 hours ago", status: "ok" as const, count: 1842 },
  { id: "crossref", name: "Crossref DOI", categories: [], enabled: true, freq: "daily", last: "3 hours ago", status: "ok" as const, count: 921 },
  { id: "s2", name: "Semantic Scholar", categories: ["Finance", "CS"], enabled: true, freq: "daily", last: "14 hours ago", status: "warn" as const, count: 440 },
  { id: "hf", name: "HuggingFace Daily", categories: [], enabled: true, freq: "daily", last: "1 hour ago", status: "ok" as const, count: 87 },
  { id: "rss_bloomberg", name: "Bloomberg Research RSS", categories: [], enabled: false, freq: "daily", last: "n/a", status: "off" as const, count: 0 },
  { id: "biorxiv", name: "bioRxiv", categories: [], enabled: false, freq: "daily", last: "n/a", status: "off" as const, count: 0 },
];

export function SourcesTab() {
  const [sources, setSources] = useState(SOURCES);
  return (
    <div className="p-6 max-w-5xl">
      <SettingsSection title="Sources" description="Where PaperPulse pulls papers from. Toggle each source, configure categories, and trigger a manual ingest.">
        <div className="flex items-center gap-2 mb-3">
          <Button size="sm"><Plus className="h-3 w-3" /> Add custom source</Button>
          <Button size="sm" variant="outline"><Play className="h-3 w-3" /> Run ingest now</Button>
          <div className="ml-auto text-xs text-muted-foreground font-mono">Next scheduled: 00:37</div>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr className="text-left">
                <th className="py-2 px-3 w-12">On</th>
                <th className="py-2 px-3">Source</th>
                <th className="py-2 px-3 w-40">Categories</th>
                <th className="py-2 px-3 w-24">Frequency</th>
                <th className="py-2 px-3 w-28">Last run</th>
                <th className="py-2 px-3 w-20">Status</th>
                <th className="py-2 px-3 w-24 text-right">30d papers</th>
                <th className="py-2 px-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 px-3"><Switch checked={s.enabled} /></td>
                  <td className="py-2 px-3 font-medium">{s.name}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {s.categories.length
                        ? s.categories.map((c) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 capitalize text-muted-foreground">{s.freq}</td>
                  <td className="py-2 px-3 text-muted-foreground font-mono">{s.last}</td>
                  <td className="py-2 px-3">
                    {s.status === "ok" && <Badge variant="tierA"><CheckCircle2 className="h-2.5 w-2.5" /> OK</Badge>}
                    {s.status === "warn" && <Badge variant="tierB"><AlertTriangle className="h-2.5 w-2.5" /> Warn</Badge>}
                    {s.status === "off" && <Badge variant="secondary"><Power className="h-2.5 w-2.5" /> Off</Badge>}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{s.count}</td>
                  <td className="py-2 px-3">
                    <Button size="sm" variant="ghost" className="text-[11px]"><Edit3 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-[11px]"><Play className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </div>
  );
}

// ═══════════════════════════ TOPICS ═══════════════════════════
export function TopicsTab() {
  return (
    <div className="p-6 max-w-5xl">
      <SettingsSection title="Topics" description="Topic taxonomy splits into Finance-ML (buy-side signal relevance) and CS-core (algorithmic infrastructure). Weights feed the scoring engine.">
        <div className="flex items-center gap-2 mb-3">
          <Button size="sm"><Plus className="h-3 w-3" /> Add topic</Button>
          <Button size="sm" variant="outline"><Copy className="h-3 w-3" /> Import template</Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
              <Badge variant="finance" className="text-[10px]">FINANCE-ML</Badge>
              <span className="text-muted-foreground">({TOPICS.filter((t) => t.side === "finance").length})</span>
            </h3>
            <div className="space-y-1.5">
              {TOPICS.filter((t) => t.side === "finance").map((t) => (
                <TopicRow key={t.slug} topic={t} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
              <Badge variant="cs" className="text-[10px]">CS-CORE</Badge>
              <span className="text-muted-foreground">({TOPICS.filter((t) => t.side === "cs").length})</span>
            </h3>
            <div className="space-y-1.5">
              {TOPICS.filter((t) => t.side === "cs").map((t) => (
                <TopicRow key={t.slug} topic={t} />
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
function TopicRow({ topic }: { topic: typeof TOPICS[number] }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded border bg-card hover:border-foreground/30 text-xs">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{topic.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{topic.descEN}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground">w</span>
        <Input className="h-6 w-12 text-[10px] text-center font-mono" defaultValue={topic.weight.toFixed(1)} />
      </div>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Edit3 className="h-3 w-3" /></Button>
    </div>
  );
}

// ═══════════════════════════ INSTITUTIONS (settings) ═══════════════════════════
export function InstitutionsTab() {
  return (
    <div className="p-6 max-w-5xl">
      <SettingsSection title="Institution whitelist" description="Papers from whitelisted institutions get an automatic tier bump (+1 tier). Edit the whitelist here.">
        <SettingsCard title="Whitelist rules">
          <SettingsRow label="Auto-whitelist top-ranked" hint="Import top-50 from CSRankings / QuantNet annually.">
            <Switch defaultChecked />
          </SettingsRow>
          <SettingsRow label="Tier bump on match" hint="How much to promote papers with a whitelisted author.">
            <Select defaultValue="1">
              <SelectTrigger className="w-32 h-7"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No bump</SelectItem>
                <SelectItem value="1">+1 tier</SelectItem>
                <SelectItem value="2">+2 tiers</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsCard>
        <div className="mt-4 rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr className="text-left">
                <th className="py-2 px-3 w-16">Flag</th>
                <th className="py-2 px-3">Institution</th>
                <th className="py-2 px-3 w-28">Type</th>
                <th className="py-2 px-3 w-24">Country</th>
                <th className="py-2 px-3 w-24">Whitelist</th>
                <th className="py-2 px-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {INSTITUTIONS.slice(0, 12).map((i) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-2 px-3 text-base">{i.flag}</td>
                  <td className="py-2 px-3 font-medium">{i.name}</td>
                  <td className="py-2 px-3 text-muted-foreground capitalize">{i.type.replace("_", " ")}</td>
                  <td className="py-2 px-3 text-muted-foreground">{i.country}</td>
                  <td className="py-2 px-3"><Switch defaultChecked={i.whitelisted} /></td>
                  <td className="py-2 px-3"><Button size="sm" variant="ghost"><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </div>
  );
}

// ═══════════════════════════ AUTHORS (settings) ═══════════════════════════
export function AuthorsTab() {
  return (
    <div className="p-6 max-w-5xl">
      <SettingsSection title="Tracked authors" description="When a tracked author publishes, you get a notification and the paper is auto-promoted.">
        <SettingsCard title="Tracking rules">
          <SettingsRow label="Notify immediately" hint="Send a push notification when a tracked author posts.">
            <Switch defaultChecked />
          </SettingsRow>
          <SettingsRow label="Auto-tier bump" hint="Promote papers by tracked authors by one tier.">
            <Switch defaultChecked />
          </SettingsRow>
        </SettingsCard>
        <div className="mt-4 rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr className="text-left">
                <th className="py-2 px-3">Author</th>
                <th className="py-2 px-3 w-40">Institution</th>
                <th className="py-2 px-3 w-20 text-right">h-idx</th>
                <th className="py-2 px-3 w-20 text-center">Track</th>
                <th className="py-2 px-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {AUTHORS.filter((a) => a.tracked).map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium">{a.name}</td>
                  <td className="py-2 px-3 text-muted-foreground">{INSTITUTIONS.find((i) => i.id === a.institutionId)?.short}</td>
                  <td className="py-2 px-3 text-right font-mono">{a.hIndex}</td>
                  <td className="py-2 px-3 text-center"><Switch defaultChecked={a.tracked} /></td>
                  <td className="py-2 px-3"><Button size="sm" variant="ghost"><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </div>
  );
}

// ═══════════════════════════ SCORING ═══════════════════════════
export function ScoringTab() {
  return (
    <div className="p-6 max-w-4xl">
      <SettingsSection title="Scoring engine" description="The formula that converts raw signals into a tier A / B / C decision. Edit weights, thresholds, and test with a sample paper.">
        <SettingsCard title="Signal weights" description="Linear combination — weights should sum to 1.0 ideally.">
          <WeightRow label="Topic match" def={0.35} />
          <WeightRow label="Institution whitelist" def={0.15} />
          <WeightRow label="Tracked author" def={0.15} />
          <WeightRow label="Venue prestige" def={0.10} />
          <WeightRow label="Citations / 7d" def={0.10} />
          <WeightRow label="HF Daily pick" def={0.08} />
          <WeightRow label="Has code" def={0.07} />
        </SettingsCard>
        <div className="mt-4">
          <SettingsCard title="Tier thresholds" description="Score cutoffs for each tier.">
            <SettingsRow label="Tier A cutoff" hint="Must-reads — top signals across the board.">
              <ThresholdInput def={0.75} />
            </SettingsRow>
            <SettingsRow label="Tier B cutoff" hint="Worth skimming — at least a few strong signals.">
              <ThresholdInput def={0.45} />
            </SettingsRow>
            <SettingsRow label="Tier C cutoff" hint="Everything else is Tier C (noise floor).">
              <span className="text-xs text-muted-foreground font-mono">auto: below B</span>
            </SettingsRow>
          </SettingsCard>
        </div>
        <div className="mt-4">
          <SettingsCard title="Test scorer" description="Paste an arXiv ID to preview what score & tier this paper would receive.">
            <div className="flex gap-2">
              <Input placeholder="e.g. arXiv:2604.13502" className="h-8 text-xs font-mono" defaultValue="arXiv:2604.13502" />
              <Button size="sm"><TestTube className="h-3 w-3" /> Score</Button>
            </div>
            <div className="mt-3 rounded border bg-muted/30 p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between"><span className="text-muted-foreground">Title:</span><span>Diffusion-Constrained Monte Carlo…</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Topic match:</span><span>+0.35 · derivatives, diffusion-finance</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Inst whitelist:</span><span>+0.15 · Stanford</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tracked author:</span><span>+0.15 · Bryan Kelly</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Venue:</span><span>+0.08 · arXiv cs.LG</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Citations:</span><span>+0.00 · too new</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">HF Daily:</span><span>+0.00</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span>+0.07 ✓</span></div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold"><span>TOTAL:</span><span>0.80 → Tier <Badge variant="tierA">A</Badge></span></div>
            </div>
          </SettingsCard>
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm"><Save className="h-3 w-3" /> Save changes</Button>
          <Button size="sm" variant="outline"><History className="h-3 w-3" /> Version history</Button>
          <Button size="sm" variant="outline">Reset to defaults</Button>
        </div>
      </SettingsSection>
    </div>
  );
}
function WeightRow({ label, def }: { label: string; def: number }) {
  const [v, setV] = useState([def]);
  return (
    <div className="grid grid-cols-[200px_1fr_60px] gap-3 items-center py-1.5">
      <Label className="text-xs">{label}</Label>
      <Slider min={0} max={1} step={0.01} value={v} onValueChange={setV} />
      <Input className="h-7 text-xs font-mono text-center" value={v[0].toFixed(2)} onChange={(e) => setV([parseFloat(e.target.value) || 0])} />
    </div>
  );
}
function ThresholdInput({ def }: { def: number }) {
  return <Input className="w-24 h-7 text-xs font-mono" defaultValue={def.toFixed(2)} />;
}

// ═══════════════════════════ FEED DISPLAY ═══════════════════════════
export function FeedTab() {
  return (
    <div className="p-6 max-w-3xl">
      <SettingsSection title="Feed display" description="How your feed looks and behaves.">
        <SettingsCard title="Presentation">
          <SettingsRow label="Default density" hint="How tightly paper cards pack on screen.">
            <RadioGroup defaultValue="normal" className="flex gap-3">
              <label className="flex items-center gap-1.5 text-xs"><RadioGroupItem value="compact" /> Compact</label>
              <label className="flex items-center gap-1.5 text-xs"><RadioGroupItem value="normal" /> Normal</label>
              <label className="flex items-center gap-1.5 text-xs"><RadioGroupItem value="comfortable" /> Comfortable</label>
            </RadioGroup>
          </SettingsRow>
          <SettingsRow label="Show Chinese TL;DR" hint="Display zh-CN translation below every English TL;DR.">
            <Switch defaultChecked />
          </SettingsRow>
          <SettingsRow label="Auto-expand first paper" hint="On load, expand the top-scoring paper inline.">
            <Switch />
          </SettingsRow>
          <SettingsRow label="Sort default" hint="Sort order when the Feed opens.">
            <Select defaultValue="date_desc">
              <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest first</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="tier">Tier</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsCard>
        <div className="mt-4">
          <SettingsCard title="Ignored topics" description="Papers mapped only to these topics never appear in Feed.">
            <div className="flex flex-wrap gap-1.5">
              {["blockchain", "nft", "metaverse"].map((t) => (
                <Badge key={t} variant="secondary" className="text-[11px] gap-1">
                  {t} <button><Trash2 className="h-2.5 w-2.5" /></button>
                </Badge>
              ))}
              <Button size="sm" variant="outline" className="h-6 text-[11px]"><Plus className="h-3 w-3" /> Add</Button>
            </div>
          </SettingsCard>
        </div>
      </SettingsSection>
    </div>
  );
}

// ═══════════════════════════ DIGEST ═══════════════════════════
export function DigestTab() {
  return (
    <div className="p-6 max-w-3xl">
      <SettingsSection title="Weekly digest" description="Generated every Monday morning at 9 AM.">
        <SettingsCard title="Schedule">
          <SettingsRow label="Enable weekly digest"><Switch defaultChecked /></SettingsRow>
          <SettingsRow label="Day of week" hint="When the digest is built & sent.">
            <Select defaultValue="mon">
              <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) => (
                  <SelectItem key={d} value={d.slice(0,3).toLowerCase()}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow label="Generation time">
            <Input type="time" defaultValue="09:00" className="w-32 h-7" />
          </SettingsRow>
          <SettingsRow label="Timezone">
            <Select defaultValue="Asia/Shanghai">
              <SelectTrigger className="w-56 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsCard>
        <div className="mt-4"><SettingsCard title="Content">
          <SettingsRow label="Top picks count"><Input type="number" defaultValue={5} min={3} max={15} className="w-20 h-7" /></SettingsRow>
          <SettingsRow label="Include sections" hint="Which sections appear in the generated digest.">
            <div className="space-y-1.5">
              {["Top 5 picks", "Topic trends", "New from tracked authors", "Conference deadlines", "Reading stats"].map((s) => (
                <label key={s} className="flex items-center gap-2 text-xs"><Checkbox defaultChecked={s !== "Reading stats"} /> {s}</label>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow label="Language" hint="Digest is bilingual; pick primary.">
            <RadioGroup defaultValue="zh" className="flex gap-3">
              <label className="flex items-center gap-1.5 text-xs"><RadioGroupItem value="en" /> English first</label>
              <label className="flex items-center gap-1.5 text-xs"><RadioGroupItem value="zh" /> 中文 first</label>
            </RadioGroup>
          </SettingsRow>
        </SettingsCard></div>
        <div className="mt-4"><SettingsCard title="Delivery">
          <SettingsRow label="Email to"><Input defaultValue="you@paperpulse.app, team@quant.co" className="h-7 text-xs" /></SettingsRow>
          <SettingsRow label="Also post to Slack"><Switch defaultChecked /></SettingsRow>
          <SettingsRow label="Archive markdown to"><Input defaultValue="/digest/{year}/W{week}.md" className="h-7 text-xs font-mono" /></SettingsRow>
        </SettingsCard></div>
      </SettingsSection>
    </div>
  );
}

// ═══════════════════════════ LLM ═══════════════════════════
export function LLMTab() {
  return (
    <div className="p-6 max-w-3xl">
      <SettingsSection title="LLM" description="Claude generates TL;DRs, digest text, and topic classification.">
        <SettingsCard title="Provider">
          <SettingsRow label="Provider">
            <Select defaultValue="anthropic">
              <SelectTrigger className="w-48 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="ollama">Self-hosted (Ollama)</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow label="Model">
            <Select defaultValue="sonnet">
              <SelectTrigger className="w-56 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="opus">claude-opus-4-5</SelectItem>
                <SelectItem value="sonnet">claude-sonnet-4-5</SelectItem>
                <SelectItem value="haiku">claude-haiku-4-5</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow label="API key" hint="Stored encrypted in the local keychain.">
            <Input type="password" defaultValue="sk-ant-••••••••••••••••••••••••••" className="h-7 text-xs font-mono" />
          </SettingsRow>
          <SettingsRow label="Max TL;DR tokens"><Input type="number" defaultValue={150} className="w-24 h-7" /></SettingsRow>
          <SettingsRow label="Temperature"><Slider min={0} max={1} step={0.05} defaultValue={[0.3]} className="max-w-xs" /></SettingsRow>
        </SettingsCard>
        <div className="mt-4"><SettingsCard title="Prompts" description="Edit the instruction text — advanced users only.">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">TL;DR prompt</div>
          <Textarea className="font-mono text-[11px]" rows={5} defaultValue="You are summarizing a quantitative finance or ML paper. Output 2 versions:&#10;1. English TL;DR: ≤ 30 words, technical, one sentence.&#10;2. 中文 TL;DR: ≤ 40 字, same meaning, idiomatic Chinese.&#10;Focus on the concrete contribution." />
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 mt-3">Topic classification prompt</div>
          <Textarea className="font-mono text-[11px]" rows={3} defaultValue="Given the title and abstract, select up to 4 topics from the taxonomy. Return slugs as JSON array." />
        </SettingsCard></div>
        <div className="mt-4"><SettingsCard title="Usage" description="Rolling 30-day spend.">
          <div className="grid grid-cols-4 gap-3 text-center">
            <UsageKpi label="Calls" value="1,284" />
            <UsageKpi label="Tokens" value="3.1M" />
            <UsageKpi label="Cost" value="$42.81" />
            <UsageKpi label="Avg latency" value="1.2s" />
          </div>
        </SettingsCard></div>
      </SettingsSection>
    </div>
  );
}
function UsageKpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded border p-2 bg-background"><div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div><div className="text-lg font-semibold font-mono mt-0.5">{value}</div></div>;
}

// ═══════════════════════════ NOTIFICATIONS ═══════════════════════════
export function NotificationsTab() {
  const triggers = [
    { name: "Tier A paper from tracked author", desc: "Any paper with tier=A + trackedAuthor flag.", channels: ["push", "email"] },
    { name: "New paper on 3 top topics", desc: "neural-sde, agentic-trading, or diffusion-finance.", channels: ["push"] },
    { name: "Conference deadline < 7 days", desc: "Approaching deadlines in your watchlist.", channels: ["push", "email"] },
    { name: "HF Daily paper matches", desc: "A paper that made HuggingFace Daily matches your topics.", channels: ["push"] },
    { name: "Weekly digest ready", desc: "Monday morning digest is generated.", channels: ["email", "slack"] },
    { name: "Ingest failure", desc: "A source repeatedly fails to pull.", channels: ["email"] },
  ];
  return (
    <div className="p-6 max-w-4xl">
      <SettingsSection title="Notifications" description="Pick what to be notified about and where.">
        <SettingsCard title="Global">
          <SettingsRow label="Quiet hours" hint="No notifications during this window.">
            <div className="flex items-center gap-2">
              <Input type="time" defaultValue="22:00" className="w-28 h-7" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="time" defaultValue="08:00" className="w-28 h-7" />
            </div>
          </SettingsRow>
          <SettingsRow label="Digest mode" hint="Batch low-priority notifications into a single daily summary.">
            <Switch defaultChecked />
          </SettingsRow>
        </SettingsCard>
        <div className="mt-4"><SettingsCard title="Triggers">
          <div className="space-y-2">
            {triggers.map((t) => (
              <div key={t.name} className="flex items-start gap-3 p-2.5 rounded border text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                </div>
                <div className="flex gap-1">
                  {["push", "email", "slack"].map((c) => (
                    <Badge key={c} variant={t.channels.includes(c) ? "default" : "outline"} className="text-[9px] uppercase cursor-pointer">
                      {c}
                    </Badge>
                  ))}
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </SettingsCard></div>
      </SettingsSection>
    </div>
  );
}

// ═══════════════════════════ DATA ═══════════════════════════
export function DataTab() {
  return (
    <div className="p-6 max-w-3xl">
      <SettingsSection title="Data" description="Storage, retention, and backups.">
        <SettingsCard title="Storage">
          <SettingsRow label="Database" hint="Currently using local SQLite. Postgres supported.">
            <Select defaultValue="sqlite">
              <SelectTrigger className="w-48 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sqlite">SQLite (local)</SelectItem>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow label="Path"><Input defaultValue="~/.paperpulse/papers.db" className="h-7 text-xs font-mono" /></SettingsRow>
          <SettingsRow label="PDF cache">
            <div className="flex items-center gap-2">
              <Input defaultValue="~/.paperpulse/pdfs" className="h-7 text-xs font-mono" />
              <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">2.4 GB</span>
            </div>
          </SettingsRow>
        </SettingsCard>
        <div className="mt-4"><SettingsCard title="Retention">
          <SettingsRow label="Keep Tier C papers for" hint="Older Tier C papers get archived to save space.">
            <Select defaultValue="90">
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="0">Forever</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow label="Keep Tier A/B papers for"><span className="text-xs font-mono">Forever</span></SettingsRow>
        </SettingsCard></div>
        <div className="mt-4"><SettingsCard title="Backup & export">
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" size="sm">Export all → JSON</Button>
            <Button variant="outline" size="sm">Export saved → BibTeX</Button>
            <Button variant="outline" size="sm">Backup database</Button>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">Last backup: 2026-04-21 03:17 · 312 MB</div>
        </SettingsCard></div>
        <div className="mt-4"><SettingsCard title="Danger zone">
          <Button variant="destructive" size="sm"><Trash2 className="h-3 w-3" /> Clear all papers</Button>
          <p className="text-[11px] text-muted-foreground mt-2">This permanently deletes your paper database. Cannot be undone.</p>
        </SettingsCard></div>
      </SettingsSection>
    </div>
  );
}

// ═══════════════════════════ INTEGRATIONS ═══════════════════════════
export function IntegrationsTab() {
  const list = [
    { name: "Zotero", desc: "Sync saved papers to your Zotero library.", connected: true },
    { name: "Notion", desc: "Append weekly digest to a Notion database.", connected: true },
    { name: "Slack", desc: "Post notifications to a Slack channel.", connected: true },
    { name: "Obsidian", desc: "Write notes to your Obsidian vault.", connected: false },
    { name: "Readwise", desc: "Forward highlights to Readwise.", connected: false },
    { name: "Feishu (飞书)", desc: "Send Chinese digest to Feishu.", connected: false },
    { name: "DingTalk (钉钉)", desc: "Team notifications via DingTalk.", connected: false },
    { name: "GitHub", desc: "Open issues in a repo from ignored papers.", connected: false },
  ];
  return (
    <div className="p-6 max-w-4xl">
      <SettingsSection title="Integrations" description="Plug PaperPulse into your existing workflow.">
        <div className="grid grid-cols-2 gap-3">
          {list.map((i) => (
            <Card key={i.name}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center font-semibold text-xs shrink-0">
                  {i.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {i.name}
                    {i.connected && <Badge variant="tierA" className="text-[9px]">Connected</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{i.desc}</div>
                  <Button size="sm" variant={i.connected ? "outline" : "default"} className="mt-2 h-7 text-[11px]">
                    {i.connected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6"><SettingsCard title="Webhooks" description="Outbound HTTP calls on events.">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-2 rounded border text-xs font-mono">
              <Badge variant="tierA" className="text-[9px]">POST</Badge>
              <span className="flex-1 truncate">https://hooks.slack.com/services/T07…/B08…/xXkYz</span>
              <Switch defaultChecked />
              <Button size="sm" variant="ghost"><Edit3 className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" variant="outline"><Plus className="h-3 w-3" /> Add webhook</Button>
          </div>
        </SettingsCard></div>
      </SettingsSection>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border bg-card", className)}>{children}</div>;
}
function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-3", className)}>{children}</div>;
}

// ═══════════════════════════ DEPLOYMENT ═══════════════════════════
export function DeploymentTab() {
  return (
    <div className="p-6 max-w-3xl">
      <SettingsSection title="Deployment" description="Where PaperPulse runs.">
        <SettingsCard title="Mode">
          <RadioGroup defaultValue="local" className="space-y-2">
            <DeployOption val="local" title="Local · Docker Compose" desc="Runs on your machine. Data never leaves." recommended />
            <DeployOption val="self" title="Self-hosted VPS" desc="Deploy to your own server via Docker or docker-compose." />
            <DeployOption val="cloud" title="PaperPulse Cloud" desc="Managed — we run it for you. $12/mo." />
          </RadioGroup>
        </SettingsCard>
        <div className="mt-4"><SettingsCard title="Resources">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <ResBar label="CPU" pct={24} meta="0.4 / 2 cores" />
            <ResBar label="Memory" pct={62} meta="1.2 / 2 GB" />
            <ResBar label="Disk" pct={38} meta="3.1 / 8 GB" />
          </div>
        </SettingsCard></div>
        <div className="mt-4"><SettingsCard title="Services" description="Status of background workers.">
          <div className="space-y-1.5">
            {[
              { name: "ingest-worker", status: "running", uptime: "14d 3h" },
              { name: "scorer", status: "running", uptime: "14d 3h" },
              { name: "llm-worker", status: "running", uptime: "2d 17h" },
              { name: "digest-scheduler", status: "idle", uptime: "—" },
              { name: "notification-bus", status: "running", uptime: "14d 3h" },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-2 rounded border text-xs">
                <div className={cn("h-2 w-2 rounded-full", s.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                <span className="font-mono flex-1">{s.name}</span>
                <span className="text-muted-foreground">{s.status}</span>
                <span className="text-muted-foreground font-mono">{s.uptime}</span>
              </div>
            ))}
          </div>
        </SettingsCard></div>
      </SettingsSection>
    </div>
  );
}
function DeployOption({ val, title, desc, recommended }: { val: string; title: string; desc: string; recommended?: boolean }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded border cursor-pointer hover:border-foreground/30">
      <RadioGroupItem value={val} className="mt-0.5" />
      <div className="flex-1">
        <div className="font-medium text-sm flex items-center gap-2">{title}{recommended && <Badge variant="tierA" className="text-[9px]">Recommended</Badge>}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
    </label>
  );
}
function ResBar({ label, pct, meta }: { label: string; pct: number; meta: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1"><span>{label}</span><span className="font-mono text-muted-foreground">{pct}%</span></div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full", pct > 80 ? "bg-rose-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 font-mono">{meta}</div>
    </div>
  );
}

// ═══════════════════════════ ABOUT ═══════════════════════════
export function AboutTab() {
  return (
    <div className="p-6 max-w-3xl">
      <SettingsSection title="About" description="">
        <SettingsCard title="PaperPulse">
          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-xs">
            <div className="text-muted-foreground">Version</div><div className="font-mono">0.8.3</div>
            <div className="text-muted-foreground">Build</div><div className="font-mono">2026.04.22-a8e4c71</div>
            <div className="text-muted-foreground">Database schema</div><div className="font-mono">v14</div>
            <div className="text-muted-foreground">License</div><div>MIT</div>
            <div className="text-muted-foreground">Last update check</div><div className="font-mono">3 hours ago · up to date</div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline">Check for updates</Button>
            <Button size="sm" variant="outline"><ExternalLink className="h-3 w-3" /> Changelog</Button>
            <Button size="sm" variant="outline"><ExternalLink className="h-3 w-3" /> GitHub</Button>
          </div>
        </SettingsCard>
        <div className="mt-4"><SettingsCard title="Shortcuts" description="Keyboard shortcuts available everywhere.">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono">
            {[
              ["⌘K", "Command palette"],
              ["j / k", "Next / prev paper"],
              ["o", "Open expanded view"],
              ["s", "Save"],
              ["m", "Mark must-read"],
              ["i", "Ignore"],
              ["g f", "Go to Feed"],
              ["g d", "Go to Dashboard"],
              ["g e", "Go to Explore"],
              ["⌘⇧D", "Toggle dark mode"],
              ["?", "Show all shortcuts"],
              ["Esc", "Dismiss dialog"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5">
                <span className="text-muted-foreground">{v}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">{k}</kbd>
              </div>
            ))}
          </div>
        </SettingsCard></div>
        <div className="mt-4"><SettingsCard title="Help & feedback">
          <div className="flex gap-2">
            <Button size="sm" variant="outline"><ExternalLink className="h-3 w-3" /> Documentation</Button>
            <Button size="sm" variant="outline">Report a bug</Button>
            <Button size="sm" variant="outline">Request a feature</Button>
          </div>
        </SettingsCard></div>
      </SettingsSection>
    </div>
  );
}
