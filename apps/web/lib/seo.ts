import type { Metadata } from "next";

/**
 * Absolute site origin. Canonical URLs, sitemap entries and Open Graph tags
 * must all be absolute, so this is the single place that knows the domain.
 * Overridable for staging so a preview deploy never emits canonicals pointing
 * at production (which would tell Google to index the wrong host).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://relatax.org").replace(/\/$/, "");

export const SITE_NAME = "RelaTax";
export const SITE_TAGLINE = "Fractional Accounting, Tax & Payroll";

/**
 * The share card. Declared explicitly rather than relying on Next's
 * file-based `opengraph-image` convention: any page that sets its own
 * `openGraph` object — which every page here does, to carry a canonical URL —
 * replaces the inherited one, and the image silently drops out with it.
 */
export const OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image.png`,
  width: 1200,
  height: 630,
  alt: "RelaTax — every filing, accounted for. Fractional accounting, tax compliance and payroll for Kenya and East Africa."
} as const;

export const CONTACT = {
  email: "info@relatax.org",
  phone: "+254115581898",
  phoneDisplay: "+254 115 581 898",
  city: "Nairobi",
  country: "KE"
} as const;

interface PageMetaInput {
  title: string;
  description: string;
  /** Path with a leading slash, e.g. "/services". Used for the canonical URL. */
  path: string;
  /** Utility pages (token links, auth screens) that should stay out of search results. */
  noIndex?: boolean;
}

/**
 * Builds a page's metadata with a canonical URL and social tags derived from
 * one definition, so title/description/canonical/OG can't drift apart.
 */
export function pageMetadata({ title, description, path, noIndex }: PageMetaInput): Metadata {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_KE",
      type: "website",
      images: [OG_IMAGE]
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [OG_IMAGE.url]
    }
  };
}
