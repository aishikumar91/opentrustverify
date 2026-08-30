import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { OtvApiClient, type OtvUser } from "@otv/api-client";
import { API_BASE, SESSION_STORAGE_KEY, createClient } from "./api";

type AuthState = {
  ready: boolean;
  user: OtvUser | null;
  sessionToken: string | null;
  projectId?: string;
  orgId?: string;
  client: OtvApiClient;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<OtvUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    typeof localStorage === "undefined" ? null : localStorage.getItem(SESSION_STORAGE_KEY)
  );
  const [projectId, setProjectId] = useState<string>();
  const [orgId, setOrgId] = useState<string>();

  const client = useMemo(
    () => createClient(sessionToken),
    [sessionToken]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await client.me();
        if (cancelled) return;
        setUser(me.user);
        setProjectId(me.projectId);
        setOrgId(me.orgId);
        if (me.sessionToken && me.sessionToken !== sessionToken) {
          localStorage.setItem(SESSION_STORAGE_KEY, me.sessionToken);
          setSessionToken(me.sessionToken);
        }
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        if (!cancelled) {
          if (sessionToken) setSessionToken(null);
          setUser(null);
          setProjectId(undefined);
          setOrgId(undefined);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, sessionToken]);

  async function applySession(token: string, nextUser: OtvUser) {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
    setSessionToken(token);
    setUser(nextUser);
    const me = await new OtvApiClient({ baseUrl: API_BASE, sessionToken: token }).me();
    setProjectId(me.projectId);
    setOrgId(me.orgId);
  }

  const value: AuthState = {
    ready,
    user,
    sessionToken,
    projectId,
    orgId,
    client,
    login: async (email, password) => {
      const res = await new OtvApiClient({ baseUrl: API_BASE }).login(email, password);
      await applySession(res.sessionToken, res.user);
    },
    register: async (email, password, name) => {
      const res = await new OtvApiClient({ baseUrl: API_BASE }).register(email, password, name);
      await applySession(res.sessionToken, res.user);
    },
    logout: async () => {
      try {
        await client.logout();
      } finally {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionToken(null);
        setUser(null);
        setProjectId(undefined);
        setOrgId(undefined);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
