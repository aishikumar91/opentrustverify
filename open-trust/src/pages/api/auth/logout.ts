import type { NextApiRequest, NextApiResponse } from "next";
import { COOKIE_NAME } from "../../../lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookiePath = process.env.NEXT_PUBLIC_BASE_PATH || "/";
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; ${secure}SameSite=Strict; Path=${cookiePath}; Max-Age=0`
  );
  return res.status(200).json({ ok: true });
}
