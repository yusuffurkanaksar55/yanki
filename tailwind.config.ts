import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Arial",
          "sans-serif"
        ]
      },
      colors: {
        ink: "#17202a",
        mist: "#f6f8fb",
        pine: "#136f63",
        coral: "#b84a40",
        amber: "#a46c16"
      }
    }
  },
  plugins: []
} satisfies Config;
