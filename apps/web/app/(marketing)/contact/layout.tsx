import { pageMetadata } from "../../../lib/seo";
import { faqs } from "../../../lib/faqs";
import { FaqSchema } from "../../../components/seo/StructuredData";
import { Breadcrumbs } from "../../../components/marketing/Breadcrumbs";

// This page is a client component, which cannot export `metadata` itself —
// Next only reads that export from server components, so it lives in the
// route's layout instead.
export const metadata = pageMetadata({
  // The root layout appends "| RelaTax"; repeating the brand here would
  // render "Contact RelaTax | RelaTax".
  title: "Contact Us",
  description:
    "Talk to RelaTax about accounting, tax compliance or payroll for your business. Nairobi-based, serving Kenya and East Africa.",
  path: "/contact"
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Emitted from the layout so the JSON-LD is server-rendered into the
          initial HTML, rather than injected by the client page. */}
      <FaqSchema faqs={faqs.map((f) => ({ question: f.q, answer: f.a }))} />
      <div className="mx-auto max-w-7xl px-6 pt-10">
        <Breadcrumbs crumbs={[{ name: "Contact" }]} />
      </div>
      {children}
    </>
  );
}
