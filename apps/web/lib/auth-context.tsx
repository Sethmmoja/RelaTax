"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { apiFetch, getToken, setToken } from "./api-client";

export interface CurrentUser {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  isStaff: boolean;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  roleAssignments: { role: { name: string } }[];
  businessMemberships: { business: { id: string; name: string; logoUrl: string | null; brandColor: string | null; status: string } }[];
}

type LoginResult = { mfaRequired: true; phone: string } | { mfaRequired: false; user: CurrentUser | null };

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  completeMfaLogin: (phone: string, code: string) => Promise<CurrentUser | null>;
  loginWithAccessToken: (accessToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Sets a small, non-httpOnly routing-hint cookie middleware.ts reads for UX-level
 * route gating — NOT the security boundary (that's every API call's own guards). */
function setRoleCookie(user: CurrentUser | null) {
  if (typeof document === "undefined") return;
  if (user) {
    document.cookie = `relatax_role=${user.isStaff ? "staff" : "client"}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    document.cookie = "relatax_role=; path=/; max-age=0";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe(): Promise<CurrentUser | null> {
    if (!getToken()) {
      setLoading(false);
      return null;
    }
    try {
      const me = await apiFetch<CurrentUser>("/users/me");
      setUser(me);
      setRoleCookie(me);
      return me;
    } catch {
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string): Promise<LoginResult> {
    const res = await apiFetch<{ accessToken?: string; mfaRequired?: boolean; phone?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (res.mfaRequired) return { mfaRequired: true, phone: res.phone! };

    setToken(res.accessToken!);
    const loaded = await loadMe();
    return { mfaRequired: false, user: loaded };
  }

  async function completeMfaLogin(phone: string, code: string): Promise<CurrentUser | null> {
    const res = await apiFetch<{ verified: boolean; tokens: { accessToken: string } | null }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code })
    });
    if (!res.verified || !res.tokens) throw new Error("Invalid or expired code");
    setToken(res.tokens.accessToken);
    return loadMe();
  }

  async function loginWithAccessToken(accessToken: string) {
    setToken(accessToken);
    await loadMe();
  }

  function logout() {
    setToken(null);
    setUser(null);
    setRoleCookie(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, completeMfaLogin, loginWithAccessToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
