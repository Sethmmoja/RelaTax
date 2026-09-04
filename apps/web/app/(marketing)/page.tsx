import { Button, Card, CardContent, CardHeader, CardTitle } from "@relatax/ui";
import { pageMetadata } from "../../lib/seo";
import { WebSiteSchema } from "../../components/seo/StructuredData";
import { CinematicHero } from "../../components/marketing/CinematicHero";
import { LedgerPageTransition } from "../../components/marketing/LedgerPageTransition";
import { Reveal } from "../../components/motion/Reveal";

const services = [
  { title: "Accounting & Bookkeeping", description: "Clean, current books — reconciled monthly, not just at year-end." },
  { title: "Financial Reporting", description: "P&L, Balance Sheet, Cash Flow and Trial Balance you can actually read." },
  { title: "Tax Compliance & Advisory", description: "VAT, PAYE and Corporation Tax filings, KRA & eTIMS ready." },
  { title: "Payroll", description: "Accurate, on-time payroll with statutory deductions handled end to end." },
  { title: "Budgeting & Forecasting", description: "Driver-based plans, cash-flow models and actuals-vs-budget reviews." },
  { title: "Outsourced Finance Function", description: "A dedicated fractional Finance Lead and a pool of senior accountants on tap." }
];

const trustStrip = ["IFRS FOR SMEs", "QuickBooks · Zoho · Xero", "KRA iTax & eTIMS", "NSSF · SHIF · PAYE · AHL"];

const whyFractional = [
  { title: "Senior expertise", description: "CPAs leading every engagement — not junior staff learning on your books." },
  { title: "Faster impact", description: "Onboard in days, not months. We bring tested playbooks, templates and tools from day one." },
  { title: "Cost-efficient", description: "Pay for the capacity you need. Scale up at year-end, scale down in quiet months — no long-term overhead." },
  { title: "Objective lens", description: "An external team that challenges assumptions and strengthens controls before auditors do." }
];

const stats = [
  { value: "2+ yrs", label: "average lead experience" },
  { value: "Day 5", label: "monthly close cadence" },
  { value: "100%", label: "statutory filings on time" },
  { value: "<24h", label: "support response window" }
];

const steps = [
  { number: "01", title: "Consultation", description: "We learn your business, systems, and reporting needs." },
  { number: "02", title: "Setup", description: "We connect your books (including QuickBooks) and set reporting cadence." },
  { number: "03", title: "Delivery", description: "Monthly reports, tax filings and payroll, on schedule." },
  { number: "04", title: "Advisory", description: "Ongoing guidance as your business grows and priorities shift." }
];

export const metadata = pageMetadata({
  title: "Fractional Accounting, Tax & Payroll in Kenya",
  description:
    "Partner-level accounting, KRA tax compliance and payroll for ambitious Kenyan businesses — without the full-time cost. Clean books, on-time filings.",
  path: "/"
});

export default function HomePage() {
  return (
    <>
      <WebSiteSchema />
      <CinematicHero />

      <Reveal as="section" className="border-y border-border px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:justify-between">
          {trustStrip.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </Reveal>

      <LedgerPageTransition>
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <h2 className="font-serif text-3xl md:text-5xl">One partner for accounting, tax compliance and payroll.</h2>
          </Reveal>
          <Reveal stagger=".service-card" className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Card key={s.title} className="service-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </CardContent>
              </Card>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <h2 className="font-serif text-3xl md:text-5xl">
              The expertise of a full accounting team. <span className="italic text-primary/80 dark:text-primary">A fraction of the cost.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Hiring full-time accountants is slow and expensive. With RelaTax, you get expert guidance, hands-on
              execution, and the flexibility to scale capacity to your real workload.
            </p>
          </Reveal>
          <Reveal stagger=".why-item" className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {whyFractional.map((item) => (
              <div key={item.title} className="why-item border-t-2 border-secondary pt-4">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="bg-muted/40 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <h2 className="font-serif text-3xl md:text-5xl">How we work</h2>
          </Reveal>
          <Reveal stagger=".step-item" className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="step-item">
                <p className="font-mono text-xs tracking-widest text-secondary">ENTRY NO. {step.number}</p>
                <p className="mt-2 font-serif text-xl">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <Reveal as="section" stagger=".stat-item" className="px-6 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-item">
              <p className="tabular-figures text-3xl text-primary/80 dark:text-primary md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="px-6 py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <h2 className="font-serif text-3xl md:text-5xl">Prefer to manage everything from WhatsApp?</h2>
          <p className="max-w-xl text-muted-foreground">
            Once you're a RelaTax client, your reports, taxes, invoices and documents are all one WhatsApp message
            away — no app to install, no portal to remember.
          </p>
          <a href="https://wa.me/254115581898" target="_blank" rel="noreferrer">
            <Button size="lg">Chat on WhatsApp</Button>
          </a>
        </div>
      </Reveal>
      </LedgerPageTransition>
    </>
  );
}
