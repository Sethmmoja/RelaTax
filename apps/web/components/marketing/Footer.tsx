import Link from "next/link";
import { Logo } from "../Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 text-sm text-muted-foreground">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Logo className="h-8 w-auto" />
            <p className="mt-2 max-w-xs">
              Fractional accounting, tax compliance and payroll solutions for ambitious businesses across Kenya and
              East Africa. Senior expertise, on demand.
            </p>
          </div>
          <div>
            <p className="mb-3 font-medium text-foreground">Explore</p>
            <ul className="space-y-2">
              <li><Link href="/services" className="hover:text-primary">Services</Link></li>
              <li><Link href="/about" className="hover:text-primary">About</Link></li>
              <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-medium text-foreground">Get in touch</p>
            <ul className="space-y-2">
              <li>
                <a href="mailto:sethomoke25@gmail.com" className="hover:text-primary">
                  sethomoke25@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+254115581898" className="hover:text-primary">
                  +254 115 581 898
                </a>
              </li>
              <li>
                <a href="https://wa.me/254115581898" target="_blank" rel="noreferrer" className="hover:text-primary">
                  Chat on WhatsApp
                </a>
              </li>
              <li>Nairobi, Kenya</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} RelaTax. All rights reserved.</p>
          <p>Built for people who value precision.</p>
        </div>
      </div>
    </footer>
  );
}
