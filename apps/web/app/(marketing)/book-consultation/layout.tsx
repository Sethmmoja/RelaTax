import { pageMetadata } from "../../../lib/seo";

// This page is a client component, which cannot export `metadata` itself —
// Next only reads that export from server components, so it lives in the
// route's layout instead.
export const metadata = pageMetadata({
  title: "Book a Consultation",
  description:
    "Book a free consultation with a senior RelaTax accountant to scope your accounting, tax and payroll needs.",
  path: "/book-consultation"
});

export default function BookConsultationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
