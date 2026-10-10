import type { NextApiRequest, NextApiResponse } from "next";
import { COOKIE_NAME, STAFF_COOKIE_NAME } from "../../../lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookiePath = process.env.NEXT_PUBLIC_BASE_PATH || "/";
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  const base = cookiePath === "/" ? "" : cookiePath;
  res.setHeader("Set-Cookie", [
    `${COOKIE_NAME}=; HttpOnly; ${secure}SameSite=Strict; Path=${cookiePath}; Max-Age=0`,
    `${STAFF_COOKIE_NAME}=; HttpOnly; ${secure}SameSite=Strict; Path=${cookiePath}; Max-Age=0`,
  ]);
  return res.redirect(302, `${base}/admin/login`);
}
