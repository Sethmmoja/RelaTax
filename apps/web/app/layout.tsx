import type { Metadata } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "../lib/theme-provider";
import { AuthProvider } from "../lib/auth-context";
import { OG_IMAGE, SITE_NAME, SITE_TAGLINE, SITE_URL } from "../lib/seo";
import { OrganizationSchema } from "../components/seo/StructuredData";
import { ErrorReporting } from "../components/ErrorReporting";
import "./globals.css";

// Only the weights the UI actually sets. Every listed weight/style is a
// separate preloaded font file on first paint, so an unused 700 costs LCP on
// every page for nothing — the heaviest weight in use anywhere is 600.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans"
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  // Figures only (statement rows, tables) — never in the first viewport of a
  // marketing page, so it must not compete with the display and body faces
  // for bandwidth before first paint. Loaded on first use instead.
  preload: false
});
// Zilla Slab is self-hosted (OFL, latin subset) because next/font/google can
// only take a weight list × a style list: asking for 400/500/600 plus italic
// downloads six files, and the site sets italic at the regular weight only.
// Four files instead of six, and every one is used above the fold.
const zillaSlab = localFont({
  src: [
    { path: "./fonts/zilla-slab-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/zilla-slab-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/zilla-slab-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/zilla-slab-600.woff2", weight: "600", style: "normal" }
  ],
  variable: "--font-zilla-slab",
  display: "swap",
  // The metric-compatible fallback next/font/google computed for Zilla Slab,
  // so text doesn't reflow when the real face swaps in.
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
