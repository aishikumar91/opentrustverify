/**
 * Shared session gate for /api/admin/* routes.
 */

import type { NextApiRequest } from "next";
import {
  verifySessionToken,
  parseCookie,
  COOKIE_NAME,
  getRequester,
} from "./auth";

export function requireAdminSession(
  req: NextApiRequest
): { username: string } | null {
  return verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
}

/**
 * Admin or staff console session. Staff id is their email — used as the
 * independent wallet/passkey scope (same stores, separate rows).
 */
export function requireOperatorSession(
  req: NextApiRequest
): { username: string; role: "admin" | "staff" } | null {
  const requester = getRequester(req);
  if (!requester) return null;
  return { username: requester.id, role: requester.role };
}
