/**
 * Intrinsic size (328×129, the PNG's real pixels) is declared so the browser
 * reserves the box before the file arrives — the logo sits in every header,
 * so without it the whole page shifts down on first paint. `w-auto` in the
 * class keeps the aspect ratio while the height utility sets the size.
 *
 * The light wordmark is the largest contentful paint on phones, so it's
 * fetched at high priority; the dark one is lazy, which for a `display:none`
 * image means "not at all" until the theme actually shows it — previously
 * both files downloaded on every page load.
 */
export function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <span className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/relatax-logo.png"
        alt="RelaTax"
        width={328}
        height={129}
        fetchPriority="high"
        className={`${className} dark:hidden`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/relatax-logo-dark.png"
        alt="RelaTax"
        width={328}
        height={129}
        loading="lazy"
        className={`${className} hidden dark:block`}
      />
    </span>
  );
}
