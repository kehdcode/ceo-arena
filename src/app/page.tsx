"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Globe2,
  Heart,
  Info,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Menu,
  Minus,
  Package,
  Plus,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { Contribution, Decisions, GameState, SimulationEvent, SimulationResult, TurnOutcome } from "@/lib/engine";
import { StepTile } from "@/app/step-tile";
import { ProjectionModal, RunningOverlay, SeasonModal } from "@/app/game-overlays";
import { formatCompactCurrency, formatFullCurrency } from "@/lib/currency";

type View = "landing" | "dashboard" | "decisions" | "results" | "performance" | "leaderboard" | "season" | "profile" | "admin";
type HistoryItem = {
  id: string;
  turnNumber: number;
  decisions: Decisions | null;
  outcome: TurnOutcome;
  explanations: SimulationResult["explanations"] & { events?: SimulationEvent[] };
  inputHash: string | null;
  outputHash: string | null;
  simulatedAt: string | null;
  score: number;
  cumulativeScore: number;
};
type Snapshot = {
  profile: { id: string; displayName: string; avatar: string; country: string; persona: string; xp: number; level: number; activeTitle: string | null };
  isAdmin: boolean;
  business: { id: string; name: string; brandColor: string; status: string; archetype: string };
  season: { id: string; name: string; mode: string; status: string; turnCount: number; inviteCode: string | null; seed: number };
  state: GameState;
  config: { referencePrice: number; channels: Record<string, { capacity: number; saturation: number; efficiencyMin: number; efficiencyMax: number; awarenessPerMillion: number; label: string }>; scoringWeights: Record<string, number>; creditLineLimit: number; baseCapacity: number; opsCapacityPerPerson: number };
  currentTurn: { id: string; turnNumber: number; status: string; deadline: string | null } | null;
  upcoming: { turnNumber: number; deadline: string | null; events: SimulationEvent[]; defaultDecisions: Decisions } | null;
  history: HistoryItem[];
  leaderboard: { rank: number; businessId: string; company: string; name: string; avatar: string; turnNumber: number; score: number; lastTurnScore: number; isYou: boolean }[];
  rank: number | null;
  achievements: { key: string; name: string; description: string; icon: string; xpReward: number; unlockedAt: string }[];
  seasonAverage: number;
  seasonProgress: number;
};
type Projection = { revenue: number; operatingProfit: number; cash: number; activeCustomers: number; marketShare: number; stockouts: number; score: number; dimensions: Record<string, number>; events: SimulationEvent[]; contributions: Contribution[]; driverNotes: string[] };
type LockResponse = { alreadySimulated: boolean; result?: SimulationResult; outcome?: TurnOutcome; explanations?: SimulationResult["explanations"]; achievementsUnlocked?: { key: string; name: string; description: string; icon: string; xpReward: number }[]; xpEarned?: number; newLevel?: number; inputHash?: string; outputHash?: string; snapshot: Snapshot };

const AREA_LABELS: Record<string, string> = {
  profitability: "Profitability",
  revenueGrowth: "Revenue growth",
  cashManagement: "Cash management",
  customerGrowth: "Customer growth",
  retention: "Retention",
  marketingEfficiency: "Marketing efficiency",
  operations: "Operations",
  riskManagement: "Risk management",
};
const CHANNEL_LABELS: Record<string, { label: string; descriptor: string; icon: LucideIcon }> = {
  social: { label: "Instagram & TikTok", descriptor: "Fast reach · builds awareness", icon: Heart },
  influencers: { label: "Influencers", descriptor: "Trust transfer · higher variance", icon: Sparkles },
  search: { label: "Google Search", descriptor: "High intent · steady conversion", icon: Target },
  offline: { label: "Offline & OOH", descriptor: "Local presence · slower payback", icon: Globe2 },
};

function compactNaira(value: number) { return formatCompactCurrency(value, "NGN"); }
function fullNaira(value: number) { return formatFullCurrency(value, "NGN"); }
function signedNaira(value: number) { return `${value >= 0 ? "+" : "−"}${compactNaira(Math.abs(value))}`; }
function comma(value: number) { return Math.round(value).toLocaleString("en-NG"); }
function pct(value: number, digits = 0) { return `${(value * 100).toFixed(digits)}%`; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function monthLabel(turn: number) { return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][Math.max(0, Math.min(11, turn - 1))] ?? "Month"; }

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The Arena could not complete that action.");
  return data as T;
}

function LogoMark({ size = 34 }: { size?: number }) {
  return <div style={{ width: size, height: size }} className="relative grid shrink-0 place-items-center rounded-[11px] bg-[#c8ff55] text-[#10150c] shadow-[0_0_24px_rgba(200,255,85,.13)]">
    <span className="absolute left-[9px] top-[8px] h-[11px] w-[11px] rotate-45 border-[2px] border-[#10150c]" />
    <span className="absolute bottom-[8px] right-[8px] h-[11px] w-[11px] rotate-45 border-[2px] border-[#10150c]" />
  </div>;
}

function ProgressBar({ value, color = "#c8ff55", height = 5 }: { value: number; color?: string; height?: number }) {
  return <div className="w-full overflow-hidden rounded-full bg-white/[0.07]" style={{ height }}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></div>;
}

function MetricCard({ icon: Icon, label, value, detail, delta, tone = "neutral", accent }: {
  icon: LucideIcon; label: string; value: string; detail: string; delta?: string; tone?: "positive" | "negative" | "neutral"; accent?: string;
}) {
  const tint = accent ?? (tone === "positive" ? "#a5ec82" : tone === "negative" ? "#ff8f91" : "#c8ff55");
  return <article className="panel group relative min-w-0 overflow-hidden p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] sm:p-[18px]">
    <div className="absolute -right-5 -top-7 h-20 w-20 rounded-full opacity-[0.045] blur-2xl" style={{ background: tint }} />
    <div className="relative flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#87938b] sm:text-[11px]">{label}</span>
      <div className="grid h-8 w-8 place-items-center rounded-[10px] border border-white/[0.07] bg-white/[0.035]" style={{ color: tint }}><Icon size={15} strokeWidth={1.8} /></div>
    </div>
    <div className="relative mt-3 flex items-end justify-between gap-2">
      <p className="mono m-0 truncate text-[21px] font-semibold tracking-[-.06em] text-[#f3f5f1] sm:text-[25px]">{value}</p>
      {delta && <span className={`mb-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-semibold ${tone === "negative" ? "bg-[#ff7779]/10 text-[#ff9293]" : tone === "positive" ? "bg-[#87dda5]/10 text-[#9debb8]" : "bg-white/[0.06] text-[#a8b0ab]"}`}>{tone === "negative" ? <TrendingDown size={11} /> : <TrendingUp size={11} />}{delta}</span>}
    </div>
    <p className="relative mt-1.5 truncate text-[11px] text-[#84918a]">{detail}</p>
  </article>;
}

function Sparkline({ values, color = "#c8ff55", label }: { values: number[]; color?: string; label: string }) {
  const points = values.length < 2 ? [0, 0, ...values] : values;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);
  const range = max - min || 1;
  const coords = points.map((point, index) => `${(index / Math.max(1, points.length - 1)) * 440},${94 - ((point - min) / range) * 74}`).join(" ");
  const area = `0,104 ${coords} 440,104`;
  return <svg viewBox="0 0 440 110" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={label}>
    <defs><linearGradient id={`fill-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    {[24, 50, 76].map((y) => <line key={y} x1="0" x2="440" y1={y} y2={y} stroke="rgba(255,255,255,.06)" strokeDasharray="4 6" />)}
    <polygon points={area} fill={`url(#fill-${color.replace("#", "")})`} />
    <polyline points={coords} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    {points.length > 1 && <circle cx={(points.length - 1) / (points.length - 1) * 440} cy={94 - ((points[points.length - 1] - min) / range) * 74} r="4" fill={color} stroke="#101613" strokeWidth="2" />}
  </svg>;
}

function RadarChart({ dimensions }: { dimensions: Record<string, number> }) {
  const keys = Object.keys(AREA_LABELS);
  const center = 110;
  const radius = 75;
  const pointAt = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2;
    const r = radius * (Math.max(0, Math.min(100, value)) / 100);
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  };
  const values = keys.map((key) => Number(dimensions[key] ?? 0));
  const shape = values.map((value, index) => pointAt(index, value)).join(" ");
  return <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-7">
    <svg viewBox="0 0 220 220" className="h-[205px] w-[205px] shrink-0" role="img" aria-label={`Performance radar chart: ${keys.map((key, index) => `${AREA_LABELS[key]} ${values[index]}`).join(", ")}`}>
      {[25, 50, 75, 100].map((level) => <polygon key={level} points={keys.map((_, index) => pointAt(index, level)).join(" ")} fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="1" />)}
      {keys.map((key, index) => <line key={key} x1={center} y1={center} x2={pointAt(index, 100).split(",")[0]} y2={pointAt(index, 100).split(",")[1]} stroke="rgba(255,255,255,.1)" />)}
      <polygon points={shape} fill="rgba(200,255,85,.15)" stroke="#c8ff55" strokeWidth="2" strokeLinejoin="round" />
      {values.map((value, index) => <circle key={keys[index]} cx={pointAt(index, value).split(",")[0]} cy={pointAt(index, value).split(",")[1]} r="2.5" fill="#c8ff55" />)}
    </svg>
    <div className="grid w-full max-w-[280px] grid-cols-2 gap-x-4 gap-y-2.5">
      {keys.map((key) => <div key={key} className="flex items-center justify-between gap-2 text-[10px]">
        <span className="truncate text-[#98a39c]">{AREA_LABELS[key]}</span><span className="mono text-[11px] font-semibold text-[#e9eee8]">{Math.round(dimensions[key] ?? 0)}</span>
      </div>)}
    </div>
  </div>;
}

function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-end justify-between gap-3">
    <div>{eyebrow && <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[.19em] text-[#8d9a91]">{eyebrow}</p>}<h2 className="m-0 text-[16px] font-semibold tracking-[-.035em] text-[#eef3ed] sm:text-[18px]">{title}</h2></div>{action}
  </div>;
}

function EventCard({ event, compact = false }: { event: SimulationEvent; compact?: boolean }) {
  const opportunity = event.category === "Opportunity" || event.category === "Marketing";
  return <div className={`relative overflow-hidden rounded-[14px] border ${opportunity ? "border-[#c8ff55]/20 bg-[#c8ff55]/[0.045]" : "border-[#e6c177]/20 bg-[#e6c177]/[0.045]"} ${compact ? "p-3" : "p-4 sm:p-5"}`}>
    <div className="absolute -right-6 -top-9 h-24 w-24 rounded-full opacity-[0.08] blur-2xl" style={{ background: opportunity ? "#c8ff55" : "#e6c177" }} />
    <div className="relative flex items-start gap-3">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] ${opportunity ? "bg-[#c8ff55]/10 text-[#c8ff55]" : "bg-[#e6c177]/10 text-[#e6c177]"}`}><Zap size={17} /></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`text-[9px] font-bold uppercase tracking-[.16em] ${opportunity ? "text-[#c8ff55]" : "text-[#e6c177]"}`}>{event.category} · MARKET INTELLIGENCE</span><span className="rounded-full border border-white/[0.08] px-1.5 py-0.5 text-[8px] text-[#8f9b92]">{event.severity >= 1 ? `${event.severity.toFixed(1)}×` : `${Math.round(event.severity * 100)}%`}</span></div>
        <h3 className="mb-1 mt-1.5 text-[13px] font-semibold text-[#edf1eb]">{event.title}</h3><p className={`m-0 leading-relaxed text-[#9aa69d] ${compact ? "text-[10px]" : "text-[11px]"}`}>{event.description}</p>
      </div>
    </div>
  </div>;
}

function BrandButton({ children, onClick, icon: Icon, variant = "primary", disabled = false, className = "", type = "button" }: {
  children: ReactNode; onClick?: () => void; icon?: LucideIcon; variant?: "primary" | "secondary" | "quiet" | "danger"; disabled?: boolean; className?: string; type?: "button" | "submit";
}) {
  const style = variant === "primary"
    ? "border-[#c8ff55] bg-[#c8ff55] text-[#10160b] shadow-[0_4px_16px_rgba(200,255,85,.1)] hover:bg-[#d8ff83]"
    : variant === "danger"
      ? "border-[#ff7779]/30 bg-[#ff7779]/10 text-[#ff9d9f] hover:bg-[#ff7779]/15"
      : variant === "quiet"
        ? "border-transparent bg-transparent text-[#a8b1ab] hover:bg-white/[0.05] hover:text-white"
        : "border-white/[0.1] bg-white/[0.035] text-[#e7ece6] hover:border-white/[0.18] hover:bg-white/[0.07]";
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border px-3.5 py-2 text-[11px] font-semibold transition duration-200 disabled:opacity-45 ${style} ${className}`}>
    {Icon && <Icon size={14} strokeWidth={2.1} />}{children}
  </button>;
}

function ValueStepper({ value, onChange, min, max, step = 1, label }: { value: number; onChange: (next: number) => void; min: number; max: number; step?: number; label: string }) {
  return <div className="flex items-center gap-2">
    <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} className="grid h-8 w-8 place-items-center rounded-[9px] border border-white/[0.09] bg-white/[0.025] text-[#aab5ac] transition hover:bg-white/[0.07] disabled:opacity-35"><Minus size={13} /></button>
    <span className="mono min-w-[48px] text-center text-[15px] font-semibold text-[#f2f5ef]">{value > 0 && value < 10 ? `0${value}` : value}</span>
    <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} className="grid h-8 w-8 place-items-center rounded-[9px] border border-white/[0.09] bg-white/[0.025] text-[#aab5ac] transition hover:bg-white/[0.07] disabled:opacity-35"><Plus size={13} /></button>
  </div>;
}

function DashboardSkeleton() {
  return <div className="animate-fade-up space-y-5">
    <div className="skeleton h-[160px] rounded-[20px]" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((value) => <div key={value} className="skeleton h-[120px] rounded-[18px]" />)}</div>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><div className="skeleton h-[290px] rounded-[18px]" /><div className="skeleton h-[290px] rounded-[18px]" /></div>
  </div>;
}

export default function HomePage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [view, setView] = useState<View>("landing");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Decisions | null>(null);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState<"simulate" | "season" | "profile" | "admin" | "projection" | "balance" | "replay" | "">("");
  const [actionError, setActionError] = useState("");
  const [lastResult, setLastResult] = useState<SimulationResult | null>(null);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [projectionRemaining, setProjectionRemaining] = useState(10);
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [seasonModal, setSeasonModal] = useState(false);
  const [seasonName, setSeasonName] = useState("Threadline Lagos");
  const [seasonMode, setSeasonMode] = useState("practice");
  const [joinCode, setJoinCode] = useState("");
  const [profileName, setProfileName] = useState("");
  const [persona, setPersona] = useState("founder");
  const [leaderboardTab, setLeaderboardTab] = useState("Season");
  const [countdown, setCountdown] = useState("");
  const [adminData, setAdminData] = useState<Record<string, unknown> | null>(null);
  const [replayTurnId, setReplayTurnId] = useState("");
  const [replayReport, setReplayReport] = useState<{ inputMatches: boolean; outputMatches: boolean; outputHash: string; ruleVersion: string; score: number } | null>(null);
  const [balanceReport, setBalanceReport] = useState<{ ruleVersion: string; distribution: { min: number; max: number; spread: number }; strategies: { name: string; averageScore: number; totalProfit: number; finalCash: number; turnsCompleted: number; insolvent: boolean }[] } | null>(null);
  const [adminMarket, setAdminMarket] = useState(40000);
  const [adminElasticity, setAdminElasticity] = useState(1.4);
  const [adminOverhead, setAdminOverhead] = useState(1200000);
  const [adminInterest, setAdminInterest] = useState(0.03);
  const [showTutorial, setShowTutorial] = useState(true);

  const reloadSnapshot = useCallback(async () => {
    const next = await apiRequest<Snapshot>("/api/game");
    setSnapshot(next);
    setProfileName(next.profile.displayName);
    setPersona(next.profile.persona);
    if (next.history.length) {
      const recent = next.history[next.history.length - 1];
      if (recent) setLastResult({
        nextState: next.state,
        outcome: recent.outcome,
        events: recent.explanations?.events ?? [],
        explanations: recent.explanations,
      });
    }
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<Snapshot>("/api/game")
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        setProfileName(data.profile.displayName);
        setPersona(data.profile.persona);
        if (data.history.length) {
          const recent = data.history[data.history.length - 1];
          if (recent) setLastResult({ nextState: data.state, outcome: recent.outcome, events: recent.explanations?.events ?? [], explanations: recent.explanations });
        }
        const entered = window.localStorage.getItem("ceo-arena-entered") === "1";
        setView(entered ? "dashboard" : "landing");
      })
      .catch((error: Error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!snapshot?.upcoming?.deadline) { setCountdown(""); return; }
    const update = () => {
      const remaining = Math.max(0, new Date(snapshot.upcoming!.deadline!).getTime() - Date.now());
      if (remaining <= 0) { setCountdown("Turn due"); return; }
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const days = Math.floor(hours / 24);
      setCountdown(days > 0 ? `${days}d ${hours % 24}h` : `${hours}h ${minutes}m`);
    };
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [snapshot?.upcoming?.deadline]);

  useEffect(() => {
    setProjectionRemaining(10);
    setProjection(null);
    setProjectionOpen(false);
  }, [snapshot?.currentTurn?.turnNumber]);

  useEffect(() => {
    if (view !== "admin" || !snapshot?.isAdmin) return;
    apiRequest<{ rule: { config: Record<string, unknown> }; seasonCount: number; businessCount: number; turnCount: number; latestTurn: { id: string } | null }>("/api/admin")
      .then((data) => {
        setAdminData(data as unknown as Record<string, unknown>);
        setReplayTurnId(data.latestTurn?.id ?? "");
        const config = data.rule.config as Record<string, unknown>;
        setAdminMarket(Number(config.baseMarket ?? 40000));
        setAdminElasticity(Number(config.elasticity ?? 1.4));
        setAdminOverhead(Number(config.overhead ?? 1200000));
        setAdminInterest(Number(config.monthlyInterestRate ?? 0.03));
      })
      .catch((error: Error) => setActionError(error.message));
  }, [view, snapshot?.isAdmin]);

  const currentOutcome = lastResult?.outcome ?? snapshot?.history.at(-1)?.outcome ?? null;
  const activeDecisions = draft ?? snapshot?.upcoming?.defaultDecisions ?? null;
  const month = snapshot?.state.month ?? 0;
  const nextTurn = snapshot?.upcoming?.turnNumber ?? month + 1;
  const currentRevenue = currentOutcome?.revenue ?? 0;
  const previousRevenue = snapshot?.history.length && snapshot.history.length > 1 ? snapshot.history[snapshot.history.length - 2].outcome.revenue : 0;

  const startDecisions = useCallback(() => {
    if (!snapshot?.upcoming) { setView("season"); return; }
    setDraft(clone(snapshot.upcoming.defaultDecisions));
    setReview(false);
    setActionError("");
    setProjection(null);
    setView("decisions");
  }, [snapshot]);

  const enterArena = (target: View = "dashboard") => {
    window.localStorage.setItem("ceo-arena-entered", "1");
    setView(target);
  };

  const setPricing = (key: "price" | "discount", value: number) => setDraft((previous) => previous ? ({ ...previous, pricing: { ...previous.pricing, [key]: value } }) : previous);
  const setChannelSpend = (key: keyof Decisions["marketing"], value: number) => setDraft((previous) => previous ? ({ ...previous, marketing: { ...previous.marketing, [key]: value } }) : previous);
  const setSales = (key: "staffChange" | "commission", value: number) => setDraft((previous) => previous ? ({ ...previous, sales: { ...previous.sales, [key]: value } }) : previous);
  const setOps = (key: "staffChange" | "salaryLevel", value: number | string) => setDraft((previous) => previous ? ({ ...previous, operations: { ...previous.operations, [key]: value } }) : previous);
  const setInventory = (key: "orderUnits" | "safetyStock", value: number) => setDraft((previous) => previous ? ({ ...previous, inventory: { ...previous.inventory, [key]: value } }) : previous);
  const setFinance = (key: "draw" | "repay", value: number) => setDraft((previous) => previous ? ({ ...previous, finance: { draw: key === "draw" ? value : 0, repay: key === "repay" ? value : 0 } }) : previous);
  const setCX = (value: number) => setDraft((previous) => previous ? ({ ...previous, customerExperience: { investment: value } }) : previous);

  const confirmLock = async () => {
    if (!snapshot || !draft || !snapshot.currentTurn) return;
    setBusy("simulate"); setActionError(""); setView("results");
    try {
      const response = await apiRequest<LockResponse>("/api/game/lock", {
        method: "POST",
        body: JSON.stringify({ turnNumber: snapshot.currentTurn.turnNumber, decisions: draft }),
      });
      setSnapshot(response.snapshot);
      if (response.result) setLastResult(response.result);
      else if (response.outcome && response.explanations) setLastResult({ nextState: response.snapshot.state, outcome: response.outcome, events: [], explanations: response.explanations });
      setDraft(null); setReview(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not lock this month.");
      setView("decisions");
    } finally { setBusy(""); }
  };

  const runProjection = async () => {
    if (!snapshot || !draft || !snapshot.currentTurn) return;
    setBusy("projection"); setActionError("");
    try {
      const response = await apiRequest<{ projection: Projection; remaining: number }>("/api/game/what-if", {
        method: "POST", body: JSON.stringify({ turnNumber: snapshot.currentTurn.turnNumber, decisions: draft }),
      });
      setProjection(response.projection); setProjectionRemaining(response.remaining); setProjectionOpen(true);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Projection unavailable."); }
    finally { setBusy(""); }
  };

  const createSeason = async () => {
    setBusy("season"); setActionError("");
    try {
      const next = await apiRequest<Snapshot>("/api/game/start", { method: "POST", body: JSON.stringify({ businessName: seasonName, mode: seasonMode }) });
      setSnapshot(next); setDraft(null); setLastResult(null); setSeasonModal(false); setView("dashboard");
      window.localStorage.setItem("ceo-arena-entered", "1");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not start a new season."); }
    finally { setBusy(""); }
  };

  const joinPrivate = async () => {
    setBusy("season"); setActionError("");
    try {
      const next = await apiRequest<Snapshot>("/api/game/join", { method: "POST", body: JSON.stringify({ inviteCode: joinCode, businessName: seasonName }) });
      setSnapshot(next); setDraft(null); setLastResult(null); setSeasonModal(false); setView("dashboard"); setJoinCode("");
      window.localStorage.setItem("ceo-arena-entered", "1");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not join that private league."); }
    finally { setBusy(""); }
  };

  const saveProfile = async () => {
    setBusy("profile"); setActionError("");
    try {
      const next = await apiRequest<Snapshot>("/api/game/profile", { method: "PATCH", body: JSON.stringify({ displayName: profileName, persona }) });
      setSnapshot(next);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not save your profile."); }
    finally { setBusy(""); }
  };

  const runReplay = async () => {
    if (!replayTurnId.trim()) return;
    setBusy("replay"); setActionError(""); setReplayReport(null);
    try {
      const report = await apiRequest<{ inputMatches: boolean; outputMatches: boolean; outputHash: string; ruleVersion: string; score: number }>("/api/admin/replay", { method: "POST", body: JSON.stringify({ turnId: replayTurnId.trim() }) });
      setReplayReport(report);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Replay verification failed."); }
    finally { setBusy(""); }
  };

  const runBalanceLab = async () => {
    setBusy("balance"); setActionError(""); setBalanceReport(null);
    try {
      const report = await apiRequest<{ ruleVersion: string; distribution: { min: number; max: number; spread: number }; strategies: { name: string; averageScore: number; totalProfit: number; finalCash: number; turnsCompleted: number; insolvent: boolean }[] }>("/api/admin/balance-lab", { method: "POST" });
      setBalanceReport(report);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Balance lab failed."); }
    finally { setBusy(""); }
  };

  const saveAdminConfig = async () => {
    setBusy("admin"); setActionError("");
    try {
      await apiRequest("/api/admin", { method: "PATCH", body: JSON.stringify({ baseMarket: adminMarket, elasticity: adminElasticity, overhead: adminOverhead, monthlyInterestRate: adminInterest }) });
      const summary = await apiRequest<Record<string, unknown>>("/api/admin");
      setAdminData(summary); setActionError("");
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not publish the rule version."); }
    finally { setBusy(""); }
  };

  const navTo = (target: View) => {
    setActionError("");
    if (target === "decisions") { startDecisions(); return; }
    setView(target);
    if (target === "landing") window.localStorage.removeItem("ceo-arena-entered");
  };

  if (loading) return <main className="min-h-screen bg-[#080b0a] px-4 py-8 sm:px-8"><div className="mx-auto max-w-[1320px]"><div className="mb-8 flex items-center gap-3"><LogoMark /><div><div className="text-[12px] font-black tracking-[.13em]">CEO <span className="text-[#c8ff55]">ARENA</span></div><div className="mt-0.5 text-[9px] uppercase tracking-[.14em] text-[#78837c]">Build. Decide. Compete.</div></div></div><DashboardSkeleton /></div></main>;
  if (loadError || !snapshot) return <main className="grid min-h-screen place-items-center px-5"><div className="panel max-w-md p-8 text-center"><AlertTriangle className="mx-auto mb-4 text-[#e6c177]" size={28} /><h1 className="text-xl font-semibold">The Arena is warming up</h1><p className="mt-2 text-sm leading-6 text-[#99a49d]">{loadError || "We could not load your game."} Check the connection and try again.</p><BrandButton className="mt-5" onClick={() => window.location.reload()} icon={ArrowRight}>Try again</BrandButton></div></main>;

  const commonBoard = snapshot.leaderboard;
  const activeOutcome = currentOutcome;
  const currentCash = snapshot.state.cash;
  const gameArea = (content: ReactNode) => <div className="min-h-screen bg-[#080b0a]">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute -left-[280px] -top-[260px] h-[540px] w-[540px] rounded-full bg-[#8aba4c]/[0.035] blur-[115px]" /><div className="absolute -right-[260px] top-[250px] h-[460px] w-[460px] rounded-full bg-[#59a393]/[0.025] blur-[125px]" /></div>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col border-r border-white/[0.07] bg-[#0a0e0c]/95 px-4 py-[18px] backdrop-blur-xl lg:flex">
      <button onClick={() => navTo("dashboard")} className="mb-7 flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/[0.03]"><LogoMark size={35} /><span><span className="block text-[12px] font-black tracking-[.13em]">CEO <span className="text-[#c8ff55]">ARENA</span></span><span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-[.19em] text-[#77837b]">Business, in play.</span></span></button>
      <button onClick={() => setSeasonModal(true)} className="mb-6 flex w-full items-center gap-3 rounded-[13px] border border-white/[0.075] bg-white/[0.025] p-3 text-left transition hover:border-[#c8ff55]/20 hover:bg-[#c8ff55]/[0.035]"><span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#c8ff55]/10 text-[#c8ff55]"><Building2 size={16} /></span><span className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-[.14em] text-[#849188]">Your company</span><span className="mt-1 block truncate text-[11px] font-semibold text-[#e6ece5]">{snapshot.business.name}</span></span><ChevronDown size={13} className="text-[#68746d]" /></button>
      <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.17em] text-[#647169]">Operate</div>
      <nav className="space-y-1" aria-label="Main navigation">
        <SideNavButton icon={LayoutDashboard} label="Command center" active={view === "dashboard"} onClick={() => navTo("dashboard")} />
        <SideNavButton icon={SlidersHorizontal} label="Decision room" badge={snapshot.upcoming ? `M${String(snapshot.upcoming.turnNumber).padStart(2, "0")}` : undefined} active={view === "decisions"} onClick={() => navTo("decisions")} disabled={!snapshot.upcoming} />
        <SideNavButton icon={BarChart3} label="Performance" active={view === "performance"} onClick={() => navTo("performance")} />
        <SideNavButton icon={CalendarDays} label="Season report" active={view === "season"} onClick={() => navTo("season")} />
      </nav>
      <div className="mb-2 mt-7 px-2 text-[9px] font-bold uppercase tracking-[.17em] text-[#647169]">Compete</div>
      <nav className="space-y-1" aria-label="Competition navigation">
        <SideNavButton icon={Trophy} label="Leaderboards" active={view === "leaderboard"} onClick={() => navTo("leaderboard")} />
        <SideNavButton icon={Award} label="Achievements" active={view === "profile"} onClick={() => navTo("profile")} />
      </nav>
      {snapshot.isAdmin && <><div className="mb-2 mt-7 px-2 text-[9px] font-bold uppercase tracking-[.17em] text-[#647169]">Studio</div><SideNavButton icon={Settings2} label="Admin studio" active={view === "admin"} onClick={() => navTo("admin")} /></>}
      <div className="mt-auto">
        <div className="mb-3 rounded-[13px] border border-[#c8ff55]/10 bg-[#c8ff55]/[0.035] p-3"><div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-[#929e94]">Season progress</span><span className="mono text-[10px] text-[#c8ff55]">{month}/12</span></div><div className="mt-2.5"><ProgressBar value={snapshot.seasonProgress} /></div><p className="mb-0 mt-2 truncate text-[9px] text-[#758178]">{snapshot.season.name}</p></div>
        <button onClick={() => navTo("profile")} className="flex w-full items-center gap-2.5 rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-2.5 text-left transition hover:bg-white/[0.05]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c8ff55]/10 text-[13px] font-bold text-[#c8ff55]">{snapshot.profile.avatar || "✦"}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-[#e8eee7]">{snapshot.profile.displayName}</span><span className="mt-0.5 block text-[9px] text-[#77837b]">Level {snapshot.profile.level} CEO</span></span><ChevronRight size={13} className="text-[#657168]" /></button>
      </div>
    </aside>

    <main className="relative z-10 min-h-screen lg:pl-[238px]">
      <header className="sticky top-0 z-20 flex h-[61px] items-center justify-between border-b border-white/[0.065] bg-[#080b0a]/85 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
        <div className="flex items-center gap-3"><button aria-label="Back to command center" onClick={() => navTo("dashboard")} className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.025] text-[#cad3cb] lg:hidden"><LogoMark size={21} /></button><div className="hidden items-center gap-2 text-[10px] text-[#647169] sm:flex"><span>CEO ARENA</span><ChevronRight size={12} /><span className="text-[#bac4bb]">{view === "landing" ? "Discover" : view === "decisions" ? "Decision room" : view === "results" ? "Month results" : view === "performance" ? "Performance" : view === "leaderboard" ? "Leaderboards" : view === "season" ? "Season overview" : view === "profile" ? "CEO profile" : view === "admin" ? "Admin studio" : "Command center"}</span></div><span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-[.09em] text-[#89958c]"><span className="h-1.5 w-1.5 rounded-full bg-[#a3e38d]" />{snapshot.season.mode}</span></div>
        <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 text-[10px] text-[#7e8b82] sm:flex"><Globe2 size={12} /> Lagos, NG · ₦</span><button aria-label="Open notifications" onClick={() => setActionError("You're all caught up. Your next market briefing arrives with the next turn.")} className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.025] text-[#a5b0a7] hover:bg-white/[0.06]"><Bell size={15} /><span className="absolute right-[8px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#c8ff55]" /></button><button onClick={() => setSeasonModal(true)} className="hidden h-9 items-center gap-1.5 rounded-[10px] border border-[#c8ff55]/25 bg-[#c8ff55]/[0.07] px-3 text-[10px] font-semibold text-[#d7ff9c] hover:bg-[#c8ff55]/[0.12] sm:inline-flex"><Plus size={13} /> New season</button></div>
      </header>
      <div className="mx-auto max-w-[1500px] px-4 pb-28 pt-5 sm:px-7 sm:pt-7 lg:px-9 lg:pb-10">{content}</div>
    </main>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/[0.08] bg-[#0a0e0c]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl lg:hidden">
      <MobileNavButton icon={LayoutDashboard} label="Home" active={view === "dashboard"} onClick={() => navTo("dashboard")} />
      <MobileNavButton icon={SlidersHorizontal} label="Decide" active={view === "decisions"} onClick={() => navTo("decisions")} disabled={!snapshot.upcoming} />
      <MobileNavButton icon={BarChart3} label="Results" active={view === "performance" || view === "results"} onClick={() => navTo("performance")} />
      <MobileNavButton icon={Trophy} label="Boards" active={view === "leaderboard"} onClick={() => navTo("leaderboard")} />
      <MobileNavButton icon={UserRound} label="CEO" active={view === "profile"} onClick={() => navTo("profile")} />
    </nav>
    {seasonModal && <SeasonModal name={seasonName} setName={setSeasonName} mode={seasonMode} setMode={setSeasonMode} joinCode={joinCode} setJoinCode={setJoinCode} onJoin={joinPrivate} onClose={() => setSeasonModal(false)} onStart={createSeason} busy={busy === "season"} />}
    {projectionOpen && projection && <ProjectionModal projection={projection} remaining={projectionRemaining} onClose={() => setProjectionOpen(false)} />}
    {busy === "simulate" && <RunningOverlay month={snapshot.upcoming?.turnNumber ?? snapshot.state.month + 1} />}
  </div>;

  if (view === "landing") return <div className="relative min-h-screen overflow-hidden bg-[#080b0a] text-[#f2f6f0]">
    <div aria-hidden className="pointer-events-none absolute inset-0"><div className="absolute -left-24 top-20 h-[500px] w-[500px] rounded-full bg-[#c8ff55]/[0.06] blur-[130px]" /><div className="absolute right-0 top-0 h-[600px] w-[600px] bg-[radial-gradient(ellipse_at_top_right,rgba(110,146,90,.11),transparent_64%)]" /><div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, black, transparent 80%)" }} /></div>
    <header className="relative z-10 mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 sm:px-9"><button onClick={() => enterArena("dashboard")} className="flex items-center gap-3"><LogoMark /><span className="text-left"><span className="block text-[12px] font-black tracking-[.14em]">CEO <span className="text-[#c8ff55]">ARENA</span></span><span className="block pt-0.5 text-[8px] font-semibold uppercase tracking-[.18em] text-[#76827a]">Build. Decide. Compete.</span></span></button><div className="flex items-center gap-3"><button onClick={() => enterArena("leaderboard")} className="hidden px-3 py-2 text-[11px] font-medium text-[#a9b3aa] transition hover:text-white sm:inline-flex">Leaderboard</button><BrandButton onClick={() => enterArena("dashboard")} icon={ArrowRight}>Enter the Arena</BrandButton></div></header>
    <main className="relative z-10 mx-auto max-w-[1320px] px-5 pb-12 pt-9 sm:px-9 sm:pt-16 lg:pt-[78px]">
      <div className="grid items-center gap-12 lg:grid-cols-[1.12fr_.88fr] lg:gap-16">
        <div className="animate-fade-up"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c8ff55]/20 bg-[#c8ff55]/[0.055] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.17em] text-[#d3ff87]"><span className="h-1.5 w-1.5 rounded-full bg-[#c8ff55] animate-pulse-dot" /> A new kind of business game</div><h1 className="m-0 max-w-[720px] text-[clamp(3rem,7.7vw,6.9rem)] font-semibold leading-[.94] tracking-[-.085em] text-[#f2f6f0]">Build.<br /><span className="text-[#c8ff55]">Decide.</span><br />Compete.</h1><p className="mt-6 max-w-[520px] text-[14px] leading-[1.8] text-[#9aa69e] sm:text-[16px]">You’re the CEO. Every month, the market moves, your decisions land, and the numbers tell the story. Learn to lead by playing the business before it’s yours.</p><div className="mt-8 flex flex-wrap items-center gap-3"><BrandButton onClick={() => enterArena("dashboard")} icon={ArrowRight} className="h-12 px-5 text-[12px]">Start your first season</BrandButton><span className="inline-flex items-center gap-2 text-[10px] text-[#78847d]"><ShieldCheck size={14} className="text-[#91d881]" /> No real money. Just real decisions.</span></div><div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/[0.08] pt-5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#79857d]"><span className="inline-flex items-center gap-2"><Globe2 size={12} className="text-[#c8ff55]" /> Built in Lagos</span><span className="inline-flex items-center gap-2"><CalendarDays size={12} className="text-[#c8ff55]" /> 12 turns. One season.</span><span className="inline-flex items-center gap-2"><Zap size={12} className="text-[#c8ff55]" /> Every call has a cost.</span></div></div>
        <div className="relative animate-fade-up [animation-delay:100ms]"><div className="absolute -inset-6 rounded-[32px] bg-[#c8ff55]/[0.025] blur-2xl" /><div className="panel relative overflow-hidden p-4 sm:p-5"><div className="flex items-center justify-between border-b border-white/[0.07] pb-4"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#c8ff55]/10 text-[#c8ff55]"><Activity size={15} /></div><div><div className="text-[10px] font-bold text-[#e9eee8]">Your first decision</div><div className="mt-0.5 text-[9px] text-[#78847c]">Lagos fashion · Month 01</div></div></div><span className="rounded-full border border-[#93dfab]/15 bg-[#93dfab]/[0.07] px-2 py-1 text-[8px] font-bold uppercase tracking-[.12em] text-[#a3e6b3]">Practice</span></div><div className="mt-4 rounded-[13px] border border-white/[0.07] bg-[#090e0b] p-4"><div className="flex items-start justify-between gap-4"><div><span className="text-[9px] font-bold uppercase tracking-[.15em] text-[#87938a]">Decide what matters</span><p className="mb-0 mt-2 text-[19px] font-semibold leading-tight tracking-[-.04em]">A price is a promise.<br /><span className="text-[#c8ff55]">And a trade-off.</span></p></div><div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-[#c8ff55]/15 bg-[#c8ff55]/[0.06] text-[#c8ff55]"><CircleDollarSign size={18} /></div></div><div className="mt-5 flex items-end justify-between"><div><div className="text-[9px] text-[#7f8a82]">Selling price</div><div className="mono mt-1 text-[22px] font-semibold tracking-[-.05em]">₦30,000</div></div><div className="text-right"><div className="text-[9px] text-[#7f8a82]">Unit cost</div><div className="mono mt-1 text-[13px] text-[#a5b0a8]">₦14,000</div></div></div><div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full w-[46%] rounded-full bg-[#c8ff55]" /></div><div className="mt-2 flex justify-between text-[8px] text-[#738078]"><span>More margin per item</span><span>Higher conversion</span></div></div><div className="mt-4 grid grid-cols-3 gap-2"><StepTile number="01" title="Build" detail="Start a company" active /><StepTile number="02" title="Decide" detail="Make the call" /><StepTile number="03" title="Compete" detail="Own the outcome" /></div><div className="mt-4 flex items-center justify-between rounded-[12px] border border-white/[0.065] bg-white/[0.02] p-3"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/[0.05] text-[#a8b2aa]"><Trophy size={14} /></div><div><div className="text-[9px] font-semibold text-[#d8dfd8]">First-month score</div><div className="mt-0.5 text-[8px] text-[#7c8880]">Earn your place on the board</div></div></div><ArrowRight size={14} className="text-[#c8ff55]" /></div></div><div className="absolute -bottom-4 -right-4 -z-10 h-36 w-36 rounded-full bg-[#62bd9c]/[0.07] blur-3xl" /></div>
      </div>
      <div className="mt-16 grid gap-5 border-t border-white/[0.07] pt-6 sm:grid-cols-3"><div className="flex gap-3"><span className="mono text-[10px] text-[#c8ff55]">01 /</span><div><div className="text-[11px] font-semibold">A real business sandbox</div><p className="mb-0 mt-1 text-[10px] leading-5 text-[#7e8a82]">Lead a Lagos fashion e-commerce brand. Hire, price, market, fund and fulfil.</p></div></div><div className="flex gap-3"><span className="mono text-[10px] text-[#c8ff55]">02 /</span><div><div className="text-[11px] font-semibold">Outcomes you can explain</div><p className="mb-0 mt-1 text-[10px] leading-5 text-[#7e8a82]">Every month is reproducible, transparent and built around your decisions.</p></div></div><div className="flex gap-3"><span className="mono text-[10px] text-[#c8ff55]">03 /</span><div><div className="text-[11px] font-semibold">One season. Twelve choices.</div><p className="mb-0 mt-1 text-[10px] leading-5 text-[#7e8a82]">Learn what your strategy does under pressure before it happens for real.</p></div></div></div>
      <footer className="mt-9 flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-4 text-[9px] text-[#58635b] sm:flex-row"><span>CEO ARENA · Build. Decide. Compete.</span><span>Simulation only · no real money, prizes or financial advice.</span></footer>
    </main>
  </div>;

  if (view === "dashboard") {
    const activeStaff = snapshot.state.salesStaff;
    const salesGrowth = currentOutcome && previousRevenue > 0 ? currentOutcome.revenue / previousRevenue - 1 : null;
    const marketEvents = snapshot.upcoming?.events ?? [];
    const dimensions = activeOutcome?.dimensions ?? {};
    return gameArea(<div className="animate-fade-up space-y-5">
      <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-[linear-gradient(115deg,#141c16_0%,#111712_53%,#172019_100%)] p-5 sm:p-7">
        <div aria-hidden className="absolute -right-10 -top-24 h-[260px] w-[360px] rounded-full bg-[#c8ff55]/[0.06] blur-[80px]" /><div aria-hidden className="absolute right-[15%] top-0 h-full w-[1px] rotate-[25deg] bg-white/[0.035]" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-[640px]"><div className="mb-4 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-[#9be1ab]/15 bg-[#9be1ab]/[0.065] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[.13em] text-[#a8e7b5]"><span className="h-1.5 w-1.5 rounded-full bg-[#9ce2a7]" /> Season live</span><span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[.1em] text-[#87938a]">{snapshot.season.mode === "practice" ? "Self-paced practice" : snapshot.season.mode === "private" ? "Private league" : "Ranked season"}</span></div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-[#87938c]">Welcome back, {snapshot.profile.displayName.split(" ")[0]}</p><h1 className="m-0 text-[clamp(1.7rem,4vw,2.8rem)] font-semibold leading-[1.08] tracking-[-.065em]">{snapshot.business.name}<span className="text-[#c8ff55]">.</span></h1><p className="mb-0 mt-2 max-w-[460px] text-[11px] leading-[1.7] text-[#99a59c]">{month === 0 ? "The market is waiting. Set your first month in motion." : month >= 12 || snapshot.state.insolvent ? "Your season is complete. Review the calls that shaped your company." : `${monthLabel(month)} is on the books. Your next decision will set the tone for ${monthLabel(nextTurn)}.`}</p></div>
          <div className="flex items-center gap-3 md:pb-1"><div className="hidden text-right sm:block"><div className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#87938b]">Season score</div><div className="mono mt-1 text-[22px] font-semibold tracking-[-.05em] text-[#f2f5ef]">{snapshot.seasonAverage > 0 ? snapshot.seasonAverage.toLocaleString("en-NG") : "—"}<span className="ml-1 text-[10px] font-normal text-[#768279]">/ 1,000</span></div></div>{snapshot.upcoming ? <BrandButton onClick={startDecisions} icon={ArrowRight} className="h-11 px-4">{month === 0 ? "Set month 01" : `Set month ${String(nextTurn).padStart(2, "0")}`}</BrandButton> : <BrandButton onClick={() => setSeasonModal(true)} icon={Plus}>Play next season</BrandButton>}</div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-2 border-t border-white/[0.075] pt-4 sm:max-w-[620px] sm:gap-6"><div><div className="text-[8px] font-semibold uppercase tracking-[.14em] text-[#78857d]">CEO level</div><div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold"><span className="text-[#c8ff55]">LVL {String(snapshot.profile.level).padStart(2, "0")}</span><span className="text-[9px] font-normal text-[#8b978e]">· {comma(snapshot.profile.xp)} XP</span></div></div><div><div className="text-[8px] font-semibold uppercase tracking-[.14em] text-[#78857d]">Season standing</div><div className="mt-1.5 text-[12px] font-semibold">{snapshot.rank ? `#${snapshot.rank}` : "—"}<span className="ml-1 text-[9px] font-normal text-[#87938b]">{snapshot.rank ? "in your bracket" : "no rank yet"}</span></div></div><div><div className="text-[8px] font-semibold uppercase tracking-[.14em] text-[#78857d]">Turn cadence</div><div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold"><Clock3 size={12} className="text-[#9da99e]" />{snapshot.season.mode === "practice" ? "At your pace" : countdown || "24-hour turns"}</div></div></div>
      </div>

      {showTutorial && month === 0 && <div className="flex flex-col gap-3 rounded-[14px] border border-[#c8ff55]/15 bg-[#c8ff55]/[0.035] p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#c8ff55]/10 text-[#c8ff55]"><Lightbulb size={15} /></div><div><div className="text-[10px] font-semibold text-[#e4ebdf]">Your first turn, made simple</div><p className="mb-0 mt-1 text-[9px] leading-5 text-[#99a792]">Start with a pricing and stock plan, then review the cash trade-offs before you lock. You can’t change a month once it’s simulated.</p></div></div><button onClick={() => setShowTutorial(false)} className="self-end px-2 py-1 text-[9px] text-[#91a084] hover:text-white sm:self-center">Got it</button></div>}

      {snapshot.state.insolvent && <div className="rounded-[13px] border border-[#ff7779]/25 bg-[#ff7779]/[0.07] p-4 text-[11px] text-[#ffaaaa]"><strong>Season ended — the business became insolvent.</strong> Review your final report and start a new run when you’re ready.</div>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard icon={Wallet} label="Cash on hand" value={compactNaira(snapshot.state.cash)} detail={`Credit line · ${compactNaira(Math.max(0, snapshot.state.creditLineLimit - snapshot.state.debt))} available`} tone={snapshot.state.cash < 1_500_000 ? "negative" : "neutral"} />
        <MetricCard icon={TrendingUp} label={month ? `${monthLabel(month)} revenue` : "Latest revenue"} value={currentOutcome ? compactNaira(currentOutcome.revenue) : "—"} detail={currentOutcome ? `${comma(currentOutcome.unitsSold)} units fulfilled` : "Turn 01 has not been locked"} delta={salesGrowth === null ? undefined : `${salesGrowth >= 0 ? "+" : ""}${(salesGrowth * 100).toFixed(1)}%`} tone={salesGrowth === null ? "neutral" : salesGrowth >= 0 ? "positive" : "negative"} />
        <MetricCard icon={CircleDollarSign} label="Operating profit" value={currentOutcome ? compactNaira(currentOutcome.operatingProfit) : "—"} detail={currentOutcome ? `Gross margin · ${pct(currentOutcome.grossMargin, 1)}` : "After payroll, marketing & overhead"} tone={currentOutcome ? currentOutcome.operatingProfit >= 0 ? "positive" : "negative" : "neutral"} />
        <MetricCard icon={Trophy} label="CEO score" value={currentOutcome ? `${currentOutcome.score}` : "—"} detail={snapshot.seasonAverage ? `Season average · ${snapshot.seasonAverage} / 1,000` : "Eight dimensions. One score."} accent="#c8ff55" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_.8fr]">
        <section className="panel min-w-0 p-4 sm:p-5"><SectionTitle eyebrow="Business pulse · Naira" title="Performance at a glance" action={<button onClick={() => navTo("performance")} className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#abb6ac] hover:text-[#c8ff55]">View history <ArrowRight size={12} /></button>} />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"><MiniMetric icon={Users} label="Active customers" value={comma(snapshot.state.activeCustomers)} detail={activeOutcome ? `+${comma(activeOutcome.newCustomers)} new` : "Starting base · 600"} /><MiniMetric icon={Activity} label="Brand awareness" value={`${Math.round(snapshot.state.awareness)}/100`} detail="Customer discovery" /><MiniMetric icon={ShoppingBag} label="Inventory" value={comma(snapshot.state.inventory)} detail="units in stock" /><MiniMetric icon={Building2} label="Sales team" value={`${activeStaff} people`} detail={`${snapshot.state.opsStaff} operations staff`} /></div>
          <div className="mt-5 flex items-center justify-between gap-3"><div><div className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#77847b]">Revenue trend</div><div className="mono mt-1 text-[14px] font-semibold text-[#e7ece6]">{snapshot.history.length ? compactNaira(currentRevenue) : "No months reported"}<span className="ml-1.5 text-[9px] font-normal text-[#738077]">{snapshot.history.length ? "· last completed month" : "· first month is ready"}</span></div></div>{snapshot.history.length > 1 && <span className={`rounded-md px-2 py-1 text-[9px] font-semibold ${salesGrowth !== null && salesGrowth >= 0 ? "bg-[#92dea8]/10 text-[#9be6b0]" : "bg-[#ff7779]/10 text-[#ff9294]"}`}>{salesGrowth !== null ? `${salesGrowth >= 0 ? "+" : ""}${(salesGrowth * 100).toFixed(1)}% MoM` : "—"}</span>}</div>
          <div className="mt-3 h-[116px] rounded-[11px] border border-white/[0.045] bg-[#090e0b]/55 px-2 py-1.5"><Sparkline values={snapshot.history.map((item) => item.outcome.revenue)} label="Monthly revenue trend in Naira" /></div><div className="mt-2 flex justify-between text-[8px] text-[#748077]"><span>{snapshot.history.length ? "Month 01" : "Ready for month 01"}</span><span>{snapshot.history.length ? `Month ${String(month).padStart(2, "0")}` : "Revenue will chart here"}</span></div>
        </section>
        <section className="panel flex min-w-0 flex-col p-4 sm:p-5"><SectionTitle eyebrow="Next move" title={snapshot.upcoming ? `Month ${String(nextTurn).padStart(2, "0")} · ${monthLabel(nextTurn)}` : "Season complete"} action={snapshot.upcoming ? <span className="inline-flex items-center gap-1 rounded-full border border-[#c8ff55]/15 bg-[#c8ff55]/[0.05] px-2 py-1 text-[8px] font-bold uppercase tracking-[.1em] text-[#c8ff55]"><span className="h-1 w-1 rounded-full bg-[#c8ff55]" /> Decisions open</span> : <CheckCircle2 size={16} className="text-[#9fdda8]" />} />
          <div className="flex-1">{snapshot.upcoming ? <><p className="mb-3 text-[10px] leading-5 text-[#94a096]">Your previous decisions are ready to carry forward. Adjust the levers that matter for the market ahead.</p>{marketEvents.length ? <div className="space-y-2">{marketEvents.slice(0, 2).map((event) => <EventCard key={event.key} event={event} compact />)}</div> : <div className="rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#d2d9d1]"><ShieldCheck size={14} className="text-[#a0dfa9]" />No major market shock forecast</div><p className="mb-0 mt-1.5 text-[9px] leading-4 text-[#78857c]">Market events are seeded for this season. Your strategy still moves the needle.</p></div>}<div className="mt-3 flex items-center justify-between gap-2 rounded-[11px] border border-white/[0.06] px-3 py-2.5"><div className="flex items-center gap-2"><Clock3 size={13} className="text-[#909c92]" /><span className="text-[9px] text-[#96a198]">{snapshot.season.mode === "practice" ? "Deadline" : "Locks in"}</span></div><span className="mono text-[10px] font-semibold text-[#dce3db]">{snapshot.season.mode === "practice" ? "Self-paced" : countdown || "24 hours"}</span></div></> : <div className="flex h-full min-h-[155px] flex-col items-center justify-center rounded-[12px] border border-white/[0.06] bg-white/[0.015] text-center"><Trophy size={22} className="text-[#c8ff55]" /><p className="mb-0 mt-2 text-[11px] font-semibold">That’s the season.</p><p className="mb-0 mt-1 max-w-[220px] text-[9px] leading-4 text-[#839087]">Your 12-month run is ready for its final review.</p></div>}</div>
          <div className="mt-4">{snapshot.upcoming ? <BrandButton className="w-full" onClick={startDecisions} icon={ArrowRight}>Open decision room</BrandButton> : <BrandButton className="w-full" onClick={() => setSeasonModal(true)} icon={Plus}>Start a new season</BrandButton>}</div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <section className="panel p-4 sm:p-5"><SectionTitle eyebrow="A market that moves" title="Competitive landscape" action={<span className="text-[9px] text-[#7d8981]">Lagos fashion · share of demand</span>} />
          <div className="mb-3 grid grid-cols-[minmax(100px,1fr)_1fr_62px] items-center gap-3 border-b border-white/[0.06] px-1 pb-2 text-[8px] font-bold uppercase tracking-[.13em] text-[#718077]"><span>Brand</span><span>Market position</span><span className="text-right">Share</span></div>
          <CompetitorRow name={snapshot.business.name} share={activeOutcome?.marketShare ?? snapshot.state.marketShare} color={snapshot.business.brandColor || "#c8ff55"} isPlayer />
          {(activeOutcome?.competitors ?? snapshot.state.competitors).map((competitor) => <CompetitorRow key={competitor.id} name={competitor.name} share={competitor.marketShare} color={competitor.role === "premium" ? "#ba9dff" : competitor.role === "discounter" ? "#ffaf78" : "#78baff"} />)}
          <div className="mt-3 rounded-[10px] border border-white/[0.055] bg-white/[0.02] px-3 py-2 text-[9px] leading-4 text-[#829087]"><Info size={11} className="mr-1 inline text-[#92a095]" />Competitors adjust pricing and awareness in response to last month’s market.</div>
        </section>
        <section className="panel p-4 sm:p-5"><SectionTitle eyebrow="The board" title="Arena leaderboard" action={<button onClick={() => navTo("leaderboard")} className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#aab4ab] hover:text-[#c8ff55]">Full board <ArrowRight size={12} /></button>} />
          {commonBoard.length ? <div className="space-y-1.5">{commonBoard.slice(0, 4).map((entry) => <LeaderboardMini key={entry.businessId} entry={entry} />)}</div> : <div className="rounded-[12px] border border-dashed border-white/[0.1] bg-white/[0.012] px-4 py-6 text-center"><div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-[#c8ff55]/[0.07] text-[#c8ff55]"><Trophy size={15} /></div><p className="mb-0 mt-2 text-[10px] font-semibold text-[#d6ddd5]">Your first month sets the pace.</p><p className="mb-0 mt-1 text-[9px] text-[#79857c]">The board updates when CEOs complete this turn.</p></div>}
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3"><div><div className="text-[8px] font-semibold uppercase tracking-[.12em] text-[#78847c]">Your standing</div><div className="mt-1 text-[11px] font-semibold">{snapshot.rank ? `#${snapshot.rank} · ${snapshot.business.name}` : "Not ranked yet"}</div></div><span className="rounded-full border border-white/[0.07] px-2 py-1 text-[8px] text-[#87938b]">{snapshot.season.mode}</span></div>
        </section>
      </div>
      {actionError && <InlineAlert message={actionError} onDismiss={() => setActionError("")} />}
    </div>);
  }

  if (view === "decisions") {
    const decisions = activeDecisions;
    if (!decisions || !snapshot.currentTurn) return gameArea(<EmptySeason onStart={() => setSeasonModal(true)} />);
    const spend = Object.values(decisions.marketing).reduce((sum, value) => sum + value, 0);
    const inventoryEstimate = decisions.inventory.orderUnits * snapshot.state.unitCost * 0.96;
    const teamSizeSales = Math.max(0, snapshot.state.salesStaff + decisions.sales.staffChange);
    const teamSizeOps = Math.max(0, snapshot.state.opsStaff + decisions.operations.staffChange);
    const salaryFactor = decisions.operations.salaryLevel === "above" ? 1.2 : decisions.operations.salaryLevel === "below" ? 0.85 : 1;
    const monthlyPayroll = teamSizeSales * 250000 * salaryFactor + teamSizeOps * 230000 * salaryFactor;
    const overhead = snapshot.state.overhead;
    const plannedCommitments = spend + decisions.customerExperience.investment + inventoryEstimate + monthlyPayroll + overhead;
    const cashAfterCommitments = snapshot.state.cash - plannedCommitments;
    const runwayAfterCommitments = monthlyPayroll + overhead > 0 ? cashAfterCommitments / (monthlyPayroll + overhead) : 99;
    const warnings = [
      ...(decisions.pricing.price > snapshot.config.referencePrice * 1.45 ? ["Your price sits well above the reference; watch for softer conversion."] : []),
      ...(decisions.pricing.discount > 0.2 ? ["A discount above 20% can move units but narrows your gross margin."] : []),
      ...(cashAfterCommitments < 0 ? ["Planned commitments exceed on-hand cash. The emergency overdraft may activate."] : []),
      ...(runwayAfterCommitments >= 0 && runwayAfterCommitments < 1 ? ["Projected cash falls below one month of payroll and overhead."] : []),
      ...(teamSizeSales === 0 ? ["No sales staff means sharply reduced new-customer capacity."] : []),
      ...(decisions.inventory.orderUnits === 0 && snapshot.state.inventory < 400 ? ["Low inventory leaves less room to absorb a demand spike."] : []),
    ];
    const projectedCoach = decisions.pricing.price < snapshot.config.referencePrice
      ? "A lower ticket can widen the pool of shoppers, but check whether the unit margin still covers fulfilment and growth costs."
      : decisions.pricing.price > snapshot.config.referencePrice
        ? "A premium price can protect contribution per order. Pair it with enough brand trust and customer experience to earn the difference."
        : "A reference price keeps the comparison simple. Your channel mix, fulfilment and retention will do more of the work this month.";
    const card = (title: string, subtitle: string, icon: LucideIcon, content: ReactNode, number: string) => { const Icon = icon; return <section className="panel min-w-0 p-4 sm:p-[18px]"><div className="mb-4 flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-white/[0.07] bg-white/[0.03] text-[#c8ff55]"><Icon size={16} /></span><div><h3 className="m-0 text-[12px] font-semibold text-[#e8ede7]">{title}</h3><p className="mb-0 mt-1 text-[9px] leading-4 text-[#7d8980]">{subtitle}</p></div></div><span className="mono text-[9px] text-[#5e6b61]">{number}</span></div>{content}</section>; };
    const fieldLabel = (label: string, value: string) => <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[9px] font-medium text-[#909d93]">{label}</span><span className="mono text-[10px] font-semibold text-[#d9e0d8]">{value}</span></div>;
    return gameArea(<div className="animate-fade-up space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><button onClick={() => { setReview(false); setView("dashboard"); }} className="mb-3 inline-flex items-center gap-1 text-[9px] text-[#89958d] hover:text-white"><ArrowDownRight className="rotate-45" size={12} /> Command center</button><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.17em] text-[#97a397]">Decision room <span className="text-[#5a655d]">/</span><span className="text-[#c8ff55]">Month {String(nextTurn).padStart(2, "0")}</span></div><h1 className="mb-0 mt-2 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-.06em]">The month is yours<span className="text-[#c8ff55]">.</span></h1><p className="mb-0 mt-2 max-w-[570px] text-[10px] leading-5 text-[#89968d]">Each lever has a cost and a consequence. Set your plan, review the commitments, then lock the month.</p></div><div className="flex gap-2"><BrandButton variant="secondary" onClick={runProjection} disabled={busy !== "" || projectionRemaining <= 0} icon={busy === "projection" ? LoaderCircle : Activity}>{busy === "projection" ? "Projecting…" : `What-if · ${projectionRemaining} left`}</BrandButton>{!review ? <BrandButton onClick={() => setReview(true)} icon={ArrowRight}>Review & lock</BrandButton> : <BrandButton variant="secondary" onClick={() => setReview(false)} icon={ChevronRight}>Edit decisions</BrandButton>}</div></div>
      {!review ? <>
        <div className="grid gap-3 sm:grid-cols-3"><div className="panel-soft flex items-center gap-3 p-3"><span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#c8ff55]/[0.08] text-[#c8ff55]"><Wallet size={14} /></span><div><div className="text-[8px] font-semibold uppercase tracking-[.12em] text-[#78847b]">Available cash</div><div className="mono mt-1 text-[12px] font-semibold">{compactNaira(snapshot.state.cash)}</div></div></div><div className="panel-soft flex items-center gap-3 p-3"><span className="grid h-8 w-8 place-items-center rounded-[9px] bg-white/[0.04] text-[#a6b0a8]"><Package size={14} /></span><div><div className="text-[8px] font-semibold uppercase tracking-[.12em] text-[#78847b]">Units in stock</div><div className="mono mt-1 text-[12px] font-semibold">{comma(snapshot.state.inventory)} <span className="text-[9px] font-normal text-[#7e8b81]">· {comma(snapshot.state.baseCapacity + snapshot.state.opsStaff * snapshot.config.opsCapacityPerPerson)} capacity</span></div></div></div><div className="panel-soft flex items-center gap-3 p-3"><span className="grid h-8 w-8 place-items-center rounded-[9px] bg-white/[0.04] text-[#a6b0a8]"><Users size={14} /></span><div><div className="text-[8px] font-semibold uppercase tracking-[.12em] text-[#78847b]">Active customers</div><div className="mono mt-1 text-[12px] font-semibold">{comma(snapshot.state.activeCustomers)} <span className="text-[9px] font-normal text-[#7e8b81]">· {Math.round(snapshot.state.satisfaction)} satisfaction</span></div></div></div></div>
        {snapshot.upcoming?.events.map((event) => <EventCard key={event.key} event={event} />)}
        <div className="grid gap-3 lg:grid-cols-2">
          {card("Pricing", "Margin vs. conversion", CircleDollarSign, <div className="space-y-4"><div>{fieldLabel("Selling price per item", fullNaira(decisions.pricing.price))}<input aria-label="Selling price per item" type="range" min={Math.round(snapshot.config.referencePrice * .5)} max={Math.round(snapshot.config.referencePrice * 2)} step={500} value={decisions.pricing.price} onChange={(event) => setPricing("price", Number(event.target.value))} className="range-control h-2 w-full cursor-pointer appearance-none bg-transparent" /><div className="mt-1 flex justify-between text-[8px] text-[#6e7b72]"><span>₦{comma(snapshot.config.referencePrice * .5)}</span><span>Reference · {compactNaira(snapshot.config.referencePrice)}</span><span>₦{comma(snapshot.config.referencePrice * 2)}</span></div></div><div className="rounded-[10px] border border-white/[0.055] bg-white/[0.02] px-3 py-2.5">{fieldLabel("Promotion / discount", `${Math.round(decisions.pricing.discount * 100)}%`)}<input aria-label="Promotion discount percentage" type="range" min={0} max={40} step={1} value={Math.round(decisions.pricing.discount * 100)} onChange={(event) => setPricing("discount", Number(event.target.value) / 100)} className="range-control h-2 w-full cursor-pointer appearance-none bg-transparent" /><div className="mt-1 flex justify-between text-[8px] text-[#6e7b72]"><span>No discount</span><span>Moves stock · costs margin</span><span>40%</span></div></div></div>, "01")}
          {card("Marketing", "Diminishing returns · four channels", Target, <div className="space-y-3">{(Object.keys(CHANNEL_LABELS) as (keyof Decisions["marketing"])[]).map((channel) => { const meta = CHANNEL_LABELS[channel]; const ChannelIcon = meta.icon; const maxSpend = Math.max(0, snapshot.state.cash); return <div key={channel} className="rounded-[10px] border border-white/[0.05] bg-white/[0.016] p-2.5"><div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-[8px] bg-white/[0.04] text-[#9ca9a0]"><ChannelIcon size={13} /></span><div className="min-w-0 flex-1"><div className="text-[9px] font-semibold text-[#dbe1d9]">{meta.label}</div><div className="mt-0.5 text-[8px] text-[#78847b]">{meta.descriptor}</div></div><span className="mono text-[10px] font-semibold text-[#e0e6dd]">{compactNaira(decisions.marketing[channel])}</span></div><input aria-label={`${meta.label} monthly budget`} type="range" min={0} max={maxSpend || 1} step={Math.max(10000, Math.round(Math.max(1, maxSpend) / 100))} value={Math.min(decisions.marketing[channel], maxSpend)} onChange={(event) => setChannelSpend(channel, Number(event.target.value))} className="range-control h-2 w-full cursor-pointer appearance-none bg-transparent" /></div>; })}<div className="flex items-center justify-between px-1 pt-0.5"><span className="text-[9px] text-[#87938a]">Total monthly media</span><span className="mono text-[11px] font-semibold text-[#c8ff55]">{compactNaira(spend)}</span></div></div>, "02")}
          {card("Sales team", "Capacity vs. payroll", Users, <div className="space-y-4"><div className="flex items-center justify-between rounded-[10px] border border-white/[0.055] bg-white/[0.02] p-3"><div><div className="text-[9px] font-semibold text-[#d9e0d8]">Sales & support staff</div><div className="mt-1 text-[8px] text-[#78847d]">350 orders / person · ₦250k monthly</div></div><ValueStepper label="sales staff" min={-snapshot.state.salesStaff} max={12 - snapshot.state.salesStaff} value={decisions.sales.staffChange} onChange={(value) => setSales("staffChange", value)} /><span className="absolute" /></div><div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-semibold text-[#d9e0d8]">Sales commission</div><div className="mt-1 text-[8px] text-[#78847d]">Incentive can lift conversion.</div></div><div className="flex items-center gap-2"><input aria-label="Sales commission percentage" type="range" min={0} max={15} step={1} value={Math.round(decisions.sales.commission * 100)} onChange={(event) => setSales("commission", Number(event.target.value) / 100)} className="range-control w-28 cursor-pointer" /><span className="mono w-9 text-right text-[10px] text-[#d9e0d8]">{Math.round(decisions.sales.commission * 100)}%</span></div></div><div className="rounded-[9px] bg-white/[0.025] px-3 py-2 text-[8px] leading-4 text-[#7d8981]">{decisions.sales.staffChange > 0 ? `Hiring fee · ${compactNaira(decisions.sales.staffChange * 125000)} one-off.` : decisions.sales.staffChange < 0 ? "Firing reduces payroll; the capacity change takes effect this month." : "A new hire costs 50% of one month's salary up front."}</div></div>, "03")}
          {card("Hiring & operations", "Fulfilment capacity vs. payroll", Building2, <div className="space-y-4"><div className="flex items-center justify-between rounded-[10px] border border-white/[0.055] bg-white/[0.02] p-3"><div><div className="text-[9px] font-semibold text-[#d9e0d8]">Operations staff</div><div className="mt-1 text-[8px] text-[#78847d]">+500 fulfilment capacity / person</div></div><ValueStepper label="operations staff" min={-snapshot.state.opsStaff} max={10 - snapshot.state.opsStaff} value={decisions.operations.staffChange} onChange={(value) => setOps("staffChange", value)} /></div><div><div className="mb-2 text-[9px] font-semibold text-[#d9e0d8]">Salary level</div><div className="grid grid-cols-3 gap-1.5">{(["below", "market", "above"] as const).map((level) => <button key={level} onClick={() => setOps("salaryLevel", level)} className={`rounded-[9px] border px-2 py-2 text-[8px] font-semibold capitalize transition ${decisions.operations.salaryLevel === level ? "border-[#c8ff55]/30 bg-[#c8ff55]/[0.075] text-[#d8ff9e]" : "border-white/[0.07] bg-white/[0.018] text-[#839087] hover:text-white"}`}>{level}<span className="mt-1 block text-[7px] opacity-65">{level === "below" ? "85% salary" : level === "above" ? "120% · retain" : "Market pay"}</span></button>)}</div></div></div>, "04")}
          {card("Inventory", "Cash tied up vs. stockouts", Package, <div className="space-y-4"><div>{fieldLabel("New units to order", `${comma(decisions.inventory.orderUnits)} units · ${compactNaira(inventoryEstimate)}`)}<input aria-label="Units of inventory to order" type="range" min={0} max={5000} step={100} value={decisions.inventory.orderUnits} onChange={(event) => setInventory("orderUnits", Number(event.target.value))} className="range-control h-2 w-full cursor-pointer appearance-none bg-transparent" /><div className="mt-1 flex justify-between text-[8px] text-[#6e7b72]"><span>None · cash stays liquid</span><span>Bulk tiers lower unit cost</span><span>5,000</span></div></div><div>{fieldLabel("Safety-stock target", `${comma(decisions.inventory.safetyStock)} units`)}<input aria-label="Safety stock target" type="range" min={0} max={2000} step={50} value={decisions.inventory.safetyStock} onChange={(event) => setInventory("safetyStock", Number(event.target.value))} className="range-control h-2 w-full cursor-pointer appearance-none bg-transparent" /></div><div className="rounded-[9px] bg-white/[0.025] px-3 py-2 text-[8px] leading-4 text-[#7d8981]">Stock is paid for now. Holding cost is 2.5% of month-end inventory value.</div></div>, "05")}
          {card("Finance", "Liquidity now vs. interest later", CreditCard, <div className="space-y-3"><div className="flex items-center justify-between rounded-[10px] border border-white/[0.055] bg-white/[0.02] p-3"><div><div className="text-[9px] font-semibold text-[#d9e0d8]">Current debt</div><div className="mono mt-1 text-[11px] text-[#b6c0b7]">{compactNaira(snapshot.state.debt)}</div></div><div className="text-right"><div className="text-[8px] text-[#7e8a82]">Credit available</div><div className="mono mt-1 text-[10px] text-[#c8ff55]">{compactNaira(Math.max(0, snapshot.state.creditLineLimit - snapshot.state.debt))}</div></div></div>{snapshot.state.debt < snapshot.state.creditLineLimit && <div>{fieldLabel("Draw on credit line", compactNaira(decisions.finance.draw))}<input aria-label="Credit line draw" type="range" min={0} max={Math.max(1, snapshot.state.creditLineLimit - snapshot.state.debt)} step={100000} value={decisions.finance.draw} onChange={(event) => setFinance("draw", Number(event.target.value))} className="range-control h-2 w-full cursor-pointer appearance-none bg-transparent" /></div>}{snapshot.state.debt > 0 && <div>{fieldLabel("Repay debt", compactNaira(decisions.finance.repay))}<input aria-label="Debt repayment amount" type="range" min={0} max={snapshot.state.debt} step={100000} value={decisions.finance.repay} onChange={(event) => setFinance("repay", Number(event.target.value))} className="range-control h-2 w-full cursor-pointer appearance-none bg-transparent" /></div>}<div className="rounded-[9px] border border-[#e7c275]/10 bg-[#e7c275]/[0.035] px-3 py-2 text-[8px] leading-4 text-[#aa9b77]">3% interest / month · Emergency overdraft carries a 6% penalty.</div></div>, "06")}
          {card("Customer experience", "Retention vs. immediate spend", Heart, <div className="space-y-4"><div>{fieldLabel("Support & experience investment", compactNaira(decisions.customerExperience.investment))}<input aria-label="Customer experience investment" type="range" min={0} max={1500000} step={25000} value={decisions.customerExperience.investment} onChange={(event) => setCX(Number(event.target.value))} className="range-control h-2 w-full cursor-pointer appearance-none bg-transparent" /><div className="mt-1 flex justify-between text-[8px] text-[#6e7b72]"><span>₦0</span><span>Satisfaction · repeat · referrals</span><span>₦1.5m</span></div></div><div className="flex gap-2 rounded-[9px] border border-white/[0.055] bg-white/[0.02] p-2.5"><Sparkles size={13} className="mt-0.5 shrink-0 text-[#c8ff55]" /><p className="m-0 text-[8px] leading-4 text-[#8d998f]">Good experiences compound. The payoff is retention and referrals; the spend is immediate.</p></div></div>, "07")}
        </div>
        {actionError && <InlineAlert message={actionError} onDismiss={() => setActionError("")} />}
        <div className="sticky bottom-[70px] z-10 flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.085] bg-[#101512]/95 p-3 shadow-2xl backdrop-blur-xl sm:bottom-3 sm:px-4"><div className="min-w-0"><div className="text-[8px] font-semibold uppercase tracking-[.12em] text-[#7e8b82]">Planned marketing</div><div className="mono mt-1 text-[12px] font-semibold">{compactNaira(spend)}<span className="ml-2 text-[8px] font-normal text-[#87938a]">· {comma(decisions.inventory.orderUnits)} units to order</span></div></div><div className="flex gap-2"><BrandButton variant="secondary" onClick={runProjection} disabled={busy !== "" || projectionRemaining <= 0} icon={Activity} className="hidden sm:inline-flex">What-if</BrandButton><BrandButton onClick={() => setReview(true)} icon={ArrowRight}>Review & lock</BrandButton></div></div>
      </> : <div className="grid items-start gap-4 xl:grid-cols-[1.2fr_.8fr]"><div className="space-y-4"><section className="panel p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#c8ff55]"><LockKeyhole size={13} /> Final review · month {String(nextTurn).padStart(2, "0")}</div><h2 className="mb-0 mt-2 text-[20px] font-semibold tracking-[-.05em]">Lock your decisions</h2><p className="mb-0 mt-1 text-[9px] text-[#88948b]">This turn becomes immutable once the simulation runs.</p></div><span className="rounded-[9px] border border-white/[0.07] px-2.5 py-1.5 text-[8px] text-[#849087]">Rule v1 · seeded market</span></div><div className="mt-5 divide-y divide-white/[0.055]">{[
            ["Pricing", `${fullNaira(decisions.pricing.price)} / item · ${Math.round(decisions.pricing.discount * 100)}% promotion`],
            ["Marketing", `${compactNaira(spend)} across four channels`],
            ["Sales", `${decisions.sales.staffChange > 0 ? `+${decisions.sales.staffChange}` : decisions.sales.staffChange} staff change · ${Math.round(decisions.sales.commission * 100)}% commission`],
            ["Operations", `${decisions.operations.staffChange > 0 ? `+${decisions.operations.staffChange}` : decisions.operations.staffChange} ops staff · ${decisions.operations.salaryLevel} pay`],
            ["Inventory", `${comma(decisions.inventory.orderUnits)} units · ${compactNaira(inventoryEstimate)} estimated`],
            ["Finance", decisions.finance.draw > 0 ? `Draw ${compactNaira(decisions.finance.draw)}` : decisions.finance.repay > 0 ? `Repay ${compactNaira(decisions.finance.repay)}` : "No credit-line change"],
            ["Customer experience", `${compactNaira(decisions.customerExperience.investment)} investment`],
          ].map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3 py-3"><span className="text-[9px] font-semibold text-[#b2bcb3]">{key}</span><span className="text-right text-[9px] text-[#dce2da]">{value}</span></div>)}</div></section>
          <section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Cash commitments" title="Projected runway check" /><div className="flex items-end justify-between gap-4"><div><div className="text-[9px] text-[#849087]">Cash after planned commitments</div><div className={`mono mt-1.5 text-[23px] font-semibold tracking-[-.055em] ${cashAfterCommitments < 0 ? "text-[#ff8889]" : "text-[#eef3ec]"}`}>{compactNaira(cashAfterCommitments)}</div><div className="mt-1 text-[8px] text-[#79867d]">Before uncertain sales revenue · conservative estimate</div></div><div className="text-right"><div className="text-[8px] font-semibold uppercase tracking-[.1em] text-[#7d8981]">Runway after commit</div><div className={`mono mt-1.5 text-[18px] font-semibold ${runwayAfterCommitments < 1 ? "text-[#ff8b8e]" : "text-[#c8ff55]"}`}>{Math.max(0, runwayAfterCommitments).toFixed(1)}<span className="ml-1 text-[9px] font-normal text-[#88948b]">months</span></div></div></div><div className="mt-4"><ProgressBar value={Math.max(0, Math.min(100, (runwayAfterCommitments / 6) * 100))} color={runwayAfterCommitments < 1 ? "#ff7779" : "#c8ff55"} height={6} /></div></section>
          {warnings.length > 0 && <section className="rounded-[13px] border border-[#e9bd70]/20 bg-[#e9bd70]/[0.045] p-4"><div className="mb-2 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.13em] text-[#e8c680]"><AlertTriangle size={13} /> Before you lock</div><ul className="m-0 space-y-2 pl-4 text-[9px] leading-4 text-[#b8a984]">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}</div>
          <div className="space-y-4"><section className="relative overflow-hidden rounded-[16px] border border-[#c8ff55]/15 bg-[linear-gradient(145deg,rgba(200,255,85,.07),rgba(18,25,20,.98)_65%)] p-4 sm:p-5"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.14em] text-[#c8ff55]"><Sparkles size={14} /> Decision coach</div><p className="mb-0 mt-3 text-[11px] leading-[1.75] text-[#d2ddcf]">{projectedCoach}</p><p className="mb-0 mt-3 border-t border-white/[0.07] pt-3 text-[8px] leading-4 text-[#849286]">Qualitative guidance only. The engine decides outcomes; no forecast is guaranteed.</p></section><div className="panel p-4"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.12em] text-[#aab5aa]"><ShieldCheck size={13} className="text-[#93dba1]" /> Fair-play check</div><ul className="mb-0 mt-3 space-y-2 text-[9px] leading-4 text-[#859188]"><li className="flex gap-2"><Check size={12} className="mt-0.5 shrink-0 text-[#8cd99d]" /> Same market event seed for this season month</li><li className="flex gap-2"><Check size={12} className="mt-0.5 shrink-0 text-[#8cd99d]" /> Server-authoritative simulation and scoring</li><li className="flex gap-2"><Check size={12} className="mt-0.5 shrink-0 text-[#8cd99d]" /> Decision record becomes immutable after lock</li></ul></div><div className="space-y-2"><BrandButton className="w-full min-h-12" onClick={confirmLock} disabled={busy !== ""} icon={LockKeyhole}>{busy === "simulate" ? "Simulating month…" : "Confirm & lock this month"}</BrandButton><BrandButton className="w-full" variant="secondary" onClick={runProjection} disabled={busy !== "" || projectionRemaining <= 0} icon={Activity}>Run a what-if projection</BrandButton><button onClick={() => setReview(false)} className="w-full py-2 text-[9px] text-[#87938a] hover:text-white">Go back and edit decisions</button></div></div></div>}
    </div>);
  }

  if (view === "results") {
    if (!lastResult) return gameArea(<div className="panel p-8 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#c8ff55]/10 text-[#c8ff55]"><Activity size={18} /></div><h1 className="mb-0 mt-4 text-xl font-semibold">No month to review yet</h1><p className="mb-4 mt-2 text-[11px] text-[#87938b]">Lock your first decisions to get a complete results report.</p><BrandButton onClick={startDecisions} icon={ArrowRight}>Open decision room</BrandButton></div>);
    const result = lastResult;
    const outcome = result.outcome;
    const bestContribution = [...result.explanations.contributions].sort((a, b) => b.profit - a.profit)[0];
    const totalRevenue = result.outcome.revenue;
    return gameArea(<div className="animate-fade-up space-y-5">
      <div className="relative overflow-hidden rounded-[19px] border border-white/[0.085] bg-[linear-gradient(115deg,#131b15,#101611_65%,#152019)] p-5 sm:p-7"><div className="absolute -right-5 -top-16 h-48 w-56 rounded-full bg-[#c8ff55]/[0.07] blur-[65px]" /><div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><div className="inline-flex items-center gap-1.5 rounded-full border border-[#9bdfa8]/15 bg-[#9bdfa8]/[0.06] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[.13em] text-[#a6e2ae]"><CheckCircle2 size={11} /> Month locked · {monthLabel(outcome.month)}</div><h1 className="mb-0 mt-4 text-[clamp(1.7rem,4vw,2.7rem)] font-semibold tracking-[-.07em]">The month has spoken<span className="text-[#c8ff55]">.</span></h1><p className="mb-0 mt-2 max-w-[500px] text-[10px] leading-5 text-[#96a299]">{outcome.operatingProfit >= 0 ? "A positive month is a signal, not a finish line. Here’s what drove it." : "A tough month is useful data. Here’s where the pressure landed and what to adjust."}</p></div><div className="flex items-center gap-4 rounded-[14px] border border-white/[0.08] bg-black/[0.12] p-3.5"><div className="grid h-[58px] w-[58px] place-items-center rounded-full border border-[#c8ff55]/20 bg-[#c8ff55]/[0.055] text-center"><span className="mono text-[18px] font-bold text-[#d9ff9a]">{outcome.score}</span></div><div><div className="text-[8px] font-semibold uppercase tracking-[.13em] text-[#819087]">CEO score</div><div className="mt-1 text-[10px] font-semibold text-[#dce3db]">{outcome.score >= 700 ? "Strong month" : outcome.score >= 500 ? "Building momentum" : "Room to improve"}</div><div className="mt-1 text-[8px] text-[#7c897f]">Season avg · {outcome.cumulativeScore}</div></div></div></div><div className="relative mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-4 sm:grid-cols-4"><ResultMetric label="Revenue" value={compactNaira(outcome.revenue)} /><ResultMetric label="Operating profit" value={compactNaira(outcome.operatingProfit)} tone={outcome.operatingProfit >= 0 ? "good" : "bad"} /><ResultMetric label="Cash" value={compactNaira(outcome.cash)} /><ResultMetric label="Customers" value={comma(outcome.activeCustomers)} detail={`+${comma(outcome.newCustomers)} new`} /></div></div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Cause & effect" title="Your decisions, measured" action={<span className="text-[8px] text-[#768279]">vs. last month’s plan · same seed</span>} /><div className="space-y-3">{result.explanations.contributions.map((contribution) => <ContributionRow key={contribution.area} item={contribution} max={Math.max(250000, ...result.explanations.contributions.map((entry) => Math.abs(entry.profit)))} />)}</div><div className="mt-4 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[8px] leading-4 text-[#78867c]"><Info size={11} className="mr-1.5 inline text-[#9aa69c]" />Counterfactual contributions rerun one decision area at a time against the same market state and seed. They’re directional, not additive.</div></section>
        <section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Score architecture" title="CEO score breakdown" action={<span className="mono text-[9px] text-[#c8ff55]">{outcome.score} / 1,000</span>} /><RadarChart dimensions={outcome.dimensions} /><div className="mt-3 flex items-center justify-between rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"><span className="text-[8px] text-[#849087]">Score is measured against this season’s starting conditions.</span><ShieldCheck size={13} className="shrink-0 text-[#91dba1]" /></div></section></div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]"><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="The why" title="What moved the numbers" />{result.explanations.driverNotes.length ? <ul className="m-0 space-y-3">{result.explanations.driverNotes.map((note, index) => <li key={note} className="flex gap-2.5 text-[10px] leading-[1.65] text-[#a3aea5]"><span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${index === 0 ? "bg-[#c8ff55]" : "bg-[#79877d]"}`} />{note}</li>)}</ul> : <p className="text-[10px] text-[#8c988f]">Every major outcome is tied to a rule and your decisions.</p>}<div className="mt-4 grid grid-cols-2 gap-2"><MiniResult label="Stockouts" value={`${comma(outcome.stockouts)} · ${pct(outcome.stockoutRate)}`} /><MiniResult label="Market share" value={pct(outcome.marketShare, 1)} /><MiniResult label="Marketing ROAS" value={`${outcome.roas.toFixed(2)}×`} /><MiniResult label="Cash runway" value={`${outcome.runway.toFixed(1)} months`} /></div></section>
        <section className="relative overflow-hidden rounded-[16px] border border-[#c8ff55]/14 bg-[linear-gradient(145deg,rgba(200,255,85,.055),rgba(16,22,18,.98)_70%)] p-4 sm:p-5"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.14em] text-[#c8ff55]"><Sparkles size={14} /> Arena coach · based on engine facts</div><div className="mt-4 space-y-3">{result.explanations.coach.map((paragraph, index) => <p key={`${paragraph}-${index}`} className="m-0 text-[10px] leading-[1.75] text-[#c7d2c5]">{paragraph}</p>)}</div><div className="mt-4 border-t border-white/[0.07] pt-3 text-[8px] leading-4 text-[#7f8c80]">The simulation engine determines outcomes. Coaching explains its recorded facts; it doesn’t change scores or game state.</div></section></div>
      {result.events.length > 0 && <section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Market conditions" title="What the market threw at you" /><div className="grid gap-2 sm:grid-cols-2">{result.events.map((event) => <EventCard key={event.key} event={event} compact />)}</div></section>}
      <section className="panel p-4 sm:p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.13em] text-[#87948a]"><Users size={13} /> Competition update</div><h2 className="mb-0 mt-1.5 text-[15px] font-semibold">The market didn’t stand still</h2><p className="mb-0 mt-1 text-[9px] text-[#78867d]">Competitor actions are generated from last month’s market state.</p></div><BrandButton variant="secondary" onClick={() => navTo("leaderboard")} icon={Trophy}>{snapshot.rank ? `View rank · #${snapshot.rank}` : "Open leaderboard"}</BrandButton></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{outcome.competitorActions.length ? outcome.competitorActions.map((action) => <div key={action} className="flex gap-2 rounded-[9px] border border-white/[0.055] bg-white/[0.02] p-2.5 text-[9px] leading-4 text-[#9ba69d]"><Activity size={12} className="mt-0.5 shrink-0 text-[#83b9ff]" />{action}</div>) : <div className="rounded-[9px] border border-white/[0.055] bg-white/[0.02] p-3 text-[9px] text-[#87938a]">No competitor action was recorded this month.</div>}</div></section>
      <div className="flex flex-col justify-between gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.02] p-4 sm:flex-row sm:items-center"><div><div className="text-[9px] font-semibold text-[#e1e7df]">This turn is immutable and auditable.</div><div className="mt-1 text-[8px] text-[#7b887f]">Input & output hashes are stored against your rule version and seed.</div></div><div className="flex gap-2"><BrandButton variant="secondary" onClick={() => navTo("performance")} icon={BarChart3}>Turn history</BrandButton>{snapshot.upcoming ? <BrandButton onClick={startDecisions} icon={ArrowRight}>Next month</BrandButton> : <BrandButton onClick={() => setSeasonModal(true)} icon={Trophy}>Season report</BrandButton>}</div></div>
      {actionError && <InlineAlert message={actionError} onDismiss={() => setActionError("")} />}
    </div>);
  }

  if (view === "performance") {
    const history = snapshot.history;
    const revenueValues = history.map((item) => item.outcome.revenue);
    const profitValues = history.map((item) => item.outcome.operatingProfit);
    return gameArea(<div className="animate-fade-up space-y-5"><PageHeader eyebrow="Business performance" title="The numbers behind every month" subtitle="Track the trajectory, inspect the decisions, and learn which levers actually moved your company." action={<BrandButton variant="secondary" onClick={() => navTo("season")} icon={CalendarDays}>Season overview</BrandButton>} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><MetricCard icon={TrendingUp} label="Cumulative revenue" value={compactNaira(history.reduce((sum, item) => sum + item.outcome.revenue, 0))} detail={`${history.length} of 12 months reported`} /><MetricCard icon={CircleDollarSign} label="Operating profit" value={compactNaira(history.reduce((sum, item) => sum + item.outcome.operatingProfit, 0))} detail="Sum of reported monthly operations" tone={history.reduce((sum, item) => sum + item.outcome.operatingProfit, 0) >= 0 ? "positive" : "negative"} /><MetricCard icon={Users} label="Active customers" value={comma(snapshot.state.activeCustomers)} detail={`Starting base · 600 · ${snapshot.state.activeCustomers >= 600 ? "+" : ""}${comma(snapshot.state.activeCustomers - 600)} net`} /><MetricCard icon={Trophy} label="Average CEO score" value={history.length ? `${snapshot.seasonAverage}` : "—"} detail="Out of 1,000 · equal month weighting" /></div>
      <div className="grid gap-4 lg:grid-cols-2"><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Revenue · ₦" title="Monthly revenue" /><div className="h-[160px]"><Sparkline values={revenueValues} label="Revenue in Naira across completed months" /></div><div className="mt-2 flex justify-between text-[8px] text-[#728077]"><span>Month 01</span><span>{history.length ? `Month ${String(history.length).padStart(2, "0")}` : "Awaiting first result"}</span></div></section><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Operations · ₦" title="Monthly operating profit" /><div className="h-[160px]"><Sparkline values={profitValues} color="#8fd6a7" label="Monthly operating profit in Naira" /></div><div className="mt-2 flex justify-between text-[8px] text-[#728077]"><span>Profitability after fulfilment costs</span><span>{history.length ? `${history.filter((item) => item.outcome.operatingProfit > 0).length} profitable months` : "No reports yet"}</span></div></section></div>
      <section className="panel overflow-hidden"><div className="flex flex-col justify-between gap-2 border-b border-white/[0.065] p-4 sm:flex-row sm:items-center sm:px-5"><div><div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#87938b]">Decision journal</div><h2 className="mb-0 mt-1 text-[15px] font-semibold">Every month, one record</h2></div><span className="rounded-full border border-white/[0.07] px-2.5 py-1 text-[8px] text-[#829087]">Append-only · replay ready</span></div>
        {history.length ? <div className="arena-scrollbar overflow-x-auto"><table className="w-full min-w-[780px] border-collapse text-left"><thead><tr className="border-b border-white/[0.06] text-[8px] font-bold uppercase tracking-[.12em] text-[#718078]"><th className="px-5 py-3">Turn</th><th className="px-3 py-3">Price / discount</th><th className="px-3 py-3">Marketing</th><th className="px-3 py-3">Revenue</th><th className="px-3 py-3">Operating profit</th><th className="px-3 py-3">Score</th><th className="px-5 py-3">Audit</th></tr></thead><tbody>{history.map((turn) => <tr key={turn.id} className="border-b border-white/[0.045] text-[9px] last:border-0 hover:bg-white/[0.018]"><td className="px-5 py-3.5"><span className="font-semibold text-[#e1e7df]">M{String(turn.turnNumber).padStart(2, "0")}</span><span className="ml-2 text-[#78857c]">{monthLabel(turn.turnNumber)}</span></td><td className="px-3 py-3.5 text-[#aeb9af]">{fullNaira(turn.decisions?.pricing.price ?? 0)}<span className="ml-1 text-[#758078]">· {Math.round((turn.decisions?.pricing.discount ?? 0) * 100)}%</span></td><td className="px-3 py-3.5 text-[#aeb9af]">{compactNaira(turn.outcome.marketingSpend)}</td><td className="mono px-3 py-3.5 text-[#e3e9e1]">{compactNaira(turn.outcome.revenue)}</td><td className={`mono px-3 py-3.5 ${turn.outcome.operatingProfit >= 0 ? "text-[#9bdfa9]" : "text-[#ff9293]"}`}>{compactNaira(turn.outcome.operatingProfit)}</td><td className="mono px-3 py-3.5 font-semibold text-[#e3e9e1]">{turn.score}<span className="ml-1 text-[8px] font-normal text-[#78857d]">· {turn.cumulativeScore} avg</span></td><td className="px-5 py-3.5"><button onClick={() => { setLastResult({ nextState: snapshot.state, outcome: turn.outcome, events: turn.explanations?.events ?? [], explanations: turn.explanations }); setView("results"); }} className="inline-flex items-center gap-1 text-[#aeb8ad] hover:text-[#c8ff55]"><ShieldCheck size={11} />View facts <ChevronRight size={10} /></button></td></tr>)}</tbody></table></div> : <EmptyHistory onStart={startDecisions} />}</section>
    </div>);
  }

  if (view === "leaderboard") return gameArea(<div className="animate-fade-up space-y-5"><PageHeader eyebrow="The arena" title="A better CEO is a better competitor." subtitle="Compare performance with CEOs who have completed the same number of months. No entry fees. No real-money prizes." action={<span className="inline-flex items-center gap-1.5 rounded-full border border-[#92d8a2]/15 bg-[#92d8a2]/[0.05] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[.1em] text-[#a5e0af]"><ShieldCheck size={11} /> Fair play</span>} />
    <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]"><section className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.065] p-4 sm:px-5"><div><div className="text-[9px] font-bold uppercase tracking-[.14em] text-[#87948a]">Standings · {month ? `Month ${String(month).padStart(2, "0")}` : "pre-season"}</div><h2 className="mb-0 mt-1 text-[15px] font-semibold">{leaderboardTab} board</h2></div><div className="flex gap-1 rounded-[10px] border border-white/[0.06] bg-black/[0.12] p-1">{["Season", "Region", "Industry", "Friends"].map((tab) => <button key={tab} onClick={() => setLeaderboardTab(tab)} className={`rounded-[7px] px-2.5 py-1.5 text-[8px] font-semibold transition ${leaderboardTab === tab ? "bg-[#c8ff55]/10 text-[#d7ff9d]" : "text-[#7c8980] hover:text-white"}`}>{tab}</button>)}</div></div>
      {commonBoard.length ? <div className="arena-scrollbar overflow-x-auto"><table className="w-full min-w-[560px] border-collapse text-left"><thead><tr className="border-b border-white/[0.055] text-[8px] font-bold uppercase tracking-[.12em] text-[#718077]"><th className="px-5 py-3">Rank</th><th className="px-3 py-3">CEO / company</th><th className="px-3 py-3">Turn score</th><th className="px-3 py-3">Season avg</th><th className="px-5 py-3 text-right">Movement</th></tr></thead><tbody>{commonBoard.map((entry) => <tr key={entry.businessId} className={`border-b border-white/[0.045] last:border-0 ${entry.isYou ? "bg-[#c8ff55]/[0.035]" : "hover:bg-white/[0.018]"}`}><td className="px-5 py-4"><span className={`mono text-[12px] font-semibold ${entry.rank <= 3 ? "text-[#c8ff55]" : "text-[#c1cac1]"}`}>#{String(entry.rank).padStart(2, "0")}</span></td><td className="px-3 py-4"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-[11px] text-[#c8ff55]">{entry.avatar || "✦"}</span><div><div className="text-[9px] font-semibold text-[#e0e6de]">{entry.name}{entry.isYou && <span className="ml-1.5 rounded bg-[#c8ff55]/10 px-1 py-0.5 text-[7px] text-[#c8ff55]">YOU</span>}</div><div className="mt-0.5 text-[8px] text-[#78857c]">{entry.company}</div></div></div></td><td className="mono px-3 py-4 text-[10px] text-[#c5cec5]">{entry.lastTurnScore}</td><td className="mono px-3 py-4 text-[10px] font-semibold text-[#e2e8df]">{entry.score}<span className="ml-1 text-[8px] font-normal text-[#7b887f]">/ 1,000</span></td><td className="px-5 py-4 text-right"><span className="inline-flex items-center gap-1 text-[8px] text-[#9bdba7]"><ArrowUpRight size={12} /> Scored</span></td></tr>)}</tbody></table></div> : <div className="px-6 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#c8ff55]/12 bg-[#c8ff55]/[0.04] text-[#c8ff55]"><Trophy size={19} /></div><h3 className="mb-0 mt-4 text-[13px] font-semibold">The board opens with your first result.</h3><p className="mx-auto mb-4 mt-1.5 max-w-[350px] text-[9px] leading-5 text-[#859188]">Rankings compare CEOs who have completed the same turn count. Finish month one to set your pace.</p>{snapshot.upcoming && <BrandButton onClick={startDecisions} icon={ArrowRight}>Make the first move</BrandButton>}</div>}
      <div className="flex flex-col justify-between gap-2 border-t border-white/[0.06] bg-white/[0.012] px-4 py-3 sm:flex-row sm:items-center sm:px-5"><span className="text-[8px] text-[#78857d]">Your rank is pinned after you complete this month. Practice runs remain self-paced.</span><span className="text-[8px] text-[#78857d]">Only official engine scores count.</span></div></section>
      <aside className="space-y-4"><section className="panel p-4 sm:p-5"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.14em] text-[#89968c]"><Trophy size={13} className="text-[#c8ff55]" />Your standing</div><div className="mt-5 flex items-end gap-2"><span className="mono text-[42px] font-semibold leading-none tracking-[-.07em] text-[#f2f6ef]">{snapshot.rank ? `#${snapshot.rank}` : "—"}</span><span className="pb-1 text-[9px] text-[#819087]">{snapshot.rank ? `of ${commonBoard.length} CEOs` : "Complete a turn to rank"}</span></div><div className="mt-4"><ProgressBar value={snapshot.rank && commonBoard.length ? ((commonBoard.length - snapshot.rank + 1) / commonBoard.length) * 100 : 0} /></div><p className="mb-0 mt-3 text-[8px] leading-4 text-[#7e8a82]">Month-matched standings reward decision quality, not just company size.</p></section><section className="panel p-4 sm:p-5"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.14em] text-[#89968c]"><Target size={13} className="text-[#96bfff]" />Specialist boards</div><div className="mt-3 space-y-2"><SpecialistRow name="Growth CEO" descriptor="Revenue growth" icon={TrendingUp} color="#8ddca4" /><SpecialistRow name="Financial CEO" descriptor="Profitability + cash" icon={CircleDollarSign} color="#c8ff55" /><SpecialistRow name="Crisis manager" descriptor="Resilience under shocks" icon={ShieldCheck} color="#89baff" /></div></section><section className="rounded-[13px] border border-white/[0.07] bg-white/[0.02] p-4"><div className="flex items-center gap-2 text-[9px] font-semibold text-[#dce2da]"><Info size={13} className="text-[#a5b0a7]" />How fair play works</div><p className="mb-0 mt-2 text-[8px] leading-5 text-[#849087]">Everyone in a season shares the same market-event seed. The engine runs on the server, turns are immutable, and what-if projections never change official scores.</p></section></aside></div></div>);

  if (view === "season") {
    const complete = month >= snapshot.season.turnCount || snapshot.state.insolvent || snapshot.business.status === "completed";
    const best = [...snapshot.history].sort((left, right) => right.score - left.score)[0];
    const worst = [...snapshot.history].sort((left, right) => left.score - right.score)[0];
    const bestDecision = lastResult?.explanations.contributions.slice().sort((left, right) => right.profit - left.profit)[0];
    return gameArea(<div className="animate-fade-up space-y-5"><PageHeader eyebrow={complete ? "Season report" : "Season overview"} title={complete ? "Twelve months. One CEO." : "A season is a strategy, not a sprint."} subtitle={complete ? "A transparent read on what happened, where you led, and the habits worth carrying into your next run." : "Each turn advances one simulated month. The same opening conditions, with a new decision to make."} action={complete ? <BrandButton onClick={() => setSeasonModal(true)} icon={Plus}>Play next season</BrandButton> : <BrandButton onClick={startDecisions} icon={ArrowRight}>Continue season</BrandButton>} />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]"><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Twelve turns · one company" title="Season timeline" action={<span className="mono text-[9px] text-[#c8ff55]">{month}/12</span>} /><div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 12 }, (_, index) => { const turn = index + 1; const item = snapshot.history.find((entry) => entry.turnNumber === turn); const current = !complete && turn === month + 1; return <div key={turn} className={`relative rounded-[11px] border p-2.5 ${item ? "border-[#a6e4a2]/18 bg-[#a6e4a2]/[0.045]" : current ? "border-[#c8ff55]/30 bg-[#c8ff55]/[0.055]" : "border-white/[0.055] bg-white/[0.015]"}`}><div className="flex items-center justify-between"><span className={`mono text-[9px] font-semibold ${item ? "text-[#a5e3ae]" : current ? "text-[#d6ff95]" : "text-[#748077]"}`}>M{String(turn).padStart(2, "0")}</span>{item ? <CheckCircle2 size={11} className="text-[#96dca3]" /> : current ? <span className="h-1.5 w-1.5 rounded-full bg-[#c8ff55] animate-pulse-dot" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/[0.12]" />}</div><div className="mt-3 text-[8px] text-[#849087]">{monthLabel(turn).slice(0, 3)}</div><div className="mono mt-1 text-[9px] font-semibold text-[#c7d0c6]">{item ? item.score : current ? "NOW" : "···"}</div></div>; })}</div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[8px] text-[#7f8b82]"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#a5dfa9]" />Simulated</span><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#c8ff55]" />Current</span><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-white/[0.18]" />Upcoming</span></div></section>
        <section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Starting line" title="Same opening conditions" /><div className="grid grid-cols-2 gap-2">{[["Starting cash", "₦10,000,000"], ["Selling price", "₦30,000 / item"], ["Inventory", "1,000 units"], ["Sales team", "4 people"], ["Active customers", "600"], ["Credit line", "₦8,000,000"]].map(([label, value]) => <div key={label} className="rounded-[10px] border border-white/[0.055] bg-white/[0.018] p-2.5"><div className="text-[8px] text-[#7c8980]">{label}</div><div className="mono mt-1 text-[10px] font-semibold text-[#dbe2d9]">{value}</div></div>)}</div><div className="mt-3 flex items-center justify-between rounded-[10px] border border-white/[0.055] px-3 py-2.5"><span className="text-[8px] text-[#7c8980]">Ruleset · versioned and auditable</span><span className="mono text-[8px] text-[#9da99f]">Engine v1.0</span></div>{snapshot.season.inviteCode && <div className="mt-3 flex items-center justify-between gap-2 rounded-[10px] border border-[#c8ff55]/15 bg-[#c8ff55]/[0.035] px-3 py-2.5"><span className="text-[8px] text-[#8d9b8b]">Private-league invite code</span><span className="select-all rounded bg-[#c8ff55]/[0.08] px-2 py-1 font-mono text-[9px] font-semibold tracking-[.1em] text-[#d9ff9c]">{snapshot.season.inviteCode}</span></div>}</section></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><MetricCard icon={Trophy} label="Season score" value={snapshot.history.length ? `${snapshot.seasonAverage}` : "—"} detail="Average of completed turn scores" /><MetricCard icon={TrendingUp} label="Best month" value={best ? `M${String(best.turnNumber).padStart(2, "0")}` : "—"} detail={best ? `${best.score} score · ${compactNaira(best.outcome.revenue)} revenue` : "Awaiting your first month"} /><MetricCard icon={TrendingDown} label="Hardest month" value={worst ? `M${String(worst.turnNumber).padStart(2, "0")}` : "—"} detail={worst ? `${worst.score} score · ${monthLabel(worst.turnNumber)}` : "Awaiting your first month"} tone="negative" /><MetricCard icon={Globe2} label="Final rank" value={complete && snapshot.rank ? `#${snapshot.rank}` : "—"} detail={complete ? "Month-matched leaderboard" : "Unlocked when your season is complete"} /></div>
      {complete ? <div className="grid gap-4 xl:grid-cols-[1fr_1fr]"><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="CEO debrief" title="Your operating style" /><div className="rounded-[12px] border border-[#c8ff55]/12 bg-[#c8ff55]/[0.035] p-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#dbf5b3]"><Sparkles size={13} className="text-[#c8ff55]" />{snapshot.state.insolvent ? "The Resilient Rebuilder" : snapshot.state.cash > 4_000_000 && snapshot.state.activeCustomers > 900 ? "The Patient Compounder" : snapshot.state.activeCustomers > 1000 ? "The Growth-Seeking Operator" : "The Adaptive Founder"}</div><p className="mb-0 mt-2 text-[9px] leading-5 text-[#a0ac9f]">Your run finished with {compactNaira(snapshot.state.cash)} in cash, {comma(snapshot.state.activeCustomers)} active customers and a {snapshot.state.satisfaction.toFixed(0)}/100 satisfaction score. The engine’s contribution breakdowns show where your decisions changed the result.</p></div><div className="mt-3 space-y-2">{bestDecision && <div className="rounded-[10px] border border-white/[0.055] p-3 text-[9px] text-[#a5b0a6]"><span className="font-semibold text-[#d6dfd5]">Best recent lever:</span> {bestDecision.label} · {signedNaira(bestDecision.profit)} counterfactual profit.</div>}<div className="rounded-[10px] border border-white/[0.055] p-3 text-[9px] leading-4 text-[#859188]">Use the monthly decision journal to compare each locked plan with its outcome. Coaching is based only on stored engine facts.</div></div></section><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Season awards" title="What you earned" /><div className="grid grid-cols-2 gap-2">{snapshot.achievements.length ? snapshot.achievements.map((achievement) => <AchievementTile key={achievement.key} name={achievement.name} description={achievement.description} icon={achievement.icon} unlocked />) : <div className="col-span-2 py-6 text-center text-[9px] text-[#7b887f]">Your first achievement is one decision away.</div>}{!snapshot.achievements.some((achievement) => achievement.key === "season_finisher") && !snapshot.state.insolvent && <AchievementTile name="Season Finisher" description="Complete all 12 months" icon="🏆" unlocked={false} />}</div></section></div> : <section className="panel p-4 sm:p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.13em] text-[#89958c]"><Lightbulb size={13} className="text-[#c8ff55]" />Season strategy</div><p className="mb-0 mt-2 max-w-[560px] text-[10px] leading-5 text-[#a0aaa2]">Your opening condition is consistent: ₦10m cash, 1,000 units, 600 customers and a ₦8m credit line. The competitive difference comes from what you do with them.</p></div><div className="min-w-[155px]"><div className="mb-1.5 flex justify-between text-[8px] text-[#7c8980]"><span>Season completed</span><span>{month}/12</span></div><ProgressBar value={snapshot.seasonProgress} /></div></div></section>}
      </div>);
  }

  if (view === "profile") return gameArea(<div className="animate-fade-up space-y-5"><PageHeader eyebrow="CEO profile" title="The operator behind the numbers." subtitle="Your level, titles and achievements travel with you from season to season." />
    <div className="grid gap-4 xl:grid-cols-[.82fr_1.18fr]"><section className="panel relative overflow-hidden p-5 sm:p-6"><div className="absolute -right-9 -top-10 h-36 w-36 rounded-full bg-[#c8ff55]/[0.055] blur-3xl" /><div className="relative flex items-center gap-4"><div className="grid h-[62px] w-[62px] place-items-center rounded-[18px] border border-[#c8ff55]/20 bg-[#c8ff55]/[0.08] text-[27px] text-[#d7ff9a]">{snapshot.profile.avatar || "✦"}</div><div><span className="inline-flex items-center gap-1 rounded-full border border-[#c8ff55]/15 bg-[#c8ff55]/[0.05] px-2 py-1 text-[8px] font-bold uppercase tracking-[.1em] text-[#c8ff55]"><Award size={10} />Level {snapshot.profile.level} CEO</span><h2 className="mb-0 mt-2 text-[20px] font-semibold tracking-[-.045em]">{snapshot.profile.displayName}</h2><p className="mb-0 mt-1 text-[9px] capitalize text-[#859188]">{snapshot.profile.activeTitle || "Aspiring founder"} · {snapshot.profile.country === "NG" ? "Nigeria" : snapshot.profile.country}</p></div></div><div className="relative mt-6 rounded-[12px] border border-white/[0.065] bg-white/[0.02] p-3.5"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold text-[#cbd4ca]">Experience points</span><span className="mono text-[9px] text-[#c8ff55]">{comma(snapshot.profile.xp)} XP</span></div><div className="mt-3"><ProgressBar value={Math.max(0, Math.min(100, ((snapshot.profile.xp - Math.max(0, snapshot.profile.level - 1) ** 2 * 250) / Math.max(1, (snapshot.profile.level ** 2 - Math.max(0, snapshot.profile.level - 1) ** 2) * 250)) * 100))} /></div><div className="mt-2 flex justify-between text-[8px] text-[#77847b]"><span>Level {snapshot.profile.level}</span><span>{snapshot.profile.level < 30 ? `${Math.max(0, snapshot.profile.level ** 2 * 250 - snapshot.profile.xp)} XP to next level` : "Max level reached"}</span><span>30</span></div></div><div className="mt-4 grid grid-cols-3 gap-2"><ProfileFact value={String(snapshot.history.length)} label="Turns" /><ProfileFact value={String(snapshot.achievements.length)} label="Awards" /><ProfileFact value={snapshot.rank ? `#${snapshot.rank}` : "—"} label="Rank" /></div></section>
      <section className="panel p-5 sm:p-6"><SectionTitle eyebrow="Your public identity" title="Profile settings" /><form onSubmit={(event) => { event.preventDefault(); void saveProfile(); }} className="space-y-4"><label className="block"><span className="mb-1.5 block text-[9px] font-semibold text-[#aab5aa]">CEO display name</span><input maxLength={28} value={profileName} onChange={(event) => setProfileName(event.target.value)} className="h-10 w-full rounded-[9px] border border-white/[0.08] bg-[#080d0a] px-3 text-[11px] text-[#e6ece4] outline-none transition placeholder:text-[#58645b] focus:border-[#c8ff55]/30" /></label><label className="block"><span className="mb-1.5 block text-[9px] font-semibold text-[#aab5aa]">Your CEO persona</span><div className="relative"><select value={persona} onChange={(event) => setPersona(event.target.value)} className="h-10 w-full appearance-none rounded-[9px] border border-white/[0.08] bg-[#080d0a] px-3 text-[10px] capitalize text-[#dce3db] outline-none focus:border-[#c8ff55]/30"><option value="founder">Founder</option><option value="student">Student</option><option value="professional">Professional</option><option value="gamer">Competitive gamer</option></select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3 text-[#829087]" /></div></label><div className="rounded-[10px] border border-white/[0.055] bg-white/[0.018] p-3"><div className="flex items-center gap-2 text-[9px] font-semibold text-[#d9e1d7]"><Globe2 size={12} className="text-[#9daf9c]" />Nigeria-first · Naira reporting</div><p className="mb-0 mt-1 text-[8px] leading-4 text-[#7e8a82]">Your current season uses NGN and the Lagos fashion e-commerce market.</p></div><BrandButton type="submit" disabled={busy === "profile"} icon={busy === "profile" ? LoaderCircle : Check}>{busy === "profile" ? "Saving…" : "Save CEO profile"}</BrandButton></form></section></div>
    <section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Milestones" title="Achievements & titles" action={<span className="text-[8px] text-[#7b887f]">Unlocks are tied to simulated outcomes</span>} /><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{[
      ["first_turn", "First Month", "Lock your first CEO decision set.", "🚀"], ["first_profit", "First Profit", "Record a positive operating profit.", "📈"], ["zero_stockouts", "Smooth Operator", "Complete three consecutive months without stockouts.", "📦"], ["growth_hacker", "Growth Hacker", "Reach 1,800 active customers.", "⚡"], ["crisis_survivor", "Crisis Survivor", "Stay profitable through a market event.", "🛡️"], ["season_finisher", "Season Finisher", "Complete all 12 months.", "🏆"],
    ].map(([key, name, description, icon]) => <AchievementTile key={key} name={name} description={description} icon={icon} unlocked={snapshot.achievements.some((achievement) => achievement.key === key)} />)}</div></section>
    {actionError && <InlineAlert message={actionError} onDismiss={() => setActionError("")} />}</div>);

  if (view === "admin") {
    if (!snapshot.isAdmin) return gameArea(<div className="panel p-8 text-center"><ShieldCheck className="mx-auto text-[#e6c177]" size={25} /><h1 className="mb-0 mt-3 text-lg font-semibold">Admin access required</h1><p className="mb-0 mt-2 text-[10px] text-[#8c988f]">Simulation configuration is available only to authorised administrators.</p></div>);
    const counts = adminData as { seasonCount?: number; businessCount?: number; turnCount?: number } | null;
    return gameArea(<div className="animate-fade-up space-y-5"><PageHeader eyebrow="Simulation studio" title="Tune the world. Keep the rules fair." subtitle="Every save creates a new published rule version. Existing seasons remain pinned to their original configuration." action={<span className="inline-flex items-center gap-1.5 rounded-full border border-[#c8ff55]/15 bg-[#c8ff55]/[0.05] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[.1em] text-[#d6ff99]"><ShieldCheck size={11} /> Admin only</span>} />
      <div className="grid grid-cols-3 gap-3"><MetricCard icon={CalendarDays} label="Seasons" value={String(counts?.seasonCount ?? "—")} detail="Published and test seasons" /><MetricCard icon={Building2} label="Companies" value={String(counts?.businessCount ?? "—")} detail="Across active rule versions" /><MetricCard icon={Activity} label="Turn records" value={String(counts?.turnCount ?? "—")} detail="Immutable audit history" /></div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]"><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Rule config · new version on save" title="Market & operating assumptions" /><div className="grid gap-3 sm:grid-cols-2"><AdminNumber label="Potential buyers / month" value={adminMarket} onChange={setAdminMarket} step={1000} min={1000} max={10000000} /><AdminNumber label="Price elasticity" value={adminElasticity} onChange={setAdminElasticity} step={0.1} min={0.1} max={4} /><AdminNumber label="Fixed monthly overhead (₦)" value={adminOverhead} onChange={setAdminOverhead} step={50000} min={0} max={100000000} /><AdminNumber label="Monthly interest rate" value={adminInterest} onChange={setAdminInterest} step={0.005} min={0} max={0.25} suffix="%" multiplier={100} /></div><div className="mt-4 flex flex-col justify-between gap-3 rounded-[11px] border border-white/[0.055] bg-white/[0.018] p-3 sm:flex-row sm:items-center"><div><div className="text-[9px] font-semibold text-[#dbe2d8]">Versioning policy</div><div className="mt-1 text-[8px] leading-4 text-[#7f8b82]">Published rules are locked. Existing turns retain their original version and replay inputs.</div></div><BrandButton onClick={saveAdminConfig} disabled={busy === "admin"} icon={busy === "admin" ? LoaderCircle : Check}>Publish new version</BrandButton></div></section>
        <aside className="space-y-4"><section className="panel p-4 sm:p-5"><SectionTitle eyebrow="Integrity controls" title="Replay & audit" /><div className="space-y-3">{[["Deterministic engine", "Same state + decisions + seeds → same output hash."], ["Shared events", "Market events use season + turn seeds."], ["Append-only turns", "Simulated input and outcome snapshots are retained."], ["Score authority", "Only the server can create scores."]].map(([title, detail]) => <div key={title} className="flex gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#90d99e]/[0.09] text-[#9de5a8]"><Check size={11} /></span><div><div className="text-[9px] font-semibold text-[#dbe2da]">{title}</div><p className="mb-0 mt-1 text-[8px] leading-4 text-[#7f8b82]">{detail}</p></div></div>)}</div></section><section className="panel p-4"><SectionTitle eyebrow="Stored turn" title="Replay & hash check" /><div className="flex gap-2"><input aria-label="Turn ID to replay" value={replayTurnId} onChange={(event) => setReplayTurnId(event.target.value)} placeholder="Paste a simulated turn UUID" className="h-9 min-w-0 flex-1 rounded-[8px] border border-white/[0.08] bg-[#080d0a] px-2.5 font-mono text-[8px] text-[#dce3da] outline-none focus:border-[#c8ff55]/30" /><BrandButton onClick={runReplay} disabled={busy === "replay" || !replayTurnId.trim()} icon={busy === "replay" ? LoaderCircle : ShieldCheck} className="min-h-9 px-2.5">Replay</BrandButton></div>{replayReport && <div className={`mt-3 rounded-[9px] border p-2.5 ${replayReport.inputMatches && replayReport.outputMatches ? "border-[#91dba0]/15 bg-[#91dba0]/[0.04]" : "border-[#ff7779]/20 bg-[#ff7779]/[0.05]"}`}><div className="flex items-center gap-1.5 text-[8px] font-semibold text-[#d8e4d8]"><CheckCircle2 size={12} className="text-[#9adea5]" />{replayReport.inputMatches && replayReport.outputMatches ? "Replay matches stored hashes" : "Replay mismatch detected"}</div><div className="mt-1 text-[7px] text-[#7f8b82]">{replayReport.ruleVersion} · score {replayReport.score} · {replayReport.outputHash.slice(0, 14)}…</div></div>}<p className="mb-0 mt-2 text-[7px] leading-4 text-[#77847b]">Reruns from the immutable input snapshot and original versioned rules.</p></section><section className="panel p-4"><div className="flex items-center justify-between gap-2"><div><div className="text-[9px] font-bold uppercase tracking-[.13em] text-[#87948b]">Balance lab · unsaved</div><div className="mt-1 text-[11px] font-semibold text-[#e2e8df]">Compare five CEO strategies</div></div><BrandButton onClick={runBalanceLab} disabled={busy === "balance"} icon={busy === "balance" ? LoaderCircle : Activity} className="min-h-9 px-2.5">Run lab</BrandButton></div>{balanceReport && <><div className="mt-3 flex items-center justify-between rounded-[9px] border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 text-[8px]"><span className="text-[#849087]">Average-score spread</span><span className="mono font-semibold text-[#c8ff55]">{balanceReport.distribution.min}–{balanceReport.distribution.max} · {balanceReport.distribution.spread} pts</span></div><div className="mt-2 space-y-1.5">{balanceReport.strategies.map((strategy) => <div key={strategy.name} className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-[8px] hover:bg-white/[0.025]"><span className="min-w-0 truncate text-[#aab5ab]">{strategy.name}</span><span className="mono shrink-0 text-[#e1e7df]">{strategy.averageScore} avg</span><span className={`mono shrink-0 ${strategy.totalProfit >= 0 ? "text-[#96dda5]" : "text-[#ff9295]"}`}>{compactNaira(strategy.totalProfit)}</span></div>)}</div></>}<p className="mb-0 mt-2 text-[7px] leading-4 text-[#77847b]">All bots face the same 12 monthly market-event seeds. Scores are not saved as official turns.</p></section></aside></div>
      {actionError && <InlineAlert message={actionError} onDismiss={() => setActionError("")} />}</div>);
  }

  return gameArea(<EmptySeason onStart={() => setSeasonModal(true)} />);

  function SideNavButton({ icon: Icon, label, active, onClick, badge, disabled }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void; badge?: string; disabled?: boolean }) {
    return <button disabled={disabled} onClick={onClick} className={`group flex min-h-[38px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left transition ${active ? "bg-[#c8ff55]/[0.085] text-[#e7f5d4]" : "text-[#89958d] hover:bg-white/[0.04] hover:text-[#e2e8e1]"} disabled:opacity-35`}><Icon size={15} strokeWidth={active ? 2.1 : 1.75} className={active ? "text-[#c8ff55]" : "text-[#738078] group-hover:text-[#a8b5a9]"} /><span className="flex-1 text-[10px] font-medium">{label}</span>{badge && <span className="rounded border border-[#c8ff55]/15 bg-[#c8ff55]/[0.045] px-1.5 py-0.5 text-[7px] font-bold text-[#c8ff55]">{badge}</span>}</button>;
  }
  function MobileNavButton({ icon: Icon, label, active, onClick, disabled }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
    return <button disabled={disabled} onClick={onClick} className={`flex min-h-[44px] flex-col items-center justify-center gap-1 text-[8px] font-medium transition disabled:opacity-35 ${active ? "text-[#c8ff55]" : "text-[#728077]"}`}><Icon size={16} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span></button>;
  }
}

function MiniMetric({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return <div className="min-w-0 rounded-[11px] border border-white/[0.055] bg-white/[0.018] p-2.5"><div className="flex items-center gap-1.5 text-[8px] text-[#818d84]"><Icon size={11} className="shrink-0 text-[#96a49a]" /><span className="truncate">{label}</span></div><div className="mono mt-2 truncate text-[13px] font-semibold tracking-[-.03em] text-[#e5ebe3]">{value}</div><div className="mt-1 truncate text-[8px] text-[#738077]">{detail}</div></div>;
}

function CompetitorRow({ name, share, color, isPlayer = false }: { name: string; share: number; color: string; isPlayer?: boolean }) {
  const percent = Math.max(0, Math.min(100, share * 100));
  return <div className="grid grid-cols-[minmax(100px,1fr)_1fr_62px] items-center gap-3 rounded-[8px] px-1 py-2.5"><div className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} /><span className={`truncate text-[9px] ${isPlayer ? "font-semibold text-[#e6eee3]" : "text-[#9ca79e]"}`}>{name}</span>{isPlayer && <span className="rounded bg-[#c8ff55]/10 px-1 py-0.5 text-[6px] font-bold text-[#c8ff55]">YOU</span>}</div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: color, opacity: isPlayer ? 1 : .75 }} /></div><span className="mono text-right text-[9px] font-semibold" style={{ color }}>{pct(share, 1)}</span></div>;
}

function LeaderboardMini({ entry }: { entry: Snapshot["leaderboard"][number] }) {
  return <div className={`flex items-center gap-2.5 rounded-[9px] px-2 py-2 ${entry.isYou ? "bg-[#c8ff55]/[0.045]" : "hover:bg-white/[0.02]"}`}><span className={`mono w-5 text-[9px] font-semibold ${entry.rank <= 3 ? "text-[#c8ff55]" : "text-[#7c8980]"}`}>{String(entry.rank).padStart(2, "0")}</span><span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.045] text-[10px] text-[#c8ff55]">{entry.avatar}</span><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-semibold text-[#d9e0d8]">{entry.name}{entry.isYou && <span className="ml-1 text-[7px] text-[#c8ff55]">YOU</span>}</span><span className="mt-0.5 block truncate text-[8px] text-[#79857d]">{entry.company}</span></span><span className="mono text-[10px] font-semibold text-[#dce3db]">{entry.score}</span></div>;
}

function InlineAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return <div role="alert" className="flex items-start gap-2 rounded-[11px] border border-[#ff7779]/20 bg-[#ff7779]/[0.06] px-3 py-2.5 text-[9px] leading-5 text-[#ffadae]"><AlertTriangle size={13} className="mt-1 shrink-0" /><span className="flex-1">{message}</span><button aria-label="Dismiss message" onClick={onDismiss} className="grid h-6 w-6 shrink-0 place-items-center rounded hover:bg-white/[0.06]"><X size={12} /></button></div>;
}

function ResultMetric({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: "good" | "bad" }) {
  return <div><div className="text-[8px] font-semibold uppercase tracking-[.1em] text-[#77847a]">{label}</div><div className={`mono mt-1 text-[13px] font-semibold ${tone === "good" ? "text-[#9fe2ac]" : tone === "bad" ? "text-[#ff9495]" : "text-[#eaf0e8]"}`}>{value}</div>{detail && <div className="mt-0.5 text-[8px] text-[#7d8980]">{detail}</div>}</div>;
}

function ContributionRow({ item, max }: { item: Contribution; max: number }) {
  const value = item.profit;
  const width = Math.max(value === 0 ? 0 : 3, Math.min(100, (Math.abs(value) / max) * 100));
  const positive = value >= 0;
  return <div className="grid grid-cols-[minmax(110px,1fr)_1.15fr_minmax(72px,.65fr)] items-center gap-2.5"><div className="min-w-0"><div className="truncate text-[9px] font-semibold text-[#bfc9bf]">{item.label}</div><div className="mt-0.5 text-[7px] text-[#758178]">{item.customers >= 0 ? "+" : ""}{item.customers} customers · {signedNaira(item.revenue)} revenue</div></div><div className="flex h-5 items-center"><div className={`h-[5px] rounded-full ${positive ? "bg-[#95dda4]" : "bg-[#fa8689]"}`} style={{ width: `${width}%`, marginLeft: positive ? "50%" : `${50 - width / 2}%`, transform: positive ? "none" : "none", opacity: .9 }} /><span className="absolute" /></div><div className={`mono text-right text-[9px] font-semibold ${positive ? "text-[#9cdeaa]" : "text-[#ff9495]"}`}>{signedNaira(value)}</div><div className="col-span-3 -mt-1 h-[1px] bg-white/[0.04]" /></div>;
}

function MiniResult({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[9px] border border-white/[0.05] bg-white/[0.017] p-2.5"><div className="text-[8px] text-[#79867d]">{label}</div><div className="mono mt-1 text-[10px] font-semibold text-[#dbe2da]">{value}</div></div>;
}

function SpecialistRow({ name, descriptor, icon: Icon, color }: { name: string; descriptor: string; icon: LucideIcon; color: string }) {
  return <div className="flex items-center gap-2.5 rounded-[9px] border border-white/[0.05] bg-white/[0.018] p-2.5"><span className="grid h-7 w-7 place-items-center rounded-[8px] bg-white/[0.04]" style={{ color }}><Icon size={13} /></span><span className="flex-1"><span className="block text-[9px] font-semibold text-[#d6ded5]">{name}</span><span className="mt-0.5 block text-[8px] text-[#79867d]">{descriptor}</span></span><span className="text-[7px] text-[#667269]">Coming up</span></div>;
}

function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-[9px] font-bold uppercase tracking-[.17em] text-[#a0ad9e]">{eyebrow}</div><h1 className="mb-0 mt-2 text-[clamp(1.65rem,4vw,2.5rem)] font-semibold leading-[1.06] tracking-[-.065em] text-[#eef3ed]">{title}</h1><p className="mb-0 mt-2 max-w-[670px] text-[10px] leading-5 text-[#89968d]">{subtitle}</p></div>{action}</div>;
}

function ProfileFact({ value, label }: { value: string; label: string }) {
  return <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.02] p-2.5 text-center"><div className="mono text-[14px] font-semibold text-[#e1e7df]">{value}</div><div className="mt-1 text-[8px] text-[#7c8980]">{label}</div></div>;
}

function AchievementTile({ name, description, icon, unlocked }: { name: string; description: string; icon: string; unlocked: boolean }) {
  return <div className={`flex gap-2.5 rounded-[11px] border p-3 ${unlocked ? "border-[#c8ff55]/12 bg-[#c8ff55]/[0.025]" : "border-white/[0.055] bg-white/[0.014] opacity-65"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[14px] ${unlocked ? "bg-[#c8ff55]/[0.09]" : "bg-white/[0.04] grayscale"}`}>{icon}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[9px] font-semibold text-[#dce3da]">{name}</span>{unlocked && <CheckCircle2 size={11} className="shrink-0 text-[#a5e7ad]" />}</span><span className="mt-1 block text-[8px] leading-4 text-[#7e8b81]">{description}</span></span></div>;
}

function AdminNumber({ label, value, onChange, step, min, max, suffix, multiplier = 1 }: { label: string; value: number; onChange: (value: number) => void; step: number; min: number; max: number; suffix?: string; multiplier?: number }) {
  return <label className="block rounded-[10px] border border-white/[0.055] bg-white/[0.018] p-3"><span className="block text-[8px] font-semibold text-[#9aa69d]">{label}</span><div className="mt-2 flex items-center gap-2"><input type="number" min={min} max={max} step={step * multiplier} value={Number((value * multiplier).toFixed(3))} onChange={(event) => onChange(Number(event.target.value) / multiplier)} className="mono h-9 w-full rounded-[8px] border border-white/[0.08] bg-[#090e0b] px-2.5 text-[10px] text-[#e4ebe2] outline-none focus:border-[#c8ff55]/30" />{suffix && <span className="text-[9px] text-[#849087]">{suffix}</span>}</div></label>;
}

function EmptyHistory({ onStart }: { onStart: () => void }) {
  return <div className="px-5 py-12 text-center"><div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white/[0.04] text-[#9aa69b]"><BarChart3 size={16} /></div><h3 className="mb-0 mt-3 text-[11px] font-semibold text-[#d8dfd7]">The journal is ready for its first entry.</h3><p className="mb-4 mt-1 text-[9px] text-[#7e8a82]">Lock your month to create a traceable decision and outcome record.</p><BrandButton onClick={onStart} icon={ArrowRight}>Open decision room</BrandButton></div>;
}

function EmptySeason({ onStart }: { onStart: () => void }) {
  return <div className="panel mx-auto max-w-lg p-8 text-center"><CalendarDays className="mx-auto text-[#c8ff55]" size={24} /><h1 className="mb-0 mt-4 text-[18px] font-semibold">Your next season starts here.</h1><p className="mb-4 mt-2 text-[10px] leading-5 text-[#86938a]">Create a new Lagos fashion company, choose a mode, and build your next 12-month strategy.</p><BrandButton onClick={onStart} icon={Plus}>Create a season</BrandButton></div>;
}
