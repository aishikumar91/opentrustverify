import { useEffect, useState } from "react";

type Tone = "white" | "green" | "yellow" | "red";

type BootLine = {
  id: string;
  text: string;
  tone: Tone;
};

const TONE: Record<Tone, string> = {
  white: "text-[#F4F6FA]",
  green: "text-[#39FF14]",
  yellow: "text-[#F5D76E]",
  red: "text-[#FF5C6C]",
};

const BOOT_STEPS = [
  "load design tokens",
  "hydrate auth session",
  "resolve API client",
  "mount route tree",
  "ready for verification",
];

/**
 * App boot preloader rendered as a command-line screen.
 * green = done, yellow = running, white = queued, red = blocked/fail.
 */
export function SkeletonPreloader() {
  const [cursor, setCursor] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t = window.setInterval(() => {
      setCursor((c) => (c + 1) % (BOOT_STEPS.length + 1));
    }, 480);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setBlink((b) => !b), 500);
    return () => window.clearInterval(t);
  }, []);

  const lines: BootLine[] = BOOT_STEPS.map((step, i) => {
    if (i < cursor) {
      return { id: `b-${i}`, text: `[OK]   ${step}`, tone: "green" };
    }
    if (i === cursor) {
      return { id: `b-${i}`, text: `[RUN]  ${step}`, tone: "yellow" };
    }
    return { id: `b-${i}`, text: `[····] ${step}`, tone: "white" };
  });

  return (
    <div
      className="otv-skel fixed inset-0 z-[100] flex items-center justify-center bg-[#05080C] p-4"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#1C2430] bg-[#0A0E14] shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2 border-b border-[#1C2430] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5C6C]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#F5D76E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#39FF14]" />
          <p className="ml-2 truncate font-mono text-[11px] text-[#8A95A5]">otv@console — boot</p>
        </div>
        <div className="px-3 py-3 font-mono text-[11px] leading-relaxed sm:text-xs">
          <p className={`${TONE.white} mb-2`}>
            $ otv boot --mode <span className={TONE.yellow}>test</span>
          </p>
          <ul className="space-y-1">
            {lines.map((line) => (
              <li key={line.id} className={TONE[line.tone]}>
                {line.text}
              </li>
            ))}
          </ul>
          <p className={`mt-3 ${TONE.white}`}>
            <span className={TONE.yellow}>awaiting session</span>
            <span className={blink ? "opacity-100" : "opacity-0"}>█</span>
          </p>
          <p className="mt-4 text-[10px] text-[#5B6472]">
            <span className={TONE.green}>green</span> done ·{" "}
            <span className={TONE.yellow}>yellow</span> running ·{" "}
            <span className={TONE.white}>white</span> queued ·{" "}
            <span className={TONE.red}>red</span> failed
          </p>
        </div>
      </div>
    </div>
  );
}
