import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { ThemeProvider } from "../lib/theme-provider";
import { AuthProvider } from "../lib/auth-context";
import { OG_IMAGE, SITE_NAME, SITE_TAGLINE, SITE_URL } from "../lib/seo";
import { OrganizationSchema } from "../components/seo/StructuredData";
import { ErrorReporting } from "../components/ErrorReporting";
import "./globals.css";

// Every typeface is self-hosted from app/fonts (all three are OFL). This
// isn't only about weights — with next/font/google the *build* fetches font
// files from Google, and a build that can't reach Google (CI runners are
// rate-limited by Google Fonts from time to time; a locked-down VPS may be
// offline) fails outright. A build must not depend on a third party.
//
// Latin subsets only, matching what next/font/google preloaded. Only the
// weights the UI sets: the heaviest weight in use anywhere is 600, and italic
// is only ever the regular serif weight — each extra file is a preload on
// every page's first paint.
const plexSans = localFont({
  // One variable file covers 400–600.
  src: [{ path: "./fonts/ibm-plex-sans-latin.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-plex-sans",
  display: "swap",
  adjustFontFallback: "Arial"
});
const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" }
  ],
  variable: "--font-plex-mono",
  display: "swap",
  // Figures only (statement rows, tables) — never in the first viewport of a
  // marketing page, so it must not compete with the display and body faces
  // for bandwidth before first paint. Loaded on first use instead.
  preload: false,
  adjustFontFallback: "Arial"
});
const zillaSlab = localFont({
  src: [
    { path: "./fonts/zilla-slab-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/zilla-slab-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/zilla-slab-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/zilla-slab-600.woff2", weight: "600", style: "normal" }
  ],
  variable: "--font-zilla-slab",
  display: "swap",
  adjustFontFallback: "Times New Roman"
});

export const metadata: Metadata = {
  // Makes every relative canonical/OG URL in child pages resolve to an
  // absolute one — without it Next emits relative canonicals, which search
  // engines ignore.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // Pages supply just their own name; the brand is appended here so no page
    // has to repeat it and none can forget it.
    template: `%s | ${SITE_NAME}`
  },
  description:
    "Senior fractional accountants, tax advisors and payroll specialists for businesses in Kenya and East Africa.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_KE",
    url: SITE_URL,
    images: [OG_IMAGE]
  },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  category: "finance"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by middleware for the Content Security Policy. Reading request
  // headers is what opts every page into per-request rendering — required,
  // since a nonce baked into prebuilt HTML would be no nonce at all.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plexSans.variable} ${plexMono.variable} ${zillaSlab.variable} font-sans antialiased`}>
        <OrganizationSchema />
        <ErrorReporting />
        <ThemeProvider nonce={nonce}>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
