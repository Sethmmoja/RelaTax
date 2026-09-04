import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@relatax/ui";
import Link from "next/link";
import { Reveal } from "../../../components/motion/Reveal";
import { pageMetadata } from "../../../lib/seo";
import { Breadcrumbs } from "../../../components/marketing/Breadcrumbs";

const services = [
  {
    title: "Accounting & Bookkeeping",
    description: "Monthly reconciliations, ledger maintenance, and clean books ready for any audit.",
    items: [
      "Bank, cash and mobile money reconciliations",
      "Fixed asset register and depreciation",
      "Monthly close checklist with audit-ready files",
      "eTIMS invoicing",
      "Donor and grant compliance reporting"
    ]
  },
  {
    title: "Financial Reporting",
    description: "P&L, Balance Sheet, Cash Flow and Trial Balance, delivered on your reporting cadence.",
    items: ["IFRS-aligned annual financial statements", "Variance commentary and KPI dashboards", "Investor and board reporting packs"]
  },
  {
    title: "Tax Compliance & Advisory",
    description: "VAT, PAYE and Corporation Tax — filed on time, explained in plain language.",
    items: ["eTIMS implementation and ongoing support", "Tax health checks and risk reviews", "KRA audit defence and ADR support"]
  },
  {
    title: "Payroll",
    description: "End-to-end payroll processing with statutory deductions and payslips handled.",
    items: ["PAYE, NSSF, SHIF and HELB filings & remittances", "Leave, benefits and final dues calculations", "Year-end P9 forms and reconciliation"]
  },
  {
    title: "Budgeting & Forecasting",
    description: "Plans, models and cash visibility that keep the business in control.",
    items: ["Annual budgets and rolling forecasts", "13-week cash-flow models", "Actuals vs budget review meetings"]
  },
  {
    title: "Outsourced Finance Function",
    description: "When you want to skip building an in-house team altogether.",
    items: ["Dedicated fractional Finance Lead", "Pool of senior accountants on tap", "Tooling setup: Xero, QuickBooks, Zoho"]
  }
];

const tiers = [
  {
    name: "Essentials",
    tag: "FOR EARLY-STAGE TEAMS",
    description: "Monthly bookkeeping, statutory filings and management accounts.",
    items: ["Monthly close", "VAT, PAYE, WHT filings", "Quarterly review call"]
  },
  {
    name: "Growth",
    tag: "MOST POPULAR",
    description: "A fractional Finance Manager driving reporting, payroll and controls.",
    items: ["All of Essentials", "Payroll for up to 20 staff", "Budgets & cash forecasting", "Monthly strategy call"]
  },
  {
    name: "Scale",
    tag: "FOR FUNDED BUSINESSES",
    description: "A fractional accounting pool acting as your full department.",
    items: ["All of Growth", "Board & investor packs", "Audit & due diligence support", "Controls & SoP build-out"]
  }
];

export const metadata = pageMetadata({
  title: "Accounting, Tax & Payroll Services",
  description:
    "Bookkeeping, financial reporting, VAT and PAYE filings, eTIMS invoicing, payroll and outsourced finance leadership — priced to your transaction volume.",
  path: "/services"
});

export default function ServicesPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <Breadcrumbs crumbs={[{ name: "Services" }]} />
      <h1 className="font-serif text-4xl md:text-6xl">Accounting, Tax &amp; Payroll Services</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        One partner for accounting, tax compliance and payroll — sized to your stage.
      </p>
      <Reveal stagger=".service-card" className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <Card key={s.title} className="service-card">
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{s.description}</p>
              {s.items.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-sm text-foreground/80">
                  {s.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </Reveal>

      <div className="mt-24">
        <span className="text-xs font-semibold tracking-widest text-primary">ENGAGEMENT MODELS</span>
        <h2 className="mt-2 font-serif text-3xl md:text-5xl">Flexible by design.</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Pick the rhythm that fits where you are today. Switch as you grow.
        </p>
        <Reveal stagger=".tier-card" className="mt-10 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.name} className={`tier-card ${tier.tag === "MOST POPULAR" ? "border-primary" : ""}`}>
              <CardHeader>
                <Badge variant={tier.tag === "MOST POPULAR" ? "default" : "outline"}>{tier.tag}</Badge>
                <CardTitle className="mt-3">{tier.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-foreground/80">
                  {tier.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/contact#tell-us-about-your-business" className="mt-6 block">
                  <Button className="w-full" variant={tier.tag === "MOST POPULAR" ? "primary" : "outline"}>
                    Get a quote
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </Reveal>
        <p className="mt-6 text-sm text-muted-foreground">Pricing is tailored to transaction volume and complexity.</p>
      </div>
    </section>
  );
}
