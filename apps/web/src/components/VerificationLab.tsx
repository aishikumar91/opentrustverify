import { useEffect, useMemo, useState } from "react";
import {
  listDemoScenarios,
  runDemo,
  formatBaseUnits,
  type DemoScenario,
  type DemoScenarioId,
  type StepState,
} from "@otv/wallet-core";
import { apiBase } from "@/lib/api";

const SCENARIOS = listDemoScenarios();

const SHORT: Record<DemoScenarioId, string> = {
  phantom_event: "Phantom",
  balance_mismatch: "Mismatch",
  valid_payment: "Valid",
  pending_payment: "Pending",
};

const BLURB: Record<DemoScenarioId, string> = {
  phantom_event: "Event reported. No transaction.",
  balance_mismatch: "Event exists. Balance does not match.",
  valid_payment: "Transaction and balance agree.",
  pending_payment: "Waiting on confirmations.",
};

function mark(state: StepState): string {
  if (state === "success") return "✓";
  if (state === "failed") return "✕";
  if (state === "pending") return "◐";
  return "○";
}

function tone(state: StepState): string {
  if (state === "success") return "text-[var(--otv-success)]";
  if (state === "failed") return "text-[var(--otv-danger)]";
  if (state === "pending") return "text-[var(--otv-warning)]";
  return "text-[var(--otv-text-muted)]";
}

async function loadScenario(id: DemoScenarioId): Promise<{ scenario: DemoScenario; source: "api" | "browser" }> {
  try {
    const res = await fetch(`${apiBase()}/v1/demo/verification/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: id }),
    });
    if (!res.ok) throw new Error("demo route unavailable");
    const body = (await res.json()) as DemoScenario;
    if (body?.evaluation?.mode !== "simulation" || !Array.isArray(body.evaluation.steps)) {
      throw new Error("unexpected demo payload");
    }
    return { scenario: body, source: "api" };
  } catch {
    return { scenario: runDemo(id), source: "browser" };
  }
}

export function VerificationLab({ embedded = false }: { embedded?: boolean }) {
  const [scenarioId, setScenarioId] = useState<DemoScenarioId>("phantom_event");
  const [scenario, setScenario] = useState<DemoScenario | null>(null);
  const [source, setSource] = useState<"api" | "browser" | null>(null);
  const [visible, setVisible] = useState(0);
  const [running, setRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = scenario?.evaluation.steps ?? [];
  const shown = steps.slice(0, visible);

  useEffect(() => {
    if (!scenario) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(scenario.evaluation.steps.length);
      setRunning(false);
      return;
    }
    setVisible(0);
    setRunning(true);
    const timer = window.setInterval(() => {
      setVisible((current) => {
        if (current >= scenario.evaluation.steps.length) {
          window.clearInterval(timer);
          setRunning(false);
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [scenario]);

  const finished = scenario != null && visible >= steps.length;
  const observed = scenario?.balanceAfter ?? scenario?.balanceBefore ?? "0";
  const difference = useMemo(() => {
    if (!scenario || scenario.balanceAfter == null) return null;
    if (!/^\d+$/.test(scenario.expectedBalance) || !/^\d+$/.test(scenario.balanceAfter)) return null;
    const delta = BigInt(scenario.expectedBalance) - BigInt(scenario.balanceAfter);
    const sign = delta > 0n ? "-" : delta < 0n ? "+" : "";
    const abs = delta < 0n ? (-delta).toString() : delta.toString();
    return `${sign}${formatBaseUnits(abs, scenario.decimals)} ${scenario.tokenSymbol}`;
  }, [scenario]);

  async function start(id: DemoScenarioId = scenarioId) {
    setError(null);
    setShowDetails(false);
    setScenarioId(id);
    setScenario(null);
    setVisible(0);
    setRunning(true);
    try {
      const next = await loadScenario(id);
      setSource(next.source);
      setScenario(next.scenario);
    } catch (err) {
      setRunning(false);
      setError(err instanceof Error ? err.message : "The simulation did not start.");
    }
  }

  function reset() {
    setScenario(null);
    setSource(null);
    setVisible(0);
    setRunning(false);
    setShowDetails(false);
    setError(null);
  }

  const verdict =
    scenario?.evaluation.result === "verified"
      ? "Verified"
      : scenario?.evaluation.result === "pending"
        ? "Pending"
        : scenario?.evaluation.result === "unavailable"
          ? "Unavailable"
          : "Not verified";

  return (
    <section className={embedded ? "" : "otv-section"}>
      <div className={embedded ? "" : "otv-container"}>
        <div className="otv-frame otv-frame-compact p-4 md:p-6">
          <div className="relative z-[1]">
            <p className="otv-kicker">Demo · simulation</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <h2 className="m-0 text-lg font-bold uppercase tracking-tight text-[var(--otv-ivory)] md:text-2xl">
                Verification lab
              </h2>
              {scenario && (
                <button type="button" className="text-xs font-semibold uppercase tracking-wide text-[var(--otv-brand)]" onClick={reset}>
                  Reset
                </button>
              )}
            </div>
            <p className="mt-2 mb-0 max-w-xl text-xs text-[var(--otv-ivory)]/75 md:text-sm">
              Simulated chain data. No transaction is sent.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SCENARIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => start(item.id)}
                  className={`rounded-[12px] border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--otv-ivory)] md:text-xs ${
                    scenarioId === item.id ? "border-[var(--otv-brand)] bg-[var(--otv-brand)]/10" : "border-white/15"
                  }`}
                >
                  {SHORT[item.id]}
                </button>
              ))}
            </div>
            <p className="mt-2 mb-0 text-[11px] leading-snug text-[var(--otv-ivory)]/65">
              {BLURB[scenarioId]}
            </p>

            {error && <p className="mt-3 mb-0 text-xs text-[var(--otv-danger)]">{error}</p>}

            {scenario && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <article className="rounded-[12px] border border-white/15 p-3">
                    <h3 className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--otv-ivory)]/55">Event</h3>
                    <p className="mt-1 mb-0 text-sm font-semibold text-[var(--otv-ivory)]">
                      {formatBaseUnits(scenario.expectedAmountBaseUnits, scenario.decimals)} {scenario.tokenSymbol}
                    </p>
                    <p className="mt-1 mb-0 text-[11px] text-[var(--otv-ivory)]/65">Detected</p>
                  </article>
                  <article className="rounded-[12px] border border-white/15 p-3">
                    <h3 className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--otv-ivory)]/55">State</h3>
                    <p className="mt-1 mb-0 text-sm font-semibold text-[var(--otv-ivory)]">{verdict}</p>
                    <p className="mt-1 mb-0 text-[11px] text-[var(--otv-ivory)]/65">
                      {formatBaseUnits(observed, scenario.decimals)} {scenario.tokenSymbol}
                      {difference ? ` · ${difference}` : ""}
                    </p>
                  </article>
                </div>

                <ol className="space-y-1">
                  {shown.map((item) => (
                    <li key={item.step} className="flex items-baseline gap-2 text-xs text-[var(--otv-ivory)]">
                      <span className={`font-mono ${tone(item.state)}`} aria-hidden>
                        {mark(item.state)}
                      </span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ol>

                {finished && (
                  <>
                    <p className="mb-0 text-sm font-semibold text-[var(--otv-ivory)]">{scenario.evaluation.decision}</p>
                    <p className="mb-0 text-[11px] text-[var(--otv-ivory)]/60">
                      {scenario.confirmations} confirmations · {scenario.evaluation.checks} checks
                      {source === "browser" ? " · browser simulation" : ""}
                    </p>
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-wide text-[var(--otv-brand)]"
                      onClick={() => setShowDetails((value) => !value)}
                    >
                      {showDetails ? "Hide details" : "Details"}
                    </button>
                    {showDetails && (
                      <dl className="grid gap-1 text-[11px] leading-snug text-[var(--otv-ivory)]/80">
                        <div>Network: Ethereum · block {scenario.blockNumber?.toLocaleString() ?? "not found"}</div>
                        <div className="break-all">Tx: {scenario.transactionHash ?? "not found"}</div>
                        <div className="break-all">Recipient: {scenario.recipient}</div>
                        <div className="break-all">Contract: {scenario.tokenContract}</div>
                        <div>
                          Event-only would {scenario.evaluation.eventOnlyWouldAccept ? "accept" : "stay silent"}. Balance{" "}
                          {scenario.evaluation.balanceUnchanged ? "unchanged" : "moved"}.
                        </div>
                      </dl>
                    )}
                  </>
                )}
                {running && !finished && (
                  <p className="mb-0 text-[11px] text-[var(--otv-ivory)]/65">Checking simulated state…</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

