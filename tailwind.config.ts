import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0B",
        surface: "#111111",
        raised: "#181818",
        line: "#2A2A2A",
        muted: "#8A8A8A",
        fg: "#F2F2F2",
        accent: "#FFFFFF",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
