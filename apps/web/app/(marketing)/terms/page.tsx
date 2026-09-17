import { pageMetadata } from "../../../lib/seo";
import { LegalPage, LegalSection } from "../legal-page";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms on which RelaTax provides fractional accounting, tax compliance and payroll services, the client portal and the WhatsApp assistant.",
  path: "/terms"
});

const sections: LegalSection[] = [
  {
    heading: "The agreement",
    paragraphs: [
      "These terms govern your use of the RelaTax website, client portal and WhatsApp assistant, and the accounting, tax and payroll services we provide. Each client engagement is also covered by an engagement letter that sets out the specific scope, fees and start date; where the two differ, the engagement letter applies. By creating an account or using the service you accept these terms on behalf of the business you represent."
    ]
  },
  {
    heading: "What we provide",
    bullets: [
      "Bookkeeping, reconciliations and financial reporting on the cadence agreed in your engagement letter.",
      "Preparation and filing of VAT, PAYE, corporation tax and other statutory returns with the Kenya Revenue Authority, based on the records you give us.",
      "Payroll processing, including statutory deductions, and delivery of payslips to your employees.",
      "The client portal and WhatsApp assistant for access to your documents, reports and filing status.",
      "Advisory support as described in your engagement letter."
    ],
    paragraphs: [
      "The AI assistant gives answers drawn from your records and our published guidance. It is an aid to finding information, not a substitute for advice from your named RelaTax accountant, and figures it quotes should be confirmed against the underlying report before you act on them."
    ]
  },
  {
    heading: "What we need from you",
    bullets: [
      "Complete, accurate and timely records: source documents, bank statements, sales data and employee details, by the dates we agree.",
      "Prompt answers to our queries, since filing deadlines are fixed by law and cannot move.",
      "Keeping your login details confidential and telling us at once if you believe an account has been compromised.",
      "Confirming that you are entitled to share any employee or customer data you upload, and that you have given the notices the Data Protection Act requires.",
      "Payment of fees on the terms in your engagement letter."
    ]
  },
  {
    heading: "Filings and deadlines",
    paragraphs: [
      "We file on time when we receive complete records by the agreed cut-off. Where records arrive late or incomplete, we will tell you what is missing and file as soon as we can, but penalties and interest arising from late or inaccurate information you supplied remain your responsibility. Where a penalty results from our error, we bear it."
    ]
  },
  {
    heading: "Fees",
    paragraphs: [
      "Fees are set out in your engagement letter and invoiced monthly unless agreed otherwise. Invoices are payable within fourteen days. We may suspend the portal and pause filings for accounts more than thirty days overdue, after giving notice, and we may revise fees with thirty days' written notice."
    ]
  },
  {
    heading: "Confidentiality and data",
    paragraphs: [
      "We treat everything you share with us as confidential and use it only to provide the service, as described in our Privacy Policy. You keep ownership of your data; we hold a licence to process it for the purposes of the engagement. On termination you may export your documents and reports from the portal, and we retain records for the periods Kenyan law requires."
    ]
  },
  {
    heading: "Acceptable use",
    bullets: [
      "Do not upload material you have no right to share, or content that is unlawful or malicious.",
      "Do not attempt to access another business's data, probe the service for weaknesses or interfere with its operation.",
      "Do not use the assistant to generate filings or figures for a business that is not a RelaTax client."
    ]
  },
  {
    heading: "Liability",
    paragraphs: [
      "We carry out the service with the skill and care expected of a professional accounting practice in Kenya. Our total liability to you in any twelve-month period is limited to the fees you paid us in that period, except for liability that cannot lawfully be limited, such as fraud. We are not liable for losses caused by inaccurate or late information you supplied, by third-party services you connected, or by events outside our reasonable control."
    ]
  },
  {
    heading: "Ending the engagement",
    paragraphs: [
      "Either of us may end the engagement with thirty days' written notice. We may end it sooner if fees remain unpaid after notice or if you breach these terms. On ending, we complete any filing already in progress where records are complete, hand over your records, and close portal access after the export period."
    ]
  },
  {
    heading: "Governing law",
    paragraphs: [
      "These terms are governed by the laws of Kenya. Disputes we cannot resolve between us will be referred to the courts of Kenya, after a genuine attempt at mediation in Nairobi."
    ]
  }
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="17 September 2026"
      intro="The terms on which RelaTax provides its services and you use the portal and assistant. Your engagement letter adds the specifics for your business."
      sections={sections}
    />
  );
}
