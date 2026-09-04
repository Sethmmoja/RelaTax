/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@relatax/ui", "@relatax/types"],
  reactStrictMode: true,
  output: "standalone",

  // No browser source maps in production. This is Next's default, but it is
  // set explicitly because the cost of it silently flipping is shipping
  // readable application source — including the shape of internal API calls —
  // to anyone who opens devtools on the live site.
  productionBrowserSourceMaps: false,

  // Drops the `X-Powered-By: Next.js` response header, which volunteers the
  // framework and version to anyone fingerprinting the stack.
  poweredByHeader: false,

  // Rewrites bare `import { Icon } from "lucide-react"` into per-icon module
  // imports at build time, so a page pulling two icons doesn't pull the
  // barrel file's entire export graph.
  experimental: {
    optimizePackageImports: ["lucide-react", "@relatax/ui"]
  }
};

export default nextConfig;
