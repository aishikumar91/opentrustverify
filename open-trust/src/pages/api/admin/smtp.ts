import type { NextApiRequest, NextApiResponse } from "next";
import { getRequester } from "../../../lib/auth";
import { getSmtpSettings, saveSmtpSettings } from "../../../lib/staffStore";
import { resolveFromHeader, sendMail, verifySmtp } from "../../../lib/mailer";

function masked(pass: string): string {
  return pass ? "••••••••" : "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requester = getRequester(req);
  if (!requester || requester.role !== "admin") {
    return res.status(401).json({ error: "Admin session required." });
  }
  try {
    if (req.method === "GET") {
      const s = await getSmtpSettings();
      const resolvedFrom = s.user ? resolveFromHeader(s) : "";
      return res.status(200).json({
        ...s,
        pass: masked(s.pass),
        hasPass: Boolean(s.pass),
        resolvedFrom,
      });
    }
    if (req.method === "PUT") {
      const body = (req.body ?? {}) as Record<string, unknown>;
      let from = typeof body.from === "string" ? body.from.trim() : undefined;
      if (from?.startsWith("(") && from.endsWith(")")) from = from.slice(1, -1).trim();
      const next = await saveSmtpSettings({
        host: typeof body.host === "string" ? body.host : undefined,
        port: body.port !== undefined ? Number(body.port) : undefined,
        secure: typeof body.secure === "boolean" ? body.secure : undefined,
        user: typeof body.user === "string" ? body.user : undefined,
        pass: typeof body.pass === "string" && body.pass ? body.pass : undefined,
        from,
      });
      return res.status(200).json({
        ...next,
        pass: masked(next.pass),
        hasPass: Boolean(next.pass),
        resolvedFrom: next.user ? resolveFromHeader(next) : "",
      });
    }
    if (req.method === "POST") {
      const { to, action } = (req.body ?? {}) as { to?: string; action?: string };
      if (action === "verify") {
        const result = await verifySmtp();
        if (!result.ok) return res.status(400).json({ error: result.error });
        return res.status(200).json({ ok: true, verified: true });
      }
      if (typeof to !== "string" || !to.includes("@")) {
        return res.status(400).json({ error: "Provide a valid recipient email." });
      }
      await sendMail(
        to.trim(),
        "3GGA SMTP test",
        "<p>SMTP is configured correctly. OTP and notification mail can be delivered.</p>",
        "3GGA SMTP is configured correctly."
      );
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "SMTP update failed" });
  }
}
