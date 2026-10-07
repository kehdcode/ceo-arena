"use client";

import { ArrowRight, Check, Clock3, Info, LoaderCircle, LockKeyhole, Sparkles, X } from "lucide-react";
import type { Contribution, SimulationEvent } from "@/lib/engine";
import type { ReactNode } from "react";

export type Projection = {
  revenue: number;
  operatingProfit: number;
  cash: number;
  activeCustomers: number;
  marketShare: number;
  stockouts: number;
  score: number;
  dimensions: Record<string, number>;
  events: SimulationEvent[];
  contributions: Contribution[];
  driverNotes: string[];
};

function money(value: number) {
  const sign = value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${sign}₦${(absolute / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (absolute >= 1_000) return `${sign}₦${(absolute / 1_000).toFixed(absolute >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `${sign}₦${Math.round(absolute).toLocaleString("en-NG")}`;
}

function ContributionBar({ item, maximum }: { item: Contribution; maximum: number }) {
  const positive = item.profit >= 0;
  const width = item.profit === 0 ? 0 : Math.max(3, Math.min(100, (Math.abs(item.profit) / maximum) * 100));
  return <div className="grid grid-cols-[minmax(95px,1fr)_1fr_70px] items-center gap-2"><span className="truncate text-[8px] text-[#adb8ad]">{item.label}</span><span className="h-[5px] overflow-hidden rounded-full bg-white/[0.05]"><span className={`block h-full rounded-full ${positive ? "bg-[#94dda4]" : "bg-[#ff8588]"}`} style={{ width: `${width}%` }} /></span><span className={`font-mono text-right text-[8px] font-semibold ${positive ? "text-[#9cdda8]" : "text-[#ff9696]"}`}>{positive ? "+" : "−"}{money(Math.abs(item.profit))}</span></div>;
}

export function SeasonModal({ name, setName, mode, setMode, joinCode, setJoinCode, onJoin, onClose, onStart, busy }: {
  name: string;
  setName: (value: string) => void;
  mode: string;
  setMode: (value: string) => void;
  joinCode: string;
  setJoinCode: (value: string) => void;
  onJoin: () => void;
  onClose: () => void;
  onStart: () => void;
  busy: boolean;
}) {
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="new-season-title" className="panel animate-fade-up w-full max-w-[480px] overflow-hidden border-white/[0.11] p-5 shadow-[0_25px_100px_rgba(0,0,0,.55)] sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><div className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[.16em] text-[#c8ff55]"><Sparkles size={12} />New company · new strategy</div><h2 id="new-season-title" className="mb-0 mt-2 text-[20px] font-semibold tracking-[-.05em]">Start a fresh season.</h2><p className="mb-0 mt-1.5 text-[9px] leading-5 text-[#87948b]">Your current run stays in your history. Every new company returns to the same starting line.</p></div><button aria-label="Close" disabled={busy} onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.07] bg-white/[0.025] text-[#95a197] hover:bg-white/[0.07]"><X size={14} /></button></div>
      <div className="mt-5 space-y-3"><label className="block"><span className="mb-1.5 block text-[8px] font-semibold text-[#a7b2a8]">Company name</span><input autoFocus maxLength={48} minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-[9px] border border-white/[0.085] bg-[#090e0b] px-3 text-[10px] text-[#e6ece4] outline-none focus:border-[#c8ff55]/35" /></label><label className="block"><span className="mb-1.5 block text-[8px] font-semibold text-[#a7b2a8]">Game mode</span><select value={mode} onChange={(event) => setMode(event.target.value)} className="h-10 w-full rounded-[9px] border border-white/[0.085] bg-[#090e0b] px-3 text-[10px] text-[#e6ece4] outline-none focus:border-[#c8ff55]/35"><option value="practice">Practice · self-paced, restart any time</option><option value="ranked">Ranked season · shared rules, daily cadence</option><option value="private">Private league · invite code</option></select></label></div>
      {mode === "private" && <label className="mt-3 block"><span className="mb-1.5 block text-[8px] font-semibold text-[#a7b2a8]">Join an existing league · invite code</span><input maxLength={20} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ARENA-ABC123" className="h-10 w-full rounded-[9px] border border-white/[0.085] bg-[#090e0b] px-3 font-mono text-[10px] uppercase tracking-[.12em] text-[#e6ece4] outline-none placeholder:text-[#59655c] focus:border-[#c8ff55]/35" /></label>}
      <div className="mt-4 grid grid-cols-3 gap-2">{[["₦10m", "opening cash"], ["1,000", "starting units"], ["12", "months" ]].map(([value, label]) => <div key={label} className="rounded-[9px] border border-white/[0.055] bg-white/[0.018] p-2.5"><div className="font-mono text-[11px] font-semibold text-[#dfe6dc]">{value}</div><div className="mt-1 text-[7px] text-[#79867d]">{label}</div></div>)}</div>
      <div className="mt-4 flex items-start gap-2 rounded-[9px] border border-[#c8ff55]/10 bg-[#c8ff55]/[0.035] p-2.5"><Info size={12} className="mt-0.5 shrink-0 text-[#c8ff55]" /><p className="m-0 text-[8px] leading-4 text-[#91a08f]">Practice is the best place to learn. Ranked and private seasons currently use the same simulation rules with a 24-hour turn schedule.</p></div>
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button disabled={busy} onClick={onClose} className="min-h-10 rounded-[9px] px-3 text-[9px] font-semibold text-[#87948b] hover:bg-white/[0.04]">Cancel</button>{mode === "private" && <button disabled={busy || joinCode.trim().length < 6 || name.trim().length < 2} onClick={onJoin} className="inline-flex min-h-10 items-center gap-2 rounded-[9px] border border-white/[0.1] bg-white/[0.04] px-3 text-[9px] font-semibold text-[#dbe3d9] hover:bg-white/[0.08] disabled:opacity-45"><LockKeyhole size={12} />Join league</button>}<button disabled={busy || name.trim().length < 2} onClick={onStart} className="inline-flex min-h-10 items-center gap-2 rounded-[9px] border border-[#c8ff55] bg-[#c8ff55] px-3.5 text-[9px] font-bold text-[#11170d] transition hover:bg-[#d8ff85] disabled:opacity-45">{busy ? <LoaderCircle className="animate-spin-slow" size={13} /> : <ArrowRight size={13} />}{busy ? "Setting up…" : mode === "private" ? "Create league" : "Create season"}</button></div>
    </section>
  </div>;
}

export function ProjectionModal({ projection, remaining, onClose }: { projection: Projection; remaining: number; onClose: () => void }) {
  const maximum = Math.max(250_000, ...projection.contributions.map((item) => Math.abs(item.profit)));
  const metrics: [string, string][] = [["Projected revenue", money(projection.revenue)], ["Operating profit", money(projection.operatingProfit)], ["Cash after month", money(projection.cash)], ["CEO score", `${projection.score} / 1,000`], ["Active customers", Math.round(projection.activeCustomers).toLocaleString("en-NG")], ["Market share", `${(projection.marketShare * 100).toFixed(1)}%`]];
  return <div className="fixed inset-0 z-[85] grid place-items-center bg-black/78 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="projection-title" className="panel animate-fade-up arena-scrollbar max-h-[90vh] w-full max-w-[620px] overflow-y-auto border-white/[0.11] p-4 shadow-[0_25px_100px_rgba(0,0,0,.55)] sm:p-5">
      <div className="flex items-start justify-between gap-4"><div><span className="inline-flex items-center gap-1.5 rounded-full border border-[#85bcff]/15 bg-[#85bcff]/[0.06] px-2 py-1 text-[7px] font-bold uppercase tracking-[.13em] text-[#a8ccff]"><ActivityMark />Projection · not official</span><h2 id="projection-title" className="mb-0 mt-2 text-[19px] font-semibold tracking-[-.045em]">What if this is your call?</h2><p className="mb-0 mt-1 text-[8px] text-[#86938a]">Uses the current state and same event seed. Nothing is saved as an official turn.</p></div><button onClick={onClose} aria-label="Close projection" className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.07] text-[#98a39a] hover:bg-white/[0.05]"><X size={14} /></button></div>
      {projection.events.length > 0 && <div className="mt-4 rounded-[10px] border border-[#e6c177]/15 bg-[#e6c177]/[0.035] p-2.5"><div className="mb-1 text-[7px] font-bold uppercase tracking-[.12em] text-[#e2c580]">Same market conditions</div>{projection.events.map((event) => <p key={event.key} className="mb-0 mt-1 text-[8px] leading-4 text-[#b6a982]">{event.title}: {event.description}</p>)}</div>}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-[10px] border border-white/[0.06] bg-white/[0.02] p-2.5"><div className="text-[7px] font-semibold uppercase tracking-[.1em] text-[#7f8c82]">{label}</div><div className="mt-1.5 font-mono text-[12px] font-semibold text-[#e6ece4]">{value}</div></div>)}</div>
      <div className="mt-4 rounded-[11px] border border-white/[0.055] bg-black/[0.1] p-3"><div className="mb-3 flex items-center justify-between"><div className="text-[8px] font-bold uppercase tracking-[.12em] text-[#98a49a]">Decision contribution</div><span className="text-[7px] text-[#748077]">projected profit vs. carry-forward</span></div><div className="space-y-2.5">{projection.contributions.slice().sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit)).slice(0, 4).map((item) => <ContributionBar key={item.area} item={item} maximum={maximum} />)}</div></div>
      <div className="mt-3 space-y-1.5">{projection.driverNotes.slice(0, 2).map((note) => <p key={note} className="m-0 text-[8px] leading-4 text-[#929e94]">· {note}</p>)}</div>
      <div className="mt-4 flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:items-center"><span className="text-[7px] text-[#748077]">{remaining} projection{remaining === 1 ? "" : "s"} remaining this turn · never brute-force guaranteed outcomes</span><button onClick={onClose} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[9px] border border-white/[0.09] bg-white/[0.035] px-3 text-[8px] font-semibold text-[#d7ded6] hover:bg-white/[0.07]"><Check size={12} />Back to decisions</button></div>
    </section>
  </div>;
}

function ActivityMark() { return <Clock3 size={10} />; }

export function RunningOverlay({ month }: { month: number }) {
  const phrases = ["Reading your decisions", "Checking the market", "Running the month"];
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#070a08]/90 p-4 backdrop-blur-md"><div role="status" aria-live="polite" className="animate-fade-up text-center"><div className="relative mx-auto grid h-[90px] w-[90px] place-items-center rounded-full border border-[#c8ff55]/20 bg-[#c8ff55]/[0.04]"><span className="absolute inset-1 rounded-full border border-dashed border-[#c8ff55]/30 animate-spin-slow" /><div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-[#c8ff55] text-[#10160b] shadow-[0_0_45px_rgba(200,255,85,.22)]"><LoaderCircle className="animate-spin-slow" size={22} /></div></div><div className="mt-6 text-[8px] font-bold uppercase tracking-[.2em] text-[#c8ff55]">Simulation in progress · Month {String(month).padStart(2, "0")}</div><h2 className="mb-0 mt-2 text-[20px] font-semibold tracking-[-.045em]">The market is responding.</h2><p className="mb-0 mt-2 text-[9px] text-[#859187]">Events · competitors · demand · cash · score</p><div className="mx-auto mt-5 flex items-center justify-center gap-2">{phrases.map((phrase, index) => <span key={phrase} className="flex items-center gap-2 text-[7px] text-[#68756c]"><span className="h-1 w-1 rounded-full bg-[#9ddc9a]" />{phrase}{index < phrases.length - 1 && <span className="mx-1 h-px w-4 bg-white/[0.09]" />}</span>)}</div></div></div>;
}
