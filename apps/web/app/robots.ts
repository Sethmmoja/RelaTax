import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";

/**
 * The portal and admin areas hold client financial data. They're already behind
 * authentication, so this is defence in depth rather than the control itself —
 * it stops well-behaved crawlers from queueing URLs they'd only ever get a
 * login redirect from, and keeps those paths out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/portal/", "/admin/", "/auth/", "/reset-password", "/verify-email", "/forgot-password"]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
