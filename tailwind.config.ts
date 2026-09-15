import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f1115",
        panel: "#171a21",
        edge: "#262b36",
        muted: "#8b93a7",
        accent: "#4f8cff",
        good: "#3fb950",
        warn: "#d29922",
      },
    },
  },
  plugins: [],
} satisfies Config;
