import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plex)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#1a1a1a",
        paper: "#fafaf9",
        brand: "#0f766e",
        "brand-dark": "#0d5d56",
      },
    },
  },
  plugins: [],
};

export default config;
