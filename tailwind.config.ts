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
        // Deep ocean navy — replaces the cold dark slate palette
        slate: {
          50:  "#e8f4fc",
          100: "#d0e8f4",
          200: "#a8cce0",
          300: "#7aa8cc",
          400: "#5580a8",
          500: "#315a80",
          600: "#1f3d5e",
          700: "#182d45",
          800: "#102030",
          900: "#08121f",
          950: "#040b16",
        },
        // Professional sky blue — replaces indigo-purple
        indigo: {
          50:  "#e8f5fe",
          100: "#d0ebfc",
          200: "#a0d3f8",
          300: "#6bbaf0",
          400: "#3ca0e8",
          500: "#1a7fd4",
          600: "#1268b4",
          700: "#0e5292",
          800: "#09386a",
          900: "#052242",
          950: "#020d1e",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
