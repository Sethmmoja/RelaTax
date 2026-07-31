import { NextRequest, NextResponse } from "next/server";

/**
 * UX-level route gating only — NOT the security boundary. Auth tokens live in
 * localStorage (never a cookie), so this can't verify a real JWT at the edge;
 * it just reads a small non-httpOnly hint cookie (`relatax_role`, set by
 * AuthProvider right after /users/me succeeds) to avoid flashing the admin
 * shell at a logged-out or client visitor. The real boundary is every API
 * call's own JwtAuthGuard/RolesGuard/BusinessMemberGuard, which staff and
 * client requests both hit regardless of what this middleware decides.
 */
export function middleware(request: NextRequest) {
  const role = request.cookies.get("relatax_role")?.value;

  if (request.nextUrl.pathname.startsWith("/admin") && role !== "staff") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (request.nextUrl.pathname.startsWith("/portal") && !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"]
};
