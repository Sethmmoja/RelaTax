"use client";

import dynamic from "next/dynamic";

// Client-only and below the fold: nobody opens the assistant before the page
// has painted, so its code (and the API client it drags in) stays out of the
// first-load bundle of every marketing page. `ssr: false` has to live in a
// client component — Next refuses it from a server layout.
export const DeferredAIChatWidget = dynamic(() => import("./AIChatWidget").then((m) => m.AIChatWidget), {
  ssr: false
});
