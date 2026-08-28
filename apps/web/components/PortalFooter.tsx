import { Logo } from "./Logo";

export function PortalFooter() {
  return (
    <footer className="border-t border-border px-6 py-6">
      <div className="flex flex-col items-start justify-between gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <Logo className="h-6 w-auto" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="mailto:info@relatax.org" className="hover:text-primary">
            info@relatax.org
          </a>
          <a href="tel:+254115581898" className="hover:text-primary">
            +254 115 581 898
          </a>
          <a href="https://wa.me/254115581898" target="_blank" rel="noreferrer" className="hover:text-primary">
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
