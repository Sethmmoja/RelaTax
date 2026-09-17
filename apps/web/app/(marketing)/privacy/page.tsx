import { pageMetadata } from "../../../lib/seo";
import { LegalPage, LegalSection } from "../legal-page";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How RelaTax collects, uses, stores and protects personal data under Kenya's Data Protection Act, 2019 — and the rights you have over it.",
  path: "/privacy"
});

const sections: LegalSection[] = [
  {
    heading: "Who we are",
    paragraphs: [
      "RelaTax provides fractional accounting, tax compliance and payroll services to businesses in Kenya and East Africa through this website, the client portal and our WhatsApp assistant. For the purposes of the Data Protection Act, 2019 (Kenya) we are the data controller for information about our clients and website visitors, and a data processor for the employee and customer data our clients entrust to us in the course of the service.",
      "Questions about this policy or your data go to info@relatax.org."
    ]
  },
  {
    heading: "What we collect",
    bullets: [
      "Contact details you give us: name, email address, phone number, company and sector when you enquire, book a consultation or open an account.",
      "Account and portal data: login credentials (stored as one-way hashes), the businesses you belong to, documents you upload, invoices, tax records, payroll runs and the messages you exchange with the assistant.",
      "Employee data our clients provide for payroll: names, national ID and KRA PIN numbers, statutory registration numbers, bank details and pay.",
      "Technical data: IP address, browser type and the pages you visit, used for security and to keep the service working.",
      "Data from connected services you choose to link, such as Google Drive folders or QuickBooks, limited to the folders and scopes you authorise."
    ]
  },
  {
    heading: "Why we use it",
    bullets: [
      "To deliver the service: keeping your books, preparing and filing returns with KRA, running payroll and producing reports.",
      "To respond to enquiries and consultations you request.",
      "To secure the service: authenticating you, preventing fraud and abuse, and keeping an audit trail of actions taken in the portal.",
      "To meet our legal obligations, including record-keeping duties under Kenyan tax and company law.",
      "To improve the service, using aggregated usage data that does not identify you."
    ],
    paragraphs: [
      "We do not sell personal data, and we do not use it for advertising. Where we rely on your consent — for example to link a Google Drive account — you can withdraw it at any time by disconnecting the service in the portal."
    ]
  },
  {
    heading: "The AI assistant",
    paragraphs: [
      "The assistant in the portal and on WhatsApp answers from your own business's documents and records, from RelaTax's published guidance, and from the current status of your filings. It only retrieves information belonging to the business you are asking about. Conversations are logged so we can review the assistant's answers for accuracy and improve them; they are not shared with other clients."
    ]
  },
  {
    heading: "Who we share it with",
    bullets: [
      "The Kenya Revenue Authority and other statutory bodies (NSSF, SHA, the Affordable Housing Levy) when filing on your behalf.",
      "Service providers who host and run the platform on our behalf — server hosting, file storage, email delivery and messaging — under contracts that restrict them to processing data on our instructions.",
      "Connected services you authorise, such as Google or Intuit, to the extent needed to import or sync your data.",
      "Professional advisers, auditors or authorities where the law requires it."
    ],
    paragraphs: [
      "Some providers store data outside Kenya. Where they do, we rely on the safeguards permitted by the Data Protection Act — including contractual protections and the provider's own certifications — and we keep the list of providers available on request."
    ]
  },
  {
    heading: "How long we keep it",
    paragraphs: [
      "Accounting, tax and payroll records are kept for the period Kenyan law requires — currently at least five years for tax records and seven for company records — even after an engagement ends, because we or you may need them for a KRA audit. Enquiry data that does not lead to an engagement is deleted within twelve months. Account data is deleted within ninety days of a closure request, subject to those statutory retention periods."
    ]
  },
  {
    heading: "How we protect it",
    bullets: [
      "Encryption in transit for every connection and at rest for stored files.",
      "Passwords stored as salted one-way hashes; optional two-factor authentication on accounts.",
      "Payslips delivered as password-protected PDFs that only the named employee can open.",
      "Role-based access: staff see only the businesses they are assigned to, and every access to a document is logged.",
      "Regular backups held separately from the live system."
    ]
  },
  {
    heading: "Your rights",
    paragraphs: [
      "Under the Data Protection Act you may ask us to confirm what personal data we hold about you, to correct it, to delete it where we no longer need it, to restrict or object to particular processing, and to receive a copy in a portable format. You may also complain to the Office of the Data Protection Commissioner. To exercise any of these rights, email info@relatax.org; we respond within the statutory timeframe and will ask you to verify your identity first."
    ]
  },
  {
    heading: "Cookies",
    paragraphs: [
      "The site uses no advertising or analytics cookies. The portal sets one cookie, which records whether you are signed in as staff or as a client so that the correct area of the site loads; it holds no personal data and expires when you sign out. Your session itself is kept in your browser's local storage, not in a cookie. Because none of this is optional to the service, there is no cookie banner to dismiss."
    ]
  },
  {
    heading: "Changes",
    paragraphs: [
      "When this policy changes materially we will note the new effective date here and, for account holders, tell you in the portal. Continued use of the service after that date means the updated policy applies."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="17 September 2026"
      intro="This policy explains what personal data RelaTax collects, why, who it is shared with and the rights you have over it. It is written to comply with Kenya's Data Protection Act, 2019, and in plain language."
      sections={sections}
    />
  );
}
