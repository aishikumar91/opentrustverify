import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { createSessionToken, COOKIE_NAME } from "../../../lib/auth";
import { findAdminByUsername } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body ?? {};

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "username and password are required" });
  }

  try {
    const user = await findAdminByUsername(username);
    if (!user) {
      // Same error as a wrong password — don't reveal which part was wrong.
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createSessionToken(user.username);
    const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
    const cookiePath = process.env.NEXT_PUBLIC_BASE_PATH || "/";
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; HttpOnly; ${secure}SameSite=Strict; Path=${cookiePath}; Max-Age=${60 * 60 * 8}`
    );
    return res.status(200).json({ ok: true, role: user.role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return res.status(500).json({ error: message });
  }
}
