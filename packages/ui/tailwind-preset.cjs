/**
 * "The Ledger" — RelaTax's shared Tailwind theme. Zilla Slab for display
 * (editorial, document-authority headlines), IBM Plex Sans for body copy,
 * IBM Plex Mono for financial figures (tabular, like a printed statement).
 * Consumed by apps/web via `presets: [require("@relatax/ui/tailwind-preset.cjs")]`.
 */
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        card: "oklch(var(--card) / <alpha-value>)",
        "card-foreground": "oklch(var(--card-foreground) / <alpha-value>)",
        primary: "oklch(var(--primary) / <alpha-value>)",
        "primary-foreground": "oklch(var(--primary-foreground) / <alpha-value>)",
        "primary-glow": "oklch(var(--primary-glow) / <alpha-value>)",
        secondary: "oklch(var(--secondary) / <alpha-value>)",
        "secondary-foreground": "oklch(var(--secondary-foreground) / <alpha-value>)",
        accent: "oklch(var(--accent) / <alpha-value>)",
        "accent-foreground": "oklch(var(--accent-foreground) / <alpha-value>)",
        muted: "oklch(var(--muted) / <alpha-value>)",
        "muted-foreground": "oklch(var(--muted-foreground) / <alpha-value>)",
        border: "oklch(var(--border) / <alpha-value>)",
        destructive: "oklch(var(--destructive) / <alpha-value>)",
        "destructive-foreground": "oklch(var(--destructive-foreground) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-zilla-slab)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "calc(var(--radius) + 0.25rem)",
        sm: "calc(var(--radius) - 0.125rem)",
        pill: "9999px"
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        elegant: "var(--shadow-elegant)"
      },
      backgroundImage: {
        hero: "var(--gradient-hero)",
        "primary-gradient": "var(--gradient-primary)"
      }
    }
  }
};
