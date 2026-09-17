import { NextRequest, NextResponse } from "next/server";

/**
 * Two jobs, both per-request:
 *
 * 1. A nonce-based Content Security Policy. Every page render gets a fresh
 *    nonce; Next stamps it onto its own inline scripts (it reads the CSP
 *    header we put on the *request*), the root layout hands it to
 *    next-themes for its theme script, and `strict-dynamic` lets those
 *    trusted scripts load the chunks they need. Anything else that tries to
 *    run script — an injected tag, an inline handler — is refused by the
 *    browser. This is the layer that turns a would-be XSS into a console
 *    error. The cost: pages are rendered per request rather than served as
 *    prebuilt HTML, because a build-time page can't contain a per-request
 *    nonce. On this site's page weights that's a few milliseconds on the
 *    server.
 *
 * 2. UX-level route gating for /admin and /portal — NOT the security
 *    boundary. Auth tokens live in localStorage (never a cookie), so this
 *    can't verify a real JWT at the edge; it just reads a small non-httpOnly
 *    hint cookie (`relatax_role`, set by AuthProvider right after /users/me
 *    succeeds) to avoid flashing the admin shell at a logged-out or client
 *    visitor. The real boundary is every API call's own JwtAuthGuard /
 *    RolesGuard / BusinessMemberGuard.
 */

const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").origin;
const IS_DEV = process.env.NODE_ENV !== "production";

function buildCsp(nonce: string): string {
  // Dev only: HMR evaluates code and talks over a websocket, and local
  // MinIO serves document previews over plain http on :9000.
  const dev = IS_DEV ? { script: " 'unsafe-eval'", connect: " ws: wss: http://localhost:9000", media: " http://localhost:9000" } : null;

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev?.script ?? ""}`,
    // GSAP and React write inline `style` attributes; those need
    // 'unsafe-inline' for styles. It does not extend to scripts, which is
    // where the risk lives.
    "style-src 'self' 'unsafe-inline'",
    // Client logos and document previews are served from object storage
    // (Cloudflare R2 in production) via presigned URLs on an https origin
    // that isn't fixed in code.
    `img-src 'self' data: blob: https:${dev?.media ?? ""}`,
    `frame-src 'self' https:${dev?.media ?? ""}`,
    "font-src 'self'",
    `connect-src 'self' ${API_ORIGIN}${dev?.connect ?? ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:"
  ];
  if (!IS_DEV) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("relatax_role")?.value;

  if (pathname.startsWith("/admin") && role !== "staff") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname.startsWith("/portal") && !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // On the request, so Next applies the nonce to the scripts it emits and
  // the layout can read it; on the response, so the browser enforces it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Every page, but not static assets (they carry no scripts to protect,
    // and a policy header on a font file is wasted bytes) and not router
    // prefetches (they're not rendered as documents).
    {
      source: "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2|txt|xml|json)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" }
      ]
    }
  ]
};
