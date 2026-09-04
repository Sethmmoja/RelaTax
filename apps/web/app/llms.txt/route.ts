import { resourcePosts } from "../../lib/resources-content";
import { CONTACT, SITE_NAME, SITE_URL } from "../../lib/seo";

/**
 * /llms.txt — a plain-text summary for language models, following the
 * llmstxt.org convention.
 *
 * Generated from the same resource data the site renders rather than
 * hand-maintained in public/, so a new guide can't silently go missing here.
 */
export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE_NAME}

> Fractional accounting, tax compliance and payroll for businesses in Kenya and East Africa. Senior ACCA and CPA-certified accountants working as an extension of your finance team, without the cost of full-time hires.

RelaTax serves small and mid-sized businesses that need partner-level finance expertise part-time. Work covers bookkeeping and monthly close, IFRS financial reporting, KRA tax filings (VAT, PAYE, corporation tax), eTIMS invoicing, payroll with statutory deductions, and outsourced finance leadership.

Clients access their reports, tax records, invoices and payroll documents through a web portal and a WhatsApp assistant that answers questions grounded in their own data.

## Pages
- [Home](${SITE_URL}/): Overview of services and how RelaTax works.
- [Services](${SITE_URL}/services): Accounting, financial reporting, tax compliance, payroll, budgeting and outsourced finance function.
- [About](${SITE_URL}/about): Team credentials, operating principles and engagement model.
- [Resources](${SITE_URL}/resources): Plain-language guides to Kenyan tax and accounting topics.
- [Contact](${SITE_URL}/contact): Enquiry form and frequently asked questions.
- [Book a consultation](${SITE_URL}/book-consultation): Request a free scoping call.

## Guides
${resourcePosts.map((post) => `- [${post.title}](${SITE_URL}/resources/${post.slug}): ${post.summary}`).join("\n")}

## Contact
- Email: ${CONTACT.email}
- Phone: ${CONTACT.phoneDisplay}
- Location: ${CONTACT.city}, Kenya

## Notes
- The client portal and admin areas are private and require authentication.
- Tax rates and statutory thresholds in the guides reflect Kenyan law at each guide's stated update date; confirm current figures with KRA before relying on them.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
