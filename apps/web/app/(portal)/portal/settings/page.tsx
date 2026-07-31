"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, PasswordInput } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth-context";

interface SessionItem {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

function EmailVerificationCard() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function resend() {
    setError(null);
    setSending(true);
    try {
      await apiFetch("/auth/email-verification/request", { method: "POST" });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification email");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email verification</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        {user.emailVerifiedAt ? (
          <Badge variant="success">Verified</Badge>
        ) : (
          <>
            <div>
              <Badge variant="warning">Not verified</Badge>
              {sent && <p className="mt-2 text-sm text-muted-foreground">Verification email sent — check your inbox.</p>}
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={resend} disabled={sending}>
              {sending ? "Sending…" : "Resend verification email"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MfaCard() {
  const { user } = useAuth();
  const [step, setStep] = useState<"idle" | "phone" | "code" | "disable">("idle");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/auth/mfa/enable", { method: "POST", body: JSON.stringify({ phone, code }) });
      setMfaEnabled(true);
      setStep("idle");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/auth/mfa/disable", { method: "POST", body: JSON.stringify({ password }) });
      setMfaEnabled(false);
      setPassword("");
      setStep("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          Adds a one-time code sent to your phone on top of your password when signing in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant={mfaEnabled ? "success" : "outline"}>{mfaEnabled ? "Enabled" : "Disabled"}</Badge>

        {mfaEnabled && step !== "disable" && (
          <Button variant="outline" size="sm" onClick={() => setStep("disable")}>
            Turn off
          </Button>
        )}

        {!mfaEnabled && step === "idle" && (
          <Button size="sm" onClick={() => setStep("phone")}>
            Turn on
          </Button>
        )}

        {step === "phone" && (
          <form onSubmit={requestCode} className="max-w-sm space-y-3">
            <Input
              type="tel"
              placeholder="+254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={confirmEnable} className="max-w-sm space-y-3">
            <p className="text-sm text-muted-foreground">Enter the code sent to {phone}.</p>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Verifying…" : "Confirm and enable"}
            </Button>
          </form>
        )}

        {step === "disable" && (
          <form onSubmit={disable} className="max-w-sm space-y-3">
            <p className="text-sm text-muted-foreground">Confirm your password to turn off two-factor authentication.</p>
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="outline" size="sm" disabled={busy}>
              {busy ? "Turning off…" : "Confirm turn off"}
            </Button>
          </form>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function SessionsCard() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function load() {
    apiFetch<SessionItem[]>("/auth/sessions").then(setSessions).catch(() => setSessions([]));
  }

  useEffect(load, []);

  async function revoke(id: string) {
    setRevokingId(id);
    try {
      await apiFetch(`/auth/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>Devices currently signed in to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.length === 0 && <p className="text-sm text-muted-foreground">No active sessions.</p>}
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm">
                {s.userAgent ?? "Unknown device"} {s.current && <Badge variant="outline" className="ml-2">This device</Badge>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last active {new Date(s.lastUsedAt).toLocaleString()}
              </p>
            </div>
            {!s.current && (
              <button
                onClick={() => revoke(s.id)}
                disabled={revokingId === s.id}
                className="shrink-0 text-sm text-destructive hover:underline"
              >
                {revokingId === s.id ? "Signing out…" : "Sign out"}
              </button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Settings</h1>
      <div className="space-y-4">
        <EmailVerificationCard />
        <MfaCard />
        <SessionsCard />
      </div>
    </div>
  );
}
