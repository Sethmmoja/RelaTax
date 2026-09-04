import { CONTACT, SITE_NAME, SITE_URL } from "../../lib/seo";

/**
 * JSON-LD blocks. These are server-rendered <script type="application/ld+json">
 * tags — the format Google actually reads — rather than client-injected, so
 * they're present in the initial HTML a crawler sees.
 *
 * `JSON.stringify` output is escaped before being written into the script, so
 * a "</script>" sequence appearing in any value can't terminate the tag early.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/**
 * ProfessionalService is a subtype of LocalBusiness, so this single node
 * satisfies both the organization and local-business cases without emitting
 * two competing descriptions of the same entity.
 */
export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        description:
          "Fractional accounting, tax compliance and payroll services for businesses in Kenya and East Africa.",
        url: SITE_URL,
        email: CONTACT.email,
        telephone: CONTACT.phone,
        logo: `${SITE_URL}/relatax-logo.png`,
        image: `${SITE_URL}/opengraph-image`,
        priceRange: "$$",
        address: {
          "@type": "PostalAddress",
          addressLocality: CONTACT.city,
          addressCountry: CONTACT.country
        },
        areaServed: [
          { "@type": "Country", name: "Kenya" },
          { "@type": "Place", name: "East Africa" }
        ],
        knowsAbout: [
          "Fractional accounting",
          "Tax compliance",
          "KRA filings",
          "eTIMS invoicing",
          "Payroll processing",
          "PAYE",
          "VAT returns"
        ],
        sameAs: [`https://wa.me/${CONTACT.phone.replace("+", "")}`]
      }}
    />
  );
}

/** Tells search engines the site's name and where its search/entry point lives. */
export function WebSiteSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-KE"
      }}
    />
  );
}

export interface Crumb {
  name: string;
  /** Path with a leading slash. Omitted on the current page, which is not a link. */
  href?: string;
}

/**
 * Mirrors the visible breadcrumb trail. Google requires the markup to match
 * what's on the page, so both are driven from the same array by <Breadcrumbs>.
 */
export function BreadcrumbSchema({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.name,
          ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {})
        }))
      }}
    />
  );
}

/**
 * Converts a human-written date ("26 July 2026") to the ISO date schema.org
 * requires. Built from local parts rather than toISOString(), which converts to
 * UTC first and would report the previous day for any timezone ahead of it —
 * in EAT (UTC+3) "26 July" silently becomes 2026-07-25. Returns undefined for
 * anything unparseable so a bad string omits the field instead of emitting
 * "Invalid Date".
 */
function toIsoDate(value: string): string | undefined {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

export function ArticleSchema({
  headline,
  description,
  path,
  updated
}: {
  headline: string;
  description: string;
  path: string;
  updated: string;
}) {
  const iso = toIsoDate(updated);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline,
        description,
        mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` },
        author: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...(iso ? { datePublished: iso, dateModified: iso } : {}),
        inLanguage: "en-KE"
      }}
    />
  );
}

export function FaqSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer }
        }))
      }}
    />
  );
}
