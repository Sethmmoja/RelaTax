"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ReactNode, useEffect } from "react";

/**
 * This app has no manual light/dark toggle anywhere — theme always follows
 * the OS. next-themes still persists a "theme" key to localStorage the
 * moment it resolves one, which permanently overrides system detection on
 * every future load even though nothing here ever legitimately sets it.
 * Clearing it defensively keeps the site honoring the device theme, not a
 * value stuck from a previous visit.
 */
function ClearStaleThemeOverride() {
  useEffect(() => {
    try {
      window.localStorage.removeItem("theme");
    } catch {
      // localStorage unavailable (private browsing, etc.) — nothing to clear.
    }
  }, []);
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ClearStaleThemeOverride />
      {children}
    </NextThemeProvider>
  );
}
