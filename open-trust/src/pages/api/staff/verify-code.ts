import type { NextApiRequest, NextApiResponse } from "next";
import { createStaffSessionToken, STAFF_COOKIE_NAME } from "../../../lib/auth";
import { findActiveStaffByEmail, verifyStaffOtp, normalizeStaffEmail } from "../../../lib/staffStore";
import { checkRateLimitAsync, clientIp } from "../../../lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = clientIp(req);
  const rl = await checkRateLimitAsync(`otp-verify:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return res.status(429).json({ error: "Too many attempts. Retry shortly." });
  }
  try {
    const { email, code } = (req.body ?? {}) as { email?: string; code?: string };
    const normalized = normalizeStaffEmail(email ?? "");
    const member = await findActiveStaffByEmail(normalized);
    if (!member || typeof code !== "string" || !(await verifyStaffOtp(member.id, code))) {
      await new Promise((r) => setTimeout(r, 600));
      return res.status(401).json({ error: "Invalid or expired code." });
    }
    try {
      const { sendLoginAlert } = await import("../../../lib/mailer");
      void sendLoginAlert({ kind: "subscriber", id: member.email, ip: clientIp(req) }).catch((err) => {
        console.error("Login alert failed:", err instanceof Error ? err.message : err);
      });
    } catch {
      /* alert must never block sign-in */
    }

    const token = createStaffSessionToken(member.email);
    const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
    const cookiePath = process.env.NEXT_PUBLIC_BASE_PATH || "/";
    res.setHeader(
      "Set-Cookie",
      `${STAFF_COOKIE_NAME}=${token}; HttpOnly; ${secure}SameSite=Strict; Path=${cookiePath}; Max-Age=${60 * 60 * 12}`
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Verification failed" });
  }
}
