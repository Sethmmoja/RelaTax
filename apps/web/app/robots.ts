import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";

/**
 * Only two kinds of path are blocked here, and the distinction matters:
 *
 * - `/portal/`, `/admin/` and `/auth/` are gated or machine-only. An
 *   unauthenticated crawler gets a login redirect or a callback handler, never
 *   content, so blocking the crawl saves budget and costs nothing.
 *
 * - The auth *screens* (`/login`, `/forgot-password`, `/reset-password`,
 *   `/verify-email`) are publicly reachable and render real markup, so they are
 *   deliberately NOT listed. They carry `noindex` instead. Disallowing them
 *   would be counterproductive: a blocked URL is never fetched, so the crawler
 *   never reads the noindex, and a page linked from elsewhere (as /login and
 *   /forgot-password both are) can still be listed as a bare URL. Allowing the
 *   crawl is what lets the noindex actually take effect.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/portal/", "/admin/", "/auth/"]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
