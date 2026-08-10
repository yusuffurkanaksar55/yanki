import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Aptos",
          "Segoe UI Variable Text",
          "Segoe UI",
          "Arial",
          "sans-serif"
        ],
        display: [
          "Aptos Display",
          "Segoe UI Variable Display",
          "Segoe UI",
          "Arial",
          "sans-serif"
        ]
      },
      colors: {
        ink: "#17202a",
        mist: "#f3f6f4",
        pine: "#176b5c",
        coral: "#b94a40",
        amber: "#9a6817"
      },
      boxShadow: {
        panel: "0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px rgb(15 23 42 / 0.04)"
      }
    }
  },
  plugins: []
} satisfies Config;
