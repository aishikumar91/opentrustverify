export type TicketStatus = "open" | "pending" | "closed";
export type SeatRole = "owner" | "admin" | "member";
export type NoticeKind = "security" | "usage" | "ticket";

export type Ticket = {
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  createdAt: string;
  email: string;
};

export type Seat = {
  email: string;
  role: SeatRole;
  addedAt: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  at: string;
  kind: NoticeKind;
};

export type WorkspacePrefs = {
  webhookAlerts: boolean;
  mockWarning: boolean;
  auditEmail: boolean;
};

const PREF_DEFAULT: WorkspacePrefs = {
  webhookAlerts: true,
  mockWarning: true,
  auditEmail: false,
};

function scopeKey(scope: string, kind: string) {
  return `otv-admin:${scope}:${kind}`;
}

function load<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadTickets(scope: string): Ticket[] {
  return load<Ticket[]>(scopeKey(scope, "tickets"), []);
}

export function saveTickets(scope: string, tickets: Ticket[]) {
  save(scopeKey(scope, "tickets"), tickets);
}

export function loadSeats(scope: string, ownerEmail: string): Seat[] {
  const existing = load<Seat[]>(scopeKey(scope, "seats"), []);
  if (existing.length) return existing;
  if (!ownerEmail) return [];
  const seed: Seat[] = [{ email: ownerEmail, role: "owner", addedAt: new Date().toISOString() }];
  save(scopeKey(scope, "seats"), seed);
  return seed;
}

export function saveSeats(scope: string, seats: Seat[]) {
  save(scopeKey(scope, "seats"), seats);
}

export function loadNotices(scope: string): Notice[] {
  return load<Notice[]>(scopeKey(scope, "notices"), []);
}

export function saveNotices(scope: string, notices: Notice[]) {
  save(scopeKey(scope, "notices"), notices);
}

export function loadPrefs(scope: string): WorkspacePrefs {
  return load<WorkspacePrefs>(scopeKey(scope, "prefs"), PREF_DEFAULT);
}

export function savePrefs(scope: string, prefs: WorkspacePrefs) {
  save(scopeKey(scope, "prefs"), prefs);
}

export function newTicket(email: string, subject: string, body: string): Ticket {
  return {
    id: nid("tk"),
    subject,
    body,
    status: "open",
    createdAt: new Date().toISOString(),
    email,
  };
}

export function newSeat(email: string, role: SeatRole): Seat {
  return { email, role, addedAt: new Date().toISOString() };
}

export function newNotice(kind: NoticeKind, title: string, body: string): Notice {
  return { id: nid("nt"), kind, title, body, read: false, at: new Date().toISOString() };
}
