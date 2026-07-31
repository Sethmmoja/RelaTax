"use client";

import { useEffect, useState } from "react";
import { Badge, Card, CardContent } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiFetch<NotificationItem[]>("/notifications").then(setNotifications).catch(() => setNotifications([]));
  }, []);

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Notifications</h1>
      <div className="space-y-3">
        {notifications.length === 0 && <p className="text-sm text-muted-foreground">You're all caught up.</p>}
        {notifications.map((n) => (
          <Card key={n.id} className={n.readAt ? "opacity-70" : ""}>
            <CardContent className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.readAt ? (
                <button onClick={() => markRead(n.id)} className="shrink-0 text-sm text-primary hover:underline">
                  Mark read
                </button>
              ) : (
                <Badge variant="outline">Read</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
