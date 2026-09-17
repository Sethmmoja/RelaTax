"use client";

import { ErrorState } from "../../../components/ErrorState";

/** Same as the portal boundary: the admin chrome survives a page failure. */
export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState {...props} homeHref="/admin/dashboard" homeLabel="Back to dashboard" />;
}
