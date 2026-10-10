/**
 * auth.ts
 *
 * Minimal signed-cookie session for the admin console. Not a full identity
 * system — it's deliberately small: one admin account (ADMIN_USERNAME +
 * ADMIN_PASSWORD_HASH), an HMAC-signed, expiring token in an HttpOnly
 * cookie. Every /api/admin/* route and the /admin page itself must verify
 * this token before touching liveEngine.ts.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "ot_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "replace_me") {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(username: string): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${username}.${expires}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifySessionToken(token: string | undefined | null): { username: string } | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [username, expiresStr, sig] = decoded.split(".");
    if (!username || !expiresStr || !sig) return null;

    const expectedSig = sign(`${username}.${expiresStr}`);
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (Date.now() > Number(expiresStr)) return null;

    return { username };
  } catch {
    return null;
  }
}

export function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

// ---------------- Staff (email + OTP) sessions ----------------
export const STAFF_COOKIE_NAME = "ot_staff";
const STAFF_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export interface StaffSession {
  role: "staff";
  email: string;
}

export function createStaffSessionToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const expires = Date.now() + STAFF_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ role: "staff", email: normalized, exp: expires })).toString("base64url");
  const sig = sign(`staff.${payload}`);
  return `${payload}.${sig}`;
}

export function verifyStaffSessionToken(token: string | undefined | null): StaffSession | null {
  if (!token || !token.includes(".")) return null;
  try {
    const dot = token.lastIndexOf(".");
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = sign(`staff.${payload}`);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: string;
      email?: string;
      exp?: number;
    };
    if (data.role !== "staff" || !data.email || !data.exp || Date.now() > Number(data.exp)) return null;
    return { role: "staff", email: String(data.email) };
  } catch {
    return null;
  }
}

export type Requester = { role: "admin"; id: string } | { role: "staff"; id: string } | null;

/** Admin cookie first, staff cookie second. Use for read routes; write routes must require admin. */
export function getRequester(req: { headers: { cookie?: string } }): Requester {
  const admin = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (admin) return { role: "admin", id: admin.username };
  const staff = verifyStaffSessionToken(parseCookie(req.headers.cookie, STAFF_COOKIE_NAME));
  if (staff) return { role: "staff", id: staff.email };
  return null;
}
