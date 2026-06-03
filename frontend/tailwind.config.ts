import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f5f0e8",
        ink: "#0a0a0a",
        "ink-red": "#d63a2a",
        "ink-yellow": "#f2c94c",
        "ink-green": "#2a7a4b",
        muted: "#8a8070",
        "paper-dark": "#ede8df",
        "paper-mid": "#d0c9be",
      },
      fontFamily: {
        grotesk: ["'Space Grotesk'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      borderRadius: {
        none: "0px",
      },
      animation: {
        blink: "blink 1.4s infinite",
        tick: "tick 28s linear infinite",
        dots: "dots 1.2s infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
        tick: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        dots: {
          "0%": { content: "''" },
          "33%": { content: "'.'" },
          "66%": { content: "'..'" },
          "100%": { content: "'...'" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
