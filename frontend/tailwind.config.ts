import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        smelt: {
          bg: "#09090b",
          surface: "#18181b",
          "surface-alt": "#1c1c20",
          border: "#27272a",
          "border-light": "#3f3f46",
          amber: "#d97706",
          "amber-dim": "#b45309",
          "amber-bg": "rgba(217,119,6,0.08)",
          "amber-border": "rgba(217,119,6,0.2)",
          copper: "#c2855a",
          "copper-dim": "#a06b3f",
          "text-1": "#fafafa",
          "text-2": "#a1a1aa",
          "text-3": "#71717a",
          green: "#22c55e",
          "green-bg": "rgba(34,197,94,0.08)",
          "green-border": "rgba(34,197,94,0.2)",
          red: "#ef4444",
          "red-bg": "rgba(239,68,68,0.08)",
          "red-border": "rgba(239,68,68,0.2)",
          blue: "#3b82f6",
          "blue-bg": "rgba(59,130,246,0.08)",
          "blue-border": "rgba(59,130,246,0.2)",
          status: "#f59e0b",
          "status-bg": "rgba(245,158,11,0.08)",
          "status-border": "rgba(245,158,11,0.2)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
