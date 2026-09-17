"use client";

import { useEffect } from "react";
import { installGlobalErrorListeners } from "../lib/error-reporter";

/** Renders nothing; wires the window-level error listeners once. */
export function ErrorReporting() {
  useEffect(() => {
    installGlobalErrorListeners();
  }, []);
  return null;
}
