"use client";

import { useEffect, useState } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@relatax/ui";
import { apiFetch } from "../../../../lib/api-client";

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  sector: string;
  services: string[];
  message: string | null;
  createdAt: string;
}

export default function ContactInquiriesPage() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ContactInquiry[]>("/admin/contact-inquiries")
      .then(setInquiries)
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Contact inquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">Submissions from the public "Contact us" form.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : inquiries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inquiries yet.</p>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id} className="shadow-none">
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    {inquiry.name} · {inquiry.company}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inquiry.sector} · {new Date(inquiry.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  {inquiry.email}
                  {inquiry.phone ? ` · ${inquiry.phone}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {inquiry.services.map((s) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
                {inquiry.message && <p className="text-sm text-muted-foreground">{inquiry.message}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
