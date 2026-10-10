import type { NextApiRequest, NextApiResponse } from "next";
import { submitFulfillment, FULFILLMENT_PLANS } from "../../../lib/fulfillmentStore";
import { sendMail } from "../../../lib/mailer";
import { checkRateLimitAsync, clientIp } from "../../../lib/rateLimit";
import { verifyTurnstile } from "../../../lib/turnstile";

const ONBOARD_INBOX = "agentwynerodman@yahoo.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = clientIp(req);
  const rl = await checkRateLimitAsync(`fulfill:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return res.status(429).json({ error: "Too many attempts. Retry shortly." });
  }
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const captcha = await verifyTurnstile(body.turnstile, ip);
    if (!captcha.ok) {
      return res.status(400).json({ error: captcha.error ?? "Captcha failed." });
    }
    const row = await submitFulfillment({
      email: body.email as string,
      telegram: body.telegram as string,
      txnHash: body.txnHash as string,
      plan: body.plan as string,
    });
    const planLabel = FULFILLMENT_PLANS.find((p) => p.id === row.plan)?.label ?? row.plan;
    try {
      await sendMail(
        ONBOARD_INBOX,
        `Onboarding payment: ${row.email} (${planLabel})`,
        `<p><strong>Email:</strong> ${row.email}</p><p><strong>Telegram:</strong> @${row.telegram}</p><p><strong>Plan:</strong> ${planLabel}</p><p><strong>TXN hash:</strong> <code>${row.txn_hash}</code></p><p>Submission #${row.id} — mark completed in Admin → Team → Fulfillment.</p>`,
        `Onboarding payment: ${row.email} / @${row.telegram} / ${planLabel} / ${row.txn_hash} (#${row.id})`
      );
    } catch (err) {
      console.error("Fulfillment notify failed:", err instanceof Error ? err.message : err);
    }
    return res.status(200).json({ ok: true, id: row.id });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Submit failed" });
  }
}
