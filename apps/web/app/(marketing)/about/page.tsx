const credentials = [
  "ACCA, CPA-certified team members",
  "IFRS and IFRS for SMEs reporting specialists",
  "Multi-currency project and donor reporting",
  "Zoho Books, QuickBooks, Sage and Odoo certified"
];

const principles = [
  { title: "Precision", description: "Numbers must tie. Filings must be on time. Files must be audit-ready. Always." },
  { title: "Partnership", description: "We sit on your side of the table. Your wins are our scorecard." },
  { title: "Plain speech", description: "Accounting translated into language operators can act on — no jargon walls." },
  { title: "Pragmatism", description: "We pick the simplest tool, the lightest control, the clearest report. Sophistication earned, not assumed." }
];

const team = [
  {
    role: "Managing Director",
    tag: "ENGAGEMENT LEAD",
    bio: "3+ years across fractional accounting, tax compliance, advisory, M&A, eTIMS rollouts and payroll processing."
  },
  {
    role: "Head of Accounting Services",
    tag: "SERVICE DELIVERY LEAD",
    bio: "2+ years supporting SMEs, NGOs and consulting firms with bookkeeping, payroll, donor reporting and tooling."
  }
];

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="font-serif text-4xl md:text-6xl">About RelaTax</h1>
      <p className="mt-6 text-lg text-muted-foreground">
        RelaTax was founded to give growing businesses in Kenya and East Africa access to senior finance expertise —
        without the overhead of hiring a full in-house finance team. We work as an extension of your business:
        fractional accountants, tax advisors and payroll specialists who show up like partners, not vendors.
      </p>
      <p className="mt-4 text-lg text-muted-foreground">
        Every engagement starts with understanding how your business actually runs, then builds a reporting and
        compliance rhythm around it — IFRS-aligned reporting, KRA &amp; eTIMS-ready filings, and a WhatsApp assistant
        that puts your numbers in your pocket.
      </p>
      <p className="mt-4 text-lg text-muted-foreground">Built for people who value precision.</p>

      <div className="mt-16">
        <span className="text-xs font-semibold tracking-widest text-primary">CREDENTIALS</span>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {credentials.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-foreground/80">
              <span className="text-primary">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-16">
        <span className="text-xs font-semibold tracking-widest text-primary">WHAT WE BELIEVE</span>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl">Four principles, applied every day.</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {principles.map((p) => (
            <div key={p.title}>
              <p className="font-medium">{p.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <span className="text-xs font-semibold tracking-widest text-primary">THE TEAM</span>
        <h2 className="mt-2 font-serif text-3xl md:text-4xl">Senior leads on every engagement.</h2>
        <p className="mt-4 text-muted-foreground">
          You&apos;ll work directly with experienced partners — not handed off to junior staff.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {team.map((member) => (
            <div key={member.role} className="rounded-lg border border-border bg-card p-6 shadow-soft">
              <p className="font-medium">{member.role}</p>
              <p className="mt-1 text-xs font-semibold tracking-wide text-primary">{member.tag}</p>
              <p className="mt-3 text-sm text-muted-foreground">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
