"use client";

import { useEffect, useMemo, useState } from "react";

export type CliLineTone = "white" | "green" | "yellow" | "red";

export type CliLine = {
  id: string;
  text: string;
  tone: CliLineTone;
};

type Props = {
  /** Active test label, e.g. mempoolLure / deploy / verify */
  task: string;
  /** When set, marks the run complete (green) or failed (red) and freezes further ticks. */
  outcome?: "ok" | "fail" | null;
  /** Optional detail shown on the final line (tx hash / error). */
  detail?: string | null;
};

const TONE_CLASS: Record<CliLineTone, string> = {
  white: "text-[#F4F6FA]",
  green: "text-[#39FF14]",
  yellow: "text-[#F5D76E]",
  red: "text-[#FF5C6C]",
};

function stepsFor(task: string): string[] {
  const label = task.trim() || "run";
  return [
    `boot 3gga-test · ${label}`,
    "session handshake",
    "allowlist check · target",
    "allowlist check · signer",
    "wallet provider ready",
    "estimate gas / build tx",
    "await signature",
    "broadcast to chain",
    "persist executed run",
  ];
}

/**
 * Full-screen CLI-style testing preloader.
 * Colors: white = info, yellow = running, green = done, red = failed.
 */
export default function CliTestPreloader({ task, outcome = null, detail = null }: Props) {
  const steps = useMemo(() => stepsFor(task), [task]);
  const [cursor, setCursor] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    setCursor(0);
  }, [task]);

  useEffect(() => {
    if (outcome) return;
    const t = window.setInterval(() => {
      setCursor((c) => Math.min(c + 1, steps.length - 1));
    }, 420);
    return () => window.clearInterval(t);
  }, [outcome, steps.length]);

  useEffect(() => {
    const t = window.setInterval(() => setBlink((b) => !b), 480);
    return () => window.clearInterval(t);
  }, []);

  const lines: CliLine[] = steps.map((text, i) => {
    if (outcome === "fail" && i === Math.min(cursor, steps.length - 1)) {
      return { id: `s-${i}`, text: `[FAIL] ${text}`, tone: "red" };
    }
    if (outcome === "ok" && i <= cursor) {
      return { id: `s-${i}`, text: `[OK]   ${text}`, tone: "green" };
    }
    if (i < cursor) {
      return { id: `s-${i}`, text: `[OK]   ${text}`, tone: "green" };
    }
    if (i === cursor) {
      return {
        id: `s-${i}`,
        text: outcome === "ok" ? `[OK]   ${text}` : `[RUN]  ${text}`,
        tone: outcome === "ok" ? "green" : "yellow",
      };
    }
    return { id: `s-${i}`, text: `[····] ${text}`, tone: "white" };
  });

  if (detail) {
    lines.push({
      id: "detail",
      text: outcome === "fail" ? `! ${detail}` : `→ ${detail}`,
      tone: outcome === "fail" ? "red" : "white",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#05080C]/92 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="status"
      aria-live="polite"
      aria-label="Test console running"
    >
      <div className="flex max-h-[min(85vh,640px)] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-xl border border-[#1C2430] bg-[#0A0E14] shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2 border-b border-[#1C2430] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5C6C]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#F5D76E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#39FF14]" />
          <p className="ml-2 truncate font-mono text-[11px] text-[#8A95A5]">
            3gga@console — test/{task || "run"}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 font-mono text-[11px] leading-relaxed sm:text-xs">
          <p className={`${TONE_CLASS.white} mb-2`}>
            $ 3gga test --vector <span className={TONE_CLASS.yellow}>{task || "run"}</span>
          </p>
          <ul className="space-y-1">
            {lines.map((line) => (
              <li key={line.id} className={`break-all ${TONE_CLASS[line.tone]}`}>
                {line.text}
              </li>
            ))}
          </ul>
          <p className={`mt-3 ${TONE_CLASS.white}`}>
            {outcome === "ok" ? (
              <span className={TONE_CLASS.green}>✔ test sequence complete</span>
            ) : outcome === "fail" ? (
              <span className={TONE_CLASS.red}>✖ test sequence aborted</span>
            ) : (
              <>
                <span className={TONE_CLASS.yellow}>_</span>
                <span className={blink ? "opacity-100" : "opacity-0"}>█</span>
              </>
            )}
          </p>
          <p className="mt-4 text-[10px] text-[#5B6472]">
            <span className={TONE_CLASS.green}>green</span> done ·{" "}
            <span className={TONE_CLASS.yellow}>yellow</span> running ·{" "}
            <span className={TONE_CLASS.white}>white</span> queued ·{" "}
            <span className={TONE_CLASS.red}>red</span> failed
          </p>
        </div>
      </div>
    </div>
  );
}
