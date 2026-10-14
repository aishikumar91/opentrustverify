import { useEffect, useState } from "react";

function promoDeadline(): number {
  try {
    const raw = window.localStorage.getItem("otv-promo-end");
    const t = raw ? Number(raw) : NaN;
    if (Number.isFinite(t) && t > Date.now()) return t;
  } catch {}
  const end = Date.now() + 24 * 3600 * 1000;
  try {
    window.localStorage.setItem("otv-promo-end", String(end));
  } catch {}
  return end;
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

/** Rolling 24h promo countdown. Calligraphic PROMO mark + minimal caption. */
export default function PromoBadge({ compact = false }: { compact?: boolean }) {
  const [left, setLeft] = useState("--:--:--");
  useEffect(() => {
    function tick() {
      setLeft(fmt(promoDeadline() - Date.now()));
    }
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);
  if (compact) {
    return (
      <p className="text-[11px] text-[#B54708]">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-gradient-to-br from-[#FF5C6C] to-[#D7FF00]" />
        <span style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }} className="font-bold italic text-[#D92D20]">
          PROMO
        </span>{" "}
        −30% ends in <span className="tnum font-mono">{left}</span>
      </p>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#DDE1EA] bg-white p-3 sm:gap-3 sm:rounded-[24px] sm:p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF5C6C] via-[#F5A623] to-[#D7FF00] shadow sm:h-14 sm:w-14">
        <span className="tnum font-mono text-[11px] font-bold text-[#0B0F14]">−30%</span>
      </span>
      <div className="min-w-0 flex-1">
        <p style={{ fontFamily: "'Bodoni Moda', Georgia, serif" }} className="flex flex-wrap items-baseline gap-x-2 text-lg font-bold italic leading-none text-[#D92D20] sm:text-xl">
          <span>PROMO</span>
          <span className="tnum font-mono text-sm not-italic text-[#101828] sm:text-base">{left}</span>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#5B6472]">
          Promotion ongoing · enroll while offer lasts · T&amp;C applies
        </p>
      </div>
    </div>
  );
}
