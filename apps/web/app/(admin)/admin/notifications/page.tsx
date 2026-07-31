"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Input } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";
import { useAuth } from "../../../../lib/auth-context";

const TYPES = ["PAYMENT_REMINDER", "FILING_REMINDER", "COMPLETED_WORK", "NEW_DOCUMENT", "ANNOUNCEMENT"];
const CHANNELS = ["PORTAL", "WHATSAPP", "EMAIL"];

interface Business {
  id: string;
  name: string;
}

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roleAssignments.some((ra) => ra.role.name === "SUPER_ADMIN") ?? false;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [type, setType] = useState(TYPES[0]);
  const [channels, setChannels] = useState<string[]>(["PORTAL"]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Business[]>("/admin/businesses").then(setBusinesses).catch(() => setBusinesses([]));
  }, []);

  function toggleChannel(channel: string) {
    setChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await apiFetch("/admin/notifications", {
      method: "POST",
      body: JSON.stringify({
        type,
        channels,
        title,
        body,
        businessId: businessId || undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined
      })
    });
    setConfirmation(
      scheduledFor ? `Scheduled for ${new Date(scheduledFor).toLocaleString()}.` : "Notification sent."
    );
    setTitle("");
    setBody("");
    setScheduledFor("");
    setTimeout(() => setConfirmation(null), 4000);
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl space-y-2">
        <h1 className="font-serif text-3xl">Send a notification</h1>
        <p className="text-sm text-muted-foreground">Sending notifications to clients is Super Admin only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-serif text-3xl">Send a notification</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
            {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Channels</label>
          <div className="flex gap-3">
            {CHANNELS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Business (optional — leave blank to notify a specific user only)</label>
          <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
            <option value="">No business (staff-only alert)</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm"
          required
        />

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Schedule for later (optional — leave blank to send now)</label>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>

        <Button type="submit" className="w-full">{scheduledFor ? "Schedule notification" : "Send notification"}</Button>
        {confirmation && <p className="text-sm text-primary">{confirmation}</p>}
      </form>
    </div>
  );
}
