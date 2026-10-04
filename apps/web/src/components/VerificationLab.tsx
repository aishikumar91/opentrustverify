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

  return (
    <section className={embedded ? "" : "otv-section"}>
      <div className={embedded ? "" : "otv-container"}>
        <div className={embedded ? "otv-frame otv-frame-compact" : "otv-frame p-6 md:p-10"}>
          <div className="relative z-[1]">
          <p className="otv-kicker">Demo mode · simulated blockchain data</p>
          <h2 className="otv-heading mt-3 text-[var(--otv-ivory)]">OTV Verification Lab</h2>
          <p className="mt-3 max-w-2xl text-[var(--otv-ivory)]/80">
            See why event-based payment confirmation can fail. No real transaction is sent. Events tell you what was
            reported. Blockchain state tells you what exists.
          </p>
          <p className="mt-2 text-sm text-[var(--otv-ivory)]/70">Don't trust the event. Verify the state.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="otv-btn otv-btn-dark" onClick={() => start("phantom_event")}>
              Run demo
            </button>
            <button type="button" className="otv-btn otv-btn-invert" onClick={() => start("valid_payment")}>
              Try valid payment
            </button>
            <button type="button" className="otv-btn otv-btn-invert" onClick={() => start("phantom_event")}>
              Simulate phantom event
            </button>
            <button type="button" className="otv-btn otv-btn-invert" onClick={() => start("balance_mismatch")}>
              Simulate balance mismatch
            </button>
            <button type="button" className="otv-btn otv-btn-invert" onClick={() => start("pending_payment")}>
              Pending payment
            </button>
            <button type="button" className="otv-btn otv-btn-ghost text-[var(--otv-ivory)]" onClick={reset}>
              Reset
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => start(item.id)}
                className={`rounded-[14px] border p-4 text-left ${
                  scenarioId === item.id ? "border-[var(--otv-brand)]" : "border-white/15"
                }`}
              >
                <div className="text-sm font-semibold text-[var(--otv-ivory)]">{item.title}</div>
                <p className="mt-1 text-sm text-[var(--otv-ivory)]/70">{item.description}</p>
              </button>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-[var(--otv-danger)]">{error}</p>}

          {scenario && (
            <div className="mt-8 space-y-6">
              <div className="rounded-[14px] border border-white/15 p-4 text-sm text-[var(--otv-ivory)]/80">
                SIMULATION. Expected {formatBaseUnits(scenario.expectedAmountBaseUnits, scenario.decimals)}{" "}
                {scenario.tokenSymbol} on {scenario.network}. Recipient label {scenario.recipientLabel}. Reference{" "}
                {scenario.reference}. {source === "browser" ? "Ran in the browser because the demo API was unreachable." : "Ran through the demo API."}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-[14px] border border-white/15 p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--otv-ivory)]/60">Event stream</h3>
                  <p className="mt-4 text-lg font-semibold text-[var(--otv-success)]">Event detected</p>
                  <p className="mt-2 text-[var(--otv-ivory)]">Incoming transfer</p>
                  <p className="font-[family-name:var(--otv-font-display)] text-3xl font-extrabold text-[var(--otv-ivory)]">
                    {formatBaseUnits(scenario.expectedAmountBaseUnits, scenario.decimals)} {scenario.tokenSymbol}
                  </p>
                  <p className="mt-2 text-sm text-[var(--otv-ivory)]/70">Status: DETECTED · Source: event / indexer</p>
                  <p className="mt-2 font-mono text-xs text-[var(--otv-ivory)]/70">recipient {scenario.recipient}</p>
                </article>
                <article className="rounded-[14px] border border-white/15 p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--otv-ivory)]/60">Canonical state</h3>
                  <dl className="mt-4 space-y-2 text-sm text-[var(--otv-ivory)]">
                    <div className="flex justify-between gap-4"><dt>Network</dt><dd>Ethereum</dd></div>
                    <div className="flex justify-between gap-4"><dt>Latest block</dt><dd>{scenario.blockNumber ? scenario.blockNumber.toLocaleString() : "Not found"}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Observed balance</dt><dd>{formatBaseUnits(observed, scenario.decimals)} {scenario.tokenSymbol}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Expected balance</dt><dd>{formatBaseUnits(scenario.expectedBalance, scenario.decimals)} {scenario.tokenSymbol}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Difference</dt><dd>{difference ?? "Unchanged"}</dd></div>
                    <div className="flex justify-between gap-4"><dt>Transaction</dt><dd className="truncate">{scenario.transactionHash ?? "Not found"}</dd></div>
                    <div className="flex justify-between gap-4"><dt>State</dt><dd>{scenario.evaluation.result === "verified" ? "VERIFIED" : scenario.evaluation.result === "pending" ? "PENDING" : "NOT VERIFIED"}</dd></div>
                  </dl>
                </article>
              </div>

              <ol className="space-y-2">
                {shown.map((item) => (
                  <li key={item.step} className="flex gap-3 rounded-[14px] border border-white/10 px-4 py-3">
                    <span className={`font-mono ${tone(item.state)}`} aria-hidden>{mark(item.state)}</span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--otv-ivory)]">{item.label}</div>
                      <p className="text-sm text-[var(--otv-ivory)]/70">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {finished && (
                <>
                  <div className="rounded-[14px] border border-white/20 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--otv-ivory)]/60">OTV decision</p>
                    <p className="mt-2 font-[family-name:var(--otv-font-display)] text-4xl font-extrabold tracking-tight text-[var(--otv-ivory)]">
                      {scenario.evaluation.result === "verified"
                        ? "Payment verified"
                        : scenario.evaluation.result === "pending"
                          ? "Payment pending"
                          : scenario.evaluation.result === "unavailable"
                            ? "State unavailable"
                            : "Verification failed"}
                    </p>
                    <p className="mt-3 max-w-2xl text-[var(--otv-ivory)]/80">{scenario.evaluation.decision}</p>
                    <div className="mt-4 grid gap-2 text-sm text-[var(--otv-ivory)] sm:grid-cols-3">
                      <p>Event: detected</p>
                      <p>Transaction: {scenario.transactionHash ? `${scenario.confirmations} confirmations` : "not confirmed"}</p>
                      <p>Balance: {scenario.evaluation.balanceUnchanged ? "unchanged" : scenario.evaluation.result === "verified" ? "verified" : "does not match"}</p>
                    </div>
                    {scenario.evaluation.result !== "verified" && (
                      <p className="mt-4 text-sm font-semibold text-[var(--otv-ivory)]">
                        Merchant funds stay protected. OTV kept this unverified payment from being accepted.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <article className="rounded-[14px] border border-white/15 p-5">
                      <h3 className="text-sm font-semibold text-[var(--otv-ivory)]">Event-only system</h3>
                      <p className="mt-3 text-sm text-[var(--otv-success)]">✓ Event received</p>
                      <p className="text-sm text-[var(--otv-success)]">✓ Transfer reported</p>
                      <p className="mt-3 text-sm text-[var(--otv-ivory)]">
                        {scenario.evaluation.eventOnlyWouldAccept ? "→ Payment confirmed" : "→ No event, so this system stays silent"}
                      </p>
                      {scenario.evaluation.result !== "verified" && scenario.evaluation.eventOnlyWouldAccept && (
                        <p className="mt-2 text-sm text-[var(--otv-danger)]">That confirmation is not backed by chain state.</p>
                      )}
                    </article>
                    <article className="rounded-[14px] border border-[var(--otv-brand)]/40 p-5">
                      <h3 className="text-sm font-semibold text-[var(--otv-ivory)]">OpenTrust Verify</h3>
                      <ol className="mt-3 space-y-1">
                        {scenario.evaluation.steps.map((item) => (
                          <li key={item.step} className={`text-sm ${tone(item.state)}`}>
                            {mark(item.state)} {item.label}
                          </li>
                        ))}
                      </ol>
                    </article>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--otv-ivory)]/60">Timeline</h3>
                    <ol className="mt-3 space-y-1 font-mono text-xs text-[var(--otv-ivory)]/80">
                      {scenario.evaluation.steps.map((item, index) => (
                        <li key={item.step}>
                          {`00:${String(index).padStart(2, "0")} ${item.label} · ${item.state}`}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {(scenario.evaluation.result === "rejected" || scenario.evaluation.result === "mismatch") && (
                    <article className="rounded-[14px] border border-white/15 p-5">
                      <h3 className="text-sm font-semibold text-[var(--otv-ivory)]">Why did OTV reject it?</h3>
                      <p className="mt-2 text-sm text-[var(--otv-ivory)]/80">
                        An event is an observation. A blockchain balance is state. An event can be delayed, duplicated,
                        dropped, malformed, stale, or produced by an indexer that is disconnected from the transaction.
                        OTV does not treat an event alone as proof of payment.
                      </p>
                    </article>
                  )}

                  <div className="grid gap-3 sm:grid-cols-4">
                    <Stat label="Checks" value={String(scenario.evaluation.checks)} />
                    <Stat label="State queries" value={String(scenario.evaluation.stateQueries)} />
                    <Stat label="Events" value={String(scenario.evaluation.eventCount)} />
                    <Stat label="Trust assumptions" value={String(scenario.evaluation.trustAssumptions)} />
                  </div>
                  <p className="text-sm text-[var(--otv-ivory)]/70">Result: {scenario.evaluation.result}</p>

                  <button type="button" className="otv-btn otv-btn-invert" onClick={() => setShowDetails((value) => !value)}>
                    {showDetails ? "Hide verification details" : "View verification details"}
                  </button>
                  {showDetails && (
                    <dl className="grid gap-2 text-sm text-[var(--otv-ivory)] sm:grid-cols-2">
                      <div>Payment: {formatBaseUnits(scenario.expectedAmountBaseUnits, scenario.decimals)} {scenario.tokenSymbol}</div>
                      <div>Network: Ethereum</div>
                      <div>Token contract: {scenario.tokenContract}</div>
                      <div>Recipient: {scenario.recipient}</div>
                      <div>Transaction: {scenario.transactionHash ?? "Not found"}</div>
                      <div>Block: {scenario.blockNumber?.toLocaleString() ?? "Not found"}</div>
                      <div>Confirmations: {scenario.confirmations}</div>
                      <div>Balance state: {scenario.evaluation.result}</div>
                    </dl>
                  )}
                </>
              )}
              {running && !finished && <p className="text-sm text-[var(--otv-ivory)]/70">Checking simulated blockchain state…</p>}
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/10 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--otv-ivory)]/50">{label}</div>
      <div className="mt-2 font-[family-name:var(--otv-font-display)] text-2xl font-extrabold text-[var(--otv-ivory)]">{value}</div>
    </div>
  );
}
