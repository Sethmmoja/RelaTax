import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Zilla_Slab } from "next/font/google";
import { ThemeProvider } from "../lib/theme-provider";
import { AuthProvider } from "../lib/auth-context";
import { OG_IMAGE, SITE_NAME, SITE_TAGLINE, SITE_URL } from "../lib/seo";
import { OrganizationSchema } from "../components/seo/StructuredData";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans"
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono"
});
const zillaSlab = Zilla_Slab({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-zilla-slab"
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plexSans.variable} ${plexMono.variable} ${zillaSlab.variable} font-sans antialiased`}>
        <OrganizationSchema />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
