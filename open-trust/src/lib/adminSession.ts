/**
 * Shared session gate for /api/admin/* routes.
 */

import type { NextApiRequest } from "next";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "./auth";

export function requireAdminSession(
  req: NextApiRequest
): { username: string } | null {
  return verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
}
