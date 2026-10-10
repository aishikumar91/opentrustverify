import type { NextApiRequest, NextApiResponse } from "next";
import { findActiveStaffByEmail, issueStaffOtp, normalizeStaffEmail } from "../../../lib/staffStore";
import { sendStaffOtpEmail } from "../../../lib/mailer";
import { checkRateLimitAsync, clientIp } from "../../../lib/rateLimit";
import { verifyTurnstile } from "../../../lib/turnstile";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = clientIp(req);
  const rl = await checkRateLimitAsync(`otp-req:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return res.status(429).json({ error: "Too many attempts. Retry shortly." });
  }
  try {
    const { email, turnstile } = (req.body ?? {}) as { email?: string; turnstile?: string };
    const captcha = await verifyTurnstile(turnstile, ip);
    if (!captcha.ok) {
      return res.status(400).json({ error: captcha.error ?? "Captcha failed." });
    }
    const normalized = normalizeStaffEmail(email ?? "");
    const member = await findActiveStaffByEmail(normalized);
    if (member) {
      try {
        const { code } = await issueStaffOtp(member.id);
        await sendStaffOtpEmail(member.email, code);
      } catch (err) {
        console.error("Staff OTP email failed:", err instanceof Error ? err.message : err);
      }
    }
    // Always OK — do not reveal whether the email is registered.
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Request failed" });
  }
}
