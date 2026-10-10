/**
 * SMTP mailer (Gmail / Yahoo / custom) + branded 3GGA templates.
 * Credentials live in Postgres admin_settings (set them in the Team panel —
 * use provider App Passwords, never mailbox passwords).
 */
import nodemailer from "nodemailer";
import { getSmtpSettings } from "./staffStore";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function publicBaseUrl(): string {
  return (process.env.OTV_PUBLIC_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://otv.poptrust.me").replace(/\/$/, "");
}

function shell(inner: string): string {
  const base = publicBaseUrl();
  return `<!doctype html><html><body style="margin:0;background:#F4F6FA;font-family:Urbanist,Roboto,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
<div style="background:#101828;border-radius:16px 16px 0 0;padding:20px 24px;color:#fff;font-weight:800;letter-spacing:.14em;">3GGA</div>
<div style="background:#fff;border:1px solid #DDE1EA;border-top:0;border-radius:0 0 0 0;padding:24px;color:#101828;">${inner}</div>
<div style="padding:16px 24px;color:#6B7280;font-size:12px;line-height:1.6;">
3GGA fraud console · automated message, do not reply.<br/>
<a href="${base}/privacy" style="color:#2E7CF6;">Privacy</a> ·
<a href="${base}/terms" style="color:#2E7CF6;">Terms</a> ·
<a href="mailto:${esc(process.env.TURBO_SMTP_FROM ?? "ceo@poptrust.me")}?subject=Unsubscribe" style="color:#2E7CF6;">Unsubscribe</a>
</div></div></body></html>`;
}

/** System sender identity. */
export const SYSTEM_SENDER_NAME = "3GGA ENGINE";
/** Admin inbox for security + onboarding alerts. */
export const ADMIN_ALERT_INBOX = "agentwynerodman@yahoo.com";

function fromHeader(s: { from: string; user: string }): string {
  const raw = (s.from || s.user).trim();
  if (/^.+<[^<>]+>$/.test(raw)) return raw;
  return `${SYSTEM_SENDER_NAME} <${raw}>`;
}

export async function sendMail(to: string, subject: string, htmlBody: string, textBody: string): Promise<void> {
  const s = await getSmtpSettings();
  if (!s.host || !s.user) throw new Error("SMTP is not configured. Set it in Admin → Team → SMTP first.");
  const transporter = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: { user: s.user, pass: s.pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  await transporter.sendMail({
    from: fromHeader(s),
    to,
    subject,
    text: textBody,
    html: shell(htmlBody),
  });
}

export async function sendStaffOtpEmail(to: string, code: string, minutes = 10): Promise<void> {
  const safe = esc(code);
  await sendMail(
    to,
    `Your 3GGA sign-in code: ${code}`,
    `<p style="font-size:15px;">Your one-time sign-in code is:</p>
<p style="font-size:32px;font-weight:800;letter-spacing:.2em;">${safe}</p>
<p style="font-size:13px;color:#5B6472;">Expires in ${minutes} minutes. Never share this code. If you did not request it, ignore this email.</p>`,
    `Your 3GGA sign-in code: ${code} (expires in ${minutes} minutes). Never share it.`
  );
}

export async function sendLoginAlert(input: {
  kind: "admin" | "subscriber";
  id: string;
  ip: string;
}): Promise<void> {
  const at = new Date().toISOString();
  await sendMail(
    ADMIN_ALERT_INBOX,
    `3GGA sign-in alert: ${input.id}`,
    `<p><strong>${input.kind === "admin" ? "Admin" : "Subscriber"}</strong> sign-in succeeded.</p><p>Account: ${input.id}</p><p>Time (UTC): ${at}</p><p>IP: ${input.ip}</p><p>If this was not authorized, rotate credentials and review linked wallets immediately.</p>`,
    `3GGA sign-in alert (${input.kind}): ${input.id} at ${at} from ${input.ip}`
  );
}

export async function sendMemberAddedEmail(to: string, addedBy: string): Promise<void> {
  const base = publicBaseUrl();
  await sendMail(
    to,
    "You have been added to 3GGA",
    `<p>You were added to the 3GGA console by ${addedBy}.</p><p>Sign in any time at <a href="${base}/trigger/subscriber/login">${base}/trigger/subscriber/login</a> with a one-time email code. Subscriber access is read-only (runs + verification).</p>`,
    `You were added to 3GGA by ${addedBy}. Sign in at ${base}/trigger/subscriber/login with an email code.`
  );
}
