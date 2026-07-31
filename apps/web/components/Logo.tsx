export function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <span className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/relatax-logo.png" alt="RelaTax" className={`${className} dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/relatax-logo-dark.png" alt="RelaTax" className={`${className} hidden dark:block`} />
    </span>
  );
}
