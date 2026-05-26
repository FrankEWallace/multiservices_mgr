import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // SF Pro on Apple devices, Geist on web — matches index.css body font
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Geist Sans",
          "Geist",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // Monospace numbers for financial figures
        mono: [
          "SF Mono",
          "Geist Mono",
          "ui-monospace",
          "Cascadia Code",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        // Tight scale — 3 sizes max per screen (blueprint rule)
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        xs:   ["0.75rem",  { lineHeight: "1.125rem" }],
        sm:   ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem",     { lineHeight: "1.5rem" }],
        lg:   ["1.125rem", { lineHeight: "1.625rem" }],
        xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
        "2xl":["1.5rem",   { lineHeight: "1.875rem", letterSpacing: "-0.025em" }],
        "3xl":["1.875rem", { lineHeight: "2.125rem", letterSpacing: "-0.03em" }],
        "4xl":["2.5rem",   { lineHeight: "2.75rem",  letterSpacing: "-0.04em" }],
        "5xl":["3.5rem",   { lineHeight: "3.75rem",  letterSpacing: "-0.05em" }],
      },
      colors: {
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow:       "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          hover:      "hsl(var(--card-hover))",
        },
        success: {
          DEFAULT:    "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT:    "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        danger: {
          DEFAULT:    "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        sidebar: {
          DEFAULT:             "hsl(var(--sidebar-background))",
          foreground:          "hsl(var(--sidebar-foreground))",
          primary:             "hsl(var(--sidebar-primary))",
          "primary-foreground":"hsl(var(--sidebar-primary-foreground))",
          accent:              "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border:              "hsl(var(--sidebar-border))",
          ring:                "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        none: "0",
        sm:   "calc(var(--radius) - 4px)",   /* 6px */
        md:   "calc(var(--radius) - 2px)",   /* 8px */
        DEFAULT: "var(--radius)",            /* 10px */
        lg:   "var(--radius)",               /* 10px */
        xl:   "calc(var(--radius) + 4px)",   /* 14px */
        "2xl":"calc(var(--radius) + 8px)",   /* 18px */
        "3xl":"calc(var(--radius) + 14px)",  /* 24px */
        full: "9999px",
      },
      spacing: {
        // 4px base scale — blueprint rule
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-top":    "env(safe-area-inset-top)",
        "safe-left":   "env(safe-area-inset-left)",
        "safe-right":  "env(safe-area-inset-right)",
        // Tab bar heights
        "tab-bar":     "58px",
        "tab-bar-safe":"calc(58px + env(safe-area-inset-bottom))",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          "0%":   { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-up": {
          "0%":   { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        "number-tick": {
          "0%":   { transform: "translateY(0%)" },
          "100%": { transform: "translateY(-100%)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% center" },
          to:   { backgroundPosition: "200% center" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in":         "fade-in 0.25s ease-out forwards",
        "fade-up":         "fade-up 0.35s ease-out forwards",
        "fade-down":       "fade-down 0.25s ease-out forwards",
        "scale-in":        "scale-in 0.2s ease-out forwards",
        "slide-in-left":   "slide-in-left 0.3s ease-out",
        "slide-up":        "slide-up 0.35s cubic-bezier(0.32,0.72,0,1)",
        "pulse-glow":      "pulse-glow 2s ease-in-out infinite",
        shimmer:           "shimmer 1.5s ease-in-out infinite",
      },
      boxShadow: {
        // Design tokens for consistent depth
        "card":    "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)",
        "blue":    "0 4px 14px hsl(229 92% 63% / 0.3)",
        "blue-lg": "0 8px 30px hsl(229 92% 63% / 0.4)",
        "inset-top": "inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      backgroundImage: {
        "gradient-blue": "linear-gradient(135deg, hsl(229 92% 63%), hsl(262 80% 62%))",
        "gradient-blue-soft": "linear-gradient(135deg, hsl(229 92% 63% / 0.15), hsl(262 80% 62% / 0.1))",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spring-smooth": "cubic-bezier(0.34, 1.4, 0.64, 1)",
        ios: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
