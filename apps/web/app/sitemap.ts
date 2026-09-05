import type { MetadataRoute } from "next";
import { resourcePosts } from "../lib/resources-content";
import { SITE_URL } from "../lib/seo";

/**
 * Only publicly indexable marketing pages belong here. The client portal and
 * admin portal are behind auth, and the token-based auth screens (reset
 * password, verify email) are marked noIndex — listing any of them would ask
 * search engines to crawl pages they can't reach or shouldn't surface.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/services", priority: 0.9, changeFrequency: "monthly" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
    { path: "/book-consultation", priority: 0.6, changeFrequency: "yearly" },
    { path: "/resources", priority: 0.8, changeFrequency: "weekly" }
    // /login is deliberately absent: it is noindex, and listing a page in the
    // sitemap asks search engines to index it — the two directives would
    // contradict each other.
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority
    })),
    ...resourcePosts.map((post) => ({
      url: `${SITE_URL}/resources/${post.slug}`,
      // Falls back to now if a post's hand-written date can't be parsed, so a
      // typo degrades to a stale-but-valid timestamp rather than an invalid one.
      lastModified: Number.isNaN(new Date(post.updated).getTime()) ? lastModified : new Date(post.updated),
      changeFrequency: "yearly" as const,
      priority: 0.6
    }))
  ];
}
