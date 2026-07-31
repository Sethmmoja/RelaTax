"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@relatax/ui";
import { apiFetch } from "../../lib/api-client";
import { useBusiness } from "../../lib/business-context";

export const OPEN_PORTAL_AI_EVENT = "relatax:open-ai-assistant";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  escalate?: boolean;
}

export function PortalAIChatWidget() {
  const { activeBusinessId } = useBusiness();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Ask me to explain a report, a tax balance, or an invoice for this business — I'll answer from your actual data and uploaded documents."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_PORTAL_AI_EVENT, handler);
    return () => window.removeEventListener(OPEN_PORTAL_AI_EVENT, handler);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading || !activeBusinessId) return;

    // Last 10 turns of real back-and-forth, so follow-up questions ("and PAYE?") work.
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const result = await apiFetch<{ answer: string; lowConfidence: boolean }>(
        `/ai/businesses/${activeBusinessId}/chat`,
        { method: "POST", body: JSON.stringify({ message: question, history }) }
      );
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer, escalate: result.lowConfidence }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't reach the assistant right now.", escalate: true }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col rounded-lg border border-border bg-card shadow-elegant">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-serif text-lg">Ask RelaTax AI</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-8" : "mr-8"}>
                <div
                  className={
                    m.role === "user"
                      ? "rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                      : "rounded-lg bg-muted px-3 py-2 text-foreground"
                  }
                >
                  {m.text}
                </div>
                {m.escalate && (
                  <div className="mt-2 flex gap-2">
                    <a href="https://wa.me/254115581898" target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">Chat on WhatsApp</Button>
                    </a>
                    <Link href="/book-consultation">
                      <Button size="sm" variant="outline">Book a consult</Button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="mr-8 rounded-lg bg-muted px-3 py-2 text-muted-foreground">Thinking…</div>}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this business…"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button type="submit" size="sm">
              Send
            </Button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant"
        aria-label="Open portal AI assistant"
      >
        💬
      </button>
    </div>
  );
}
