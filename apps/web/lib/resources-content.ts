export interface ResourceTableRow {
  cells: string[];
}

export interface ResourceTable {
  type: "table";
  headers: string[];
  rows: ResourceTableRow[];
  note?: string;
}

export interface ResourceParagraph {
  type: "paragraph";
  heading?: string;
  body: string;
}

export interface ResourceList {
  type: "list";
  heading?: string;
  items: string[];
}

export type ResourceSection = ResourceTable | ResourceParagraph | ResourceList;

export interface ResourcePost {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  sections: ResourceSection[];
}

export const resourcePosts: ResourcePost[] = [
  {
    slug: "kenya-tax-filing-deadlines",
    title: "Kenya tax filing deadlines",
    summary: "The recurring dates that keep a Kenyan business compliant — VAT, PAYE, corporation tax, and the statutory deductions that ride alongside payroll.",
    updated: "26 July 2026",
    sections: [
      {
        type: "paragraph",
        body: "KRA does not send reminders. Deadlines are automatic — miss one and penalties and interest apply immediately, with no grace period and no appeal for the lateness itself. The dates below are the ones a business actually has to track month to month."
      },
      {
        type: "table",
        headers: ["Tax / obligation", "Frequency", "Due date"],
        rows: [
          { cells: ["VAT", "Monthly", "20th of the following month — a nil return is still required with no transactions."] },
          { cells: ["PAYE", "Monthly", "9th of the following month."] },
          { cells: ["Statutory deductions (NSSF, SHIF, Housing Levy)", "Monthly", "Remitted alongside PAYE, on the same monthly cadence."] },
          { cells: ["Corporation tax — instalments", "Quarterly", "20th of the 4th, 6th, 9th and 12th months of the accounting year."] },
          { cells: ["Corporation tax — annual return", "Annual", "6 months after financial year-end (30 June, for a 31 December year-end)."] },
          { cells: ["Individual income tax — payment", "Annual", "30 April, for the year ended the previous 31 December."] },
          { cells: ["Individual income tax — return", "Annual", "30 June, for the year ended the previous 31 December."] }
        ]
      },
      {
        type: "paragraph",
        heading: "Why PAYE penalties bite hardest",
        body: "PAYE carries a steeper penalty than most other tax types — 25% of the unpaid amount, applied from the day after the deadline with no partial grace. A KES 80,000 PAYE liability paid a single day late attracts a KES 20,000 penalty on top of the tax owed. Because it's deducted from employee pay rather than the business's own funds, KRA treats late remittance as more serious than a business simply owing its own tax late."
      },
      {
        type: "paragraph",
        heading: "Keeping this off your own calendar",
        body: "This is exactly the kind of recurring compliance work RelaTax handles for clients — filings tracked and submitted on schedule, with the client notified once each is settled rather than left to watch a calendar."
      }
    ]
  },
  {
    slug: "understanding-paye-bands",
    title: "Understanding PAYE bands",
    summary: "A plain-language walkthrough of Kenya's PAYE structure — five bands, personal relief, and how taxable income is actually calculated.",
    updated: "26 July 2026",
    sections: [
      {
        type: "paragraph",
        body: "PAYE in Kenya is progressive — each band of income is taxed at its own rate, not the whole salary at the top rate reached. The top two bands (32.5% and 35%) were introduced by the Finance Act 2023 and only apply to the portion of income above KES 500,000 a month."
      },
      {
        type: "table",
        headers: ["Monthly taxable income", "Rate"],
        rows: [
          { cells: ["First KES 24,000", "10%"] },
          { cells: ["Next KES 8,333 (24,001 – 32,333)", "25%"] },
          { cells: ["32,334 – 500,000", "30%"] },
          { cells: ["500,001 – 800,000", "32.5%"] },
          { cells: ["Above 800,000", "35%"] }
        ]
      },
      {
        type: "paragraph",
        heading: "Personal relief",
        body: "Every resident individual taxpayer is entitled to personal relief of KES 2,400 a month (KES 28,800 a year), deducted directly from the tax calculated above — not from income before the bands are applied."
      },
      {
        type: "list",
        heading: "Getting from gross salary to taxable income",
        items: [
          "Start with gross salary.",
          "Subtract NSSF: 6% of the first KES 9,000 (Tier I), plus 6% of gross between KES 9,001 and KES 108,000 (Tier II).",
          "Subtract the Housing Levy: 1.5% of gross salary.",
          "The result is taxable income — the bands above apply to this figure, not to gross pay.",
          "Apply personal relief (KES 2,400/month) to the tax calculated, to arrive at final PAYE due."
        ]
      },
      {
        type: "paragraph",
        body: "Employers file and remit PAYE through the KRA iTax portal by the 9th of the following month. Getting the NSSF/Housing Levy deductions right before applying the bands is the step most payroll errors trace back to."
      }
    ]
  },
  {
    slug: "ifrs-for-smes-explained",
    title: "IFRS for SMEs, explained",
    summary: "What IFRS-aligned reporting actually means for your business, and why it's often the right standard even if you're not a public company.",
    updated: "26 July 2026",
    sections: [
      {
        type: "paragraph",
        body: "IFRS for SMEs is a standard the IASB built specifically for private companies — a simplified, less costly alternative to full IFRS, for businesses that still need to produce proper general-purpose financial statements but don't answer to public shareholders."
      },
      {
        type: "paragraph",
        heading: "Who it's actually for in Kenya",
        body: "Private companies, partnerships and sole proprietorships without public accountability can elect either full IFRS or IFRS for SMEs — the choice comes down to who actually reads the financials. A business with foreign investors, an international lender, or acquisition ambitions often benefits from staying closer to full IFRS; a locally-owned business with a bank relationship and a board is usually well served by the SME standard."
      },
      {
        type: "paragraph",
        heading: "Why it matters practically",
        body: "IFRS for SMEs meaningfully reduces the compliance burden compared to full IFRS, while keeping statements credible and comparable to lenders, investors and auditors — including internationally, since the standard is globally recognised. For a business chasing funding or a credit line, financials prepared on a real standard (rather than an ad-hoc internal format) are frequently the difference between a fast yes and a stalled application."
      },
      {
        type: "paragraph",
        heading: "What's changing",
        body: "The IASB released a third edition of IFRS for SMEs in February 2025, effective for periods starting on or after 1 January 2027 (with early adoption allowed). Businesses currently reporting under the standard should expect their accountant to flag the transition well before it's mandatory, not after."
      }
    ]
  },
  {
    slug: "getting-started-with-etims",
    title: "Getting started with eTIMS",
    summary: "What KRA's eTIMS system requires and how RelaTax handles it for you.",
    updated: "26 July 2026",
    sections: [
      {
        type: "paragraph",
        body: "eTIMS (the Electronic Tax Invoice Management System) is KRA's requirement for issuing electronic invoices — and it applies far more broadly than VAT registration alone. Even a business that isn't VAT-registered is required to issue e-invoices for its sales. Landlords are included too: any rental income above KES 288,000 a year (KES 24,000 a month) triggers the requirement."
      },
      {
        type: "paragraph",
        heading: "What you need before registering",
        body: "Your business needs the ability to generate and share electronic invoices, and the right supporting document for your business structure — a copy of a valid Kenyan national ID for a sole proprietorship, or the partnership deed for a partnership."
      },
      {
        type: "list",
        heading: "Registering, step by step",
        items: [
          "Log into iTax with your KRA PIN and password.",
          "Navigate to the eTIMS menu and start the registration process.",
          "Choose the option that fits your business: eTIMS Lite (manual entry, no POS needed), eTIMS Client (installed software), or System-to-System integration (direct POS/ERP connection for higher transaction volumes).",
          "Start issuing every sales invoice through the system from day one — retrofitting past transactions is far harder than starting clean."
        ]
      },
      {
        type: "paragraph",
        heading: "Why this isn't optional anymore",
        body: "From the 2026 Year of Income, all declared income and expenses must be backed by valid electronic tax invoices — meaning eTIMS compliance now directly affects what a business can even claim as a deductible expense. Enforcement has intensified alongside it: non-compliance now carries penalties of up to KES 1,000,000 or imprisonment."
      },
      {
        type: "paragraph",
        heading: "Where RelaTax fits in",
        body: "eTIMS invoicing is part of our Accounting & Bookkeeping service — we set it up correctly the first time and keep every invoice compliant as your transaction volume grows, so this stays off your plate entirely."
      }
    ]
  }
];

export function getResourcePost(slug: string): ResourcePost | undefined {
  return resourcePosts.find((p) => p.slug === slug);
}
