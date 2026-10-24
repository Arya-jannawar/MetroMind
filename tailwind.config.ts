import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // literal hex so Tailwind can compute alpha modifiers (/40 etc.)
        bg: "#0a0d11",
        surface: "#10151b",
        surface2: "#161d26",
        line: "#232c37",
        "line-soft": "#1a222b",
        ink: "#e9edf2",
        dim: "#a7b2bf",
        muted: "#77828f",
        aqua: "#29c8cf",
        grape: "#a183ff",
        ok: "#46d39a",
        warn: "#e8c34a",
        danger: "#f26d6d",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "12px",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "dash-flow": {
          to: { strokeDashoffset: "-28" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "dash-flow": "dash-flow 1.1s linear infinite",
        "rise-in": "rise-in 0.24s ease-out both",
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
