"use client";

export function StepTile({ number, title, detail, active = false }: { number: string; title: string; detail: string; active?: boolean }) {
  return <div className={`rounded-[10px] border p-2.5 ${active ? "border-[#c8ff55]/20 bg-[#c8ff55]/[0.045]" : "border-white/[0.055] bg-white/[0.014]"}`}><div className={`mono text-[8px] font-semibold ${active ? "text-[#c8ff55]" : "text-[#69766d]"}`}>{number}</div><div className="mt-1.5 text-[9px] font-semibold text-[#dce4d9]">{title}</div><div className="mt-0.5 text-[7px] text-[#78847c]">{detail}</div></div>;
}
