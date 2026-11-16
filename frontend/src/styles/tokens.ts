/**
 * StudyHub V2 — Centralized Design Tokens (The Academic Monolith)
 *
 * Single source of truth for design tokens used across Tailwind, CSS variables,
 * and component prop scales.
 */

export const tokens = {
  colors: {
    brand: {
      midnight: "#0B0B0C",
      obsidian: "#141416",
      charcoal: "#1C1C21",
      surface: "#24242B",
      lime: "#C6F432",
      limeAccessible: "#82A900",
      white: "#FFFFFF",
    },
    light: {
      background: "#FCFCFC",
      foreground: "#0B0B0C",
      card: "#FFFFFF",
      cardForeground: "#0B0B0C",
      primary: "#3F6212",
      primaryForeground: "#FFFFFF",
      secondary: "#F1F1F3",
      secondaryForeground: "#141416",
      muted: "#F4F4F6",
      mutedForeground: "#6F6F76",
      border: "#E2E2E6",
      input: "#E2E2E6",
      ring: "#82A900",
      destructive: "#DC2626",
      destructiveForeground: "#FFFFFF",
    },
    dark: {
      background: "#0B0B0C",
      foreground: "#FAFAFA",
      card: "#141416",
      cardForeground: "#FAFAFA",
      primary: "#C6F432",
      primaryForeground: "#0B0B0C",
      secondary: "#1F1F24",
      secondaryForeground: "#F4F4F6",
      muted: "#19191D",
      mutedForeground: "#A1A1A8",
      border: "#27272E",
      input: "#27272E",
      ring: "#C6F432",
      destructive: "#EF4444",
      destructiveForeground: "#FFFFFF",
    },
  },
  typography: {
    fonts: {
      sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    scale: {
      display: { fontSize: "1.875rem", lineHeight: "2.25rem", fontWeight: "800", letterSpacing: "-0.025em" }, // 30px
      pageHeading: { fontSize: "1.5rem", lineHeight: "2rem", fontWeight: "700", letterSpacing: "-0.02em" },   // 24px
      sectionHeading: { fontSize: "1.125rem", lineHeight: "1.75rem", fontWeight: "700", letterSpacing: "-0.015em" }, // 18px
      subheading: { fontSize: "0.875rem", lineHeight: "1.25rem", fontWeight: "600", letterSpacing: "-0.01em" }, // 14px
      body: { fontSize: "0.8125rem", lineHeight: "1.25rem", fontWeight: "400" }, // 13px
      bodySmall: { fontSize: "0.75rem", lineHeight: "1rem", fontWeight: "400" }, // 12px
      label: { fontSize: "0.75rem", lineHeight: "1rem", fontWeight: "600", letterSpacing: "0.01em" }, // 12px
      metadata: { fontSize: "0.6875rem", lineHeight: "0.875rem", fontWeight: "500" }, // 11px
      code: { fontSize: "0.75rem", lineHeight: "1.25rem", fontFamily: "'JetBrains Mono', monospace" },
    },
  },
  spacing: {
    1: "0.25rem",  // 4px
    2: "0.5rem",   // 8px  (base increment)
    3: "0.75rem",  // 12px
    4: "1rem",     // 16px
    5: "1.25rem",  // 20px
    6: "1.5rem",   // 24px
    8: "2rem",     // 32px
    10: "2.5rem",  // 40px
    12: "3rem",    // 48px
    16: "4rem",    // 64px
  },
  radii: {
    none: "0px",
    xs: "0.25rem",  // 4px
    sm: "0.375rem", // 6px
    md: "0.5rem",   // 8px
    lg: "0.75rem",  // 12px
    xl: "1rem",     // 16px
    "2xl": "1.25rem",// 20px
    full: "9999px",
  },
  shadows: {
    none: "none",
    xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    limeGlow: "0 0 20px -4px rgba(198, 244, 50, 0.35)",
    glassCard: "0 4px 20px 0 rgba(0, 0, 0, 0.28)",
    glassPanel: "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
  },
  glass: {
    blur: {
      subtle: "12px",
      card: "14px",
      panel: "20px",
      modal: "24px",
    },
    opacity: {
      subtle: 0.55,
      card: 0.68,
      panel: 0.78,
      composer: 0.85,
    },
  },
  transitions: {
    duration: {
      fast: "120ms",
      normal: "150ms",
      moderate: "200ms",
    },
    timing: {
      easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
      easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
      spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    },
  },
  zIndex: {
    base: 0,
    dropdown: 30,
    sticky: 40,
    drawer: 45,
    modal: 50,
    popover: 60,
    toast: 70,
    tooltip: 80,
  },
} as const;

export type DesignTokens = typeof tokens;
