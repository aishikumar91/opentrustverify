"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "../lib/basePath";

type YesNo = "YES" | "NO";

type SettingsPayload = {
  rpc: YesNo;
  mainnet: YesNo;
  allowlist: YesNo;
  walletConnect: YesNo;
  chainId: number;
  chainName: string;
  rpcSource: string | null;
  walletConnectProjectId: string;
  walletConnectConfigured: boolean;
  walletConnectSource: "database" | "env" | "none";
};

const FLAGS: {
  key: keyof Pick<SettingsPayload, "rpc" | "mainnet" | "allowlist" | "walletConnect">;
  label: string;
  shortLabel: string;
}[] = [
  { key: "rpc", label: "RPC", shortLabel: "RPC" },
  { key: "mainnet", label: "MAINNET", shortLabel: "MAINNET" },
  { key: "allowlist", label: "ALLOWLIST", shortLabel: "ALLOWLIST" },
  { key: "walletConnect", label: "WALLETCONNECT", shortLabel: "WC" },
];

export default function AdminSettingsPanel({ role }: { role?: "admin" | "staff" }) {
  const isStaff = role === "staff";
  const [members, setMembers] = useState<{ id: number; email: string; name: string | null }[]>([]);
  const [emailDraft, setEmailDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [teamMsg, setTeamMsg] = useState<string | null>(null);
  const [queue, setQueue] = useState<
    { id: number; email: string; telegram: string; txn_hash: string; plan: string; status: string }[]
  >([]);
  const [queueMsg, setQueueMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isStaff) return;
    let cancelled = false;
    async function loadQueue() {
      try {
        const res = await fetch(withBasePath("/api/admin/fulfillment"), { credentials: "include" });
        const data = await res.json();
        if (res.ok && !cancelled) setQueue(Array.isArray(data.queue) ? data.queue : []);
      } catch {
        /* non-fatal */
      }
    }
    void loadQueue();
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  async function completeQueue(id: number) {
    setQueueMsg(null);
    try {
      const res = await fetch(withBasePath("/api/admin/fulfillment"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "completed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "completed" } : q)));
      setQueueMsg("Marked completed — notify the subscriber by email.");
    } catch (err) {
      setQueueMsg(err instanceof Error ? err.message : "Failed");
    }
  }
  const [smtp, setSmtp] = useState({ host: "", port: "587", secure: false, user: "", pass: "", from: "" });
  const [hasPass, setHasPass] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [smtpMsg, setSmtpMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isStaff) return;
    let cancelled = false;
    void fetch(withBasePath("/api/admin/staff"), { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && !cancelled) setMembers(Array.isArray(data.staff) ? data.staff : []);
      })
      .catch(() => {});
    void fetch(withBasePath("/api/admin/smtp"), { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && !cancelled) {
          setSmtp({
            host: data.host ?? "",
            port: String(data.port ?? 587),
            secure: Boolean(data.secure),
            user: data.user ?? "",
            pass: "",
            from: data.from ?? "",
          });
          setHasPass(Boolean(data.hasPass));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  async function addMember() {
    setTeamMsg(null);
    try {
      const res = await fetch(withBasePath("/api/admin/staff"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDraft.trim(), name: nameDraft.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setMembers((prev) => [data.member, ...prev.filter((m: { id: number }) => m.id !== data.member.id)]);
      setEmailDraft("");
      setNameDraft("");
      setTeamMsg(`Added ${data.member.email} — they can sign in at /subscriber/login with an email code.`);
    } catch (err) {
      setTeamMsg(err instanceof Error ? err.message : "Failed to add");
    }
  }

  async function removeMember(id: number) {
    setTeamMsg(null);
    try {
      const res = await fetch(withBasePath("/api/admin/staff"), {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove");
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setTeamMsg("Member removed.");
    } catch (err) {
      setTeamMsg(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  async function saveSmtp() {
    setSmtpMsg(null);
    setSaving(true);
    try {
      const res = await fetch(withBasePath("/api/admin/smtp"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtp.host.trim(),
          port: Number(smtp.port) || 587,
          secure: smtp.secure,
          user: smtp.user.trim(),
          ...(smtp.pass ? { pass: smtp.pass } : {}),
          from: smtp.from.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save SMTP");
      setHasPass(Boolean(data.hasPass));
      setSmtp((s) => ({
        ...s,
        pass: "",
        from:
          typeof data.resolvedFrom === "string" && data.resolvedFrom
            ? data.resolvedFrom
            : s.from,
      }));
      setSmtpMsg("SMTP saved.");
    } catch (err) {
      setSmtpMsg(err instanceof Error ? err.message : "Failed to save SMTP");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestMail() {
    setSmtpMsg(null);
    setSaving(true);
    try {
      const verifyRes = await fetch(withBasePath("/api/admin/smtp"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "SMTP verify failed");
      const res = await fetch(withBasePath("/api/admin/smtp"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      setSmtpMsg(`Verified + test email sent to ${testTo.trim()}.`);
    } catch (err) {
      setSmtpMsg(err instanceof Error ? err.message : "Test failed");
    } finally {
      setSaving(false);
    }
  }

  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [projectIdDraft, setProjectIdDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isStaff) return;
    let cancelled = false;
    void fetch(withBasePath("/api/admin/settings"), { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
        if (!cancelled) {
          setSettings(data);
          setProjectIdDraft(data.walletConnectProjectId ?? "");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  if (isStaff) {
    return (
      <section className="min-w-0 overflow-x-hidden rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] p-3 sm:p-5">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[#5B6472]">Settings</h2>
        <p className="mt-2 text-xs leading-relaxed text-[#8A8D93]">
          Console testing (wallet connect, vectors, fire) is available under Vectors. System setup —
          WalletConnect project id, team, SMTP, and fulfillment — is managed by the admin.
        </p>
      </section>
    );
  }

  async function saveWalletConnect() {
    setError(null);
    setSaveMsg(null);
    setSaving(true);
    try {
      const res = await fetch(withBasePath("/api/admin/settings"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletConnectProjectId: projectIdDraft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSettings(data);
      setProjectIdDraft(data.walletConnectProjectId ?? "");
      setSaveMsg(data.walletConnectConfigured ? "Saved." : "Cleared.");
      // Notify LinkWallet (sibling) to re-fetch /api/config/public.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("otv-admin-settings-updated"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const card =
    "min-w-0 overflow-hidden rounded-2xl border border-[#DDE1EA] bg-[#F4F6FA] p-3 sm:p-5";
  const sectionTitle =
    "text-xs font-medium uppercase tracking-[0.14em] text-[#374151]";
  const field =
    "min-h-[44px] w-full min-w-0 rounded-full border border-[#CBD1DE] bg-[#FFFFFF] px-3 font-mono text-sm text-[#101828] outline-none placeholder:text-[#AEB4C2] focus:border-[#B8E600]";

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
      <section className={card}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[#5B6472]">
            Settings
          </h2>
          {settings && (
            <p className="max-w-full break-all font-mono text-[11px] leading-relaxed text-[#8A8D93] sm:max-w-[60%] sm:break-words sm:text-right">
              {settings.chainName} · {settings.chainId}
              {settings.rpcSource ? ` · ${settings.rpcSource}` : ""}
            </p>
          )}
        </div>
        {error && <p className="mt-3 break-words text-xs text-[#D92D20]">{error}</p>}
        {saveMsg && <p className="mt-3 break-words text-xs text-[#5B6472]">{saveMsg}</p>}
        {!settings && !error && (
          <p className="mt-3 text-xs text-[#8A8D93]">Loading settings…</p>
        )}
        {settings && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FLAGS.map(({ key, label, shortLabel }) => {
              const value = settings[key];
              const on = value === "YES";
              return (
                <div
                  key={key}
                  className="flex min-h-[44px] min-w-0 items-center justify-between gap-2 rounded-2xl border border-[#DDE1EA] bg-[#FFFFFF] px-2.5 py-2 sm:rounded-full sm:px-3"
                  title={label}
                >
                  <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[#374151] sm:text-xs">
                    <span className="sm:hidden">{shortLabel}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded px-2 py-1 font-mono text-[11px] font-semibold tracking-wide sm:text-xs ${
                      on
                        ? "bg-[#D7FF00]/30 text-[#0B0F14]"
                        : "bg-[#E6E9F0] text-[#6B7280]"
                    }`}
                  >
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {settings && (
        <>
          <section className={`${card} space-y-2`}>
            <label htmlFor="wc-project-id" className={sectionTitle}>
              WalletConnect · {settings.walletConnectSource}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="wc-project-id"
                type="text"
                value={projectIdDraft}
                onChange={(e) => setProjectIdDraft(e.target.value)}
                placeholder="Project ID"
                autoComplete="off"
                spellCheck={false}
                className={`${field} flex-1`}
              />
              <button
                type="button"
                onClick={() => void saveWalletConnect()}
                disabled={saving}
                className="min-h-[44px] w-full shrink-0 rounded-full bg-[#D7FF00] px-5 py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </section>

          <section className={`${card} space-y-2`}>
            <p className={sectionTitle}>Team · subscriber email-code login</p>
            <p className="break-words text-xs leading-relaxed text-[#8A8D93]">
              Added emails can sign in at /subscriber/login with a one-time code. Removing revokes
              access immediately. Staff get console testing; system setup stays with admin.
            </p>
            <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Name (optional)"
                autoComplete="off"
                className={`${field} flex-1 !font-[inherit]`}
              />
              <input
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="member@company.com"
                autoComplete="off"
                className={`${field} flex-1`}
              />
              <button
                type="button"
                onClick={() => void addMember()}
                disabled={!emailDraft.trim()}
                className="min-h-[44px] w-full shrink-0 rounded-full bg-[#D7FF00] px-5 py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30 md:w-auto"
              >
                Add
              </button>
            </div>
            {teamMsg && <p className="break-words text-xs text-[#5B6472]">{teamMsg}</p>}
            {members.length > 0 && (
              <ul className="divide-y divide-[#E6E9F0]">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-2 py-2.5 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between"
                  >
                    <span className="min-w-0 break-all font-mono text-xs text-[#101828]">
                      {m.email}
                      {m.name ? (
                        <span className="mt-0.5 block text-[#8A8D93] min-[400px]:ml-2 min-[400px]:mt-0 min-[400px]:inline">
                          {m.name}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeMember(m.id)}
                      className="min-h-9 w-full shrink-0 rounded-full border border-[#CBD1DE] px-3 py-1.5 text-[11px] text-[#6B7280] transition hover:border-[#B8E600] hover:text-[#0B0F14] min-[400px]:w-auto"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${card} space-y-2`}>
            <p className={sectionTitle}>Fulfillment queue</p>
            {queueMsg && <p className="break-words text-xs text-[#5B6472]">{queueMsg}</p>}
            {queue.length === 0 ? (
              <p className="text-xs text-[#8A8D93]">No payment submissions yet.</p>
            ) : (
              <ul className="divide-y divide-[#E6E9F0]">
                {queue.map((q) => (
                  <li key={q.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-mono text-xs text-[#101828]">
                        {q.email} · @{q.telegram} · {q.plan}
                      </p>
                      <p className="break-all font-mono text-[11px] text-[#8A8D93]">{q.txn_hash}</p>
                    </div>
                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                      <span
                        className={`rounded-full px-2 py-1 font-mono text-[11px] ${
                          q.status === "completed"
                            ? "bg-[#D7FF00]/30 text-[#0B0F14]"
                            : q.status === "rejected"
                              ? "bg-[#E6E9F0] text-[#6B7280]"
                              : "bg-[#FBE3B5] text-[#B54708]"
                        }`}
                      >
                        {q.status}
                      </span>
                      {q.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => void completeQueue(q.id)}
                          className="min-h-9 rounded-full bg-[#D7FF00] px-3 py-1.5 text-[11px] font-medium text-[#0B0F14] transition hover:bg-[#B8E600]"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${card} space-y-3`}>
            <p className={sectionTitle}>SMTP · OTP mail</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => setSmtp((s) => ({ ...s, host: "smtp.gmail.com", port: "587", secure: false }))}
                className="min-h-9 rounded-full border border-[#CBD1DE] px-3 py-1.5 text-[11px] text-[#5B6472] transition hover:border-[#B8E600]"
              >
                Gmail
              </button>
              <button
                type="button"
                onClick={() =>
                  setSmtp((s) => ({
                    ...s,
                    host: "smtp.mail.yahoo.com",
                    port: "465",
                    secure: true,
                    from: s.user ? `3GGA ENGINE <${s.user.trim()}>` : s.from,
                  }))
                }
                className="min-h-9 rounded-full border border-[#CBD1DE] px-3 py-1.5 text-[11px] text-[#5B6472] transition hover:border-[#B8E600]"
              >
                Yahoo
              </button>
              <button
                type="button"
                onClick={() => setSmtp((s) => ({ ...s, host: "smtp.zoho.com", port: "587", secure: false }))}
                className="min-h-9 rounded-full border border-[#CBD1DE] px-3 py-1.5 text-[11px] text-[#5B6472] transition hover:border-[#B8E600]"
              >
                Zoho
              </button>
              <button
                type="button"
                onClick={() => setSmtp((s) => ({ ...s, host: "pro.turbo-smtp.com", port: "587", secure: false }))}
                className="min-h-9 rounded-full border border-[#CBD1DE] px-3 py-1.5 text-[11px] text-[#5B6472] transition hover:border-[#B8E600]"
              >
                TurboSMTP
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={smtp.host} onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))} placeholder="Host (smtp.gmail.com)" autoComplete="off" className={field} />
              <input value={smtp.port} onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))} placeholder="Port (587)" inputMode="numeric" autoComplete="off" className={field} />
              <input value={smtp.user} onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))} placeholder="Username (full email)" autoComplete="off" className={field} />
              <input value={smtp.pass} onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))} placeholder={hasPass ? "App password (saved — leave blank to keep)" : "App password"} type="password" autoComplete="new-password" className={field} />
              <input value={smtp.from} onChange={(e) => setSmtp((s) => ({ ...s, from: e.target.value }))} placeholder="From (3GGA ENGINE <you@yahoo.com>)" autoComplete="off" className={`${field} sm:col-span-2`} />
              <label className="col-span-1 flex min-h-[44px] items-start gap-2 text-xs leading-snug text-[#5B6472] sm:col-span-2 sm:items-center">
                <input type="checkbox" checked={smtp.secure} onChange={(e) => setSmtp((s) => ({ ...s, secure: e.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
                <span>SSL / port 465 (off = STARTTLS on 587)</span>
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <button
                type="button"
                onClick={() => void saveSmtp()}
                disabled={saving || !smtp.host || !smtp.user}
                className="min-h-[44px] w-full rounded-full bg-[#D7FF00] px-5 py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {saving ? "Saving…" : "Save SMTP"}
              </button>
              <div className="flex w-full min-w-0 flex-1 flex-col gap-2 min-[400px]:flex-row">
                <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Test recipient" type="email" autoComplete="off" className={`${field} flex-1`} />
                <button
                  type="button"
                  onClick={() => void sendTestMail()}
                  disabled={saving || !testTo.trim()}
                  className="min-h-[44px] w-full shrink-0 rounded-full border border-[#CBD1DE] px-5 py-2 text-sm font-medium text-[#101828] transition hover:border-[#B8E600] disabled:cursor-not-allowed disabled:opacity-30 min-[400px]:w-auto"
                >
                  Test
                </button>
              </div>
            </div>
            {smtpMsg && <p className="break-words text-xs text-[#5B6472]">{smtpMsg}</p>}
          </section>
        </>
      )}
    </div>
  );
}
