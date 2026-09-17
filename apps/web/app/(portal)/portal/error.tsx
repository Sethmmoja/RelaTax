"use client";

import { ErrorState } from "../../../components/ErrorState";

/**
 * Sits inside the portal layout, so a page that throws leaves the sidebar
 * and business switcher usable — the client can still reach every other
 * section without a full reload.
 */
export default function PortalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState {...props} homeHref="/portal/dashboard" homeLabel="Back to dashboard" />;
}
