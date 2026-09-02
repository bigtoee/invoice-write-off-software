/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 票核 InvoiceCore 设计令牌
        paper: {
          DEFAULT: "#F7F4EE",
          deep: "#EFEBE2",
        },
        ink: {
          DEFAULT: "#1E1B16",
          soft: "#4A453D",
          faint: "#8A8378",
        },
        seal: {
          DEFAULT: "#C03F2B",
          deep: "#9E2F1F",
        },
        jade: "#3E7A5E",
        amber: "#B97E1E",
        "cinnabar-line": "#E8E1D3",
        "warm-white": "#FDFCF9",
        "ink-dark": "#221F1A",
        "paper-on-dark": "#EDE8DE",
      },
      fontFamily: {
        serif: ["'Noto Serif SC'", "serif"],
        sans: ["'Noto Sans SC'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
        instrument: ["'Instrument Serif'", "serif"],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        card: "0 1px 2px rgba(30,27,22,0.06)",
        overlay: "0 8px 32px rgba(30,27,22,0.14)",
      },
      transitionTimingFunction: {
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "seal-breathe": {
          "0%,100%": { borderColor: "rgba(192,63,43,0.35)" },
          "50%": { borderColor: "rgba(192,63,43,0.9)" },
        },
        scanline: {
          "0%": { transform: "translateY(-10%)" },
          "100%": { transform: "translateY(110%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "seal-breathe": "seal-breathe 1.6s ease-in-out infinite",
        scanline: "scanline 1.4s cubic-bezier(0.22,1,0.36,1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
