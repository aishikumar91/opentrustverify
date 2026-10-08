import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui"],
        display: ["Outfit", "ui-sans-serif", "system-ui"],
        brand: ["Bebas Neue", "Impact", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: "#0A121B",
        surface: "#0D1826",
        line: "#1C2B3A",
        muted: "#7C8B9C",
        text: "#E6ECF2",
        safe: "#35D398",
        threat: "#FF5C6C",
        brand: "#E11D48",
        "brand-hover": "#F43F5E",
      },
    },
  },
  plugins: [],
};
export default config;
