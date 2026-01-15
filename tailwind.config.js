/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro Condensed"',
          '"SF Pro Compressed"',
          '"SF Pro Expanded"',
          '"SF Mono"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Canvas backgrounds
        "canvas-default": "var(--bg-canvas-default)",
        "canvas-subtle": "var(--bg-canvas-subtle)",
        "canvas-inset": "var(--bg-canvas-inset)",
        "canvas-overlay": "var(--bg-canvas-overlay)",

        // Card backgrounds by level
        "card-0": "var(--card-bg-level-0)",
        "card-1": "var(--card-bg-level-1)",
        "card-2": "var(--card-bg-level-2)",
        "card-3": "var(--card-bg-level-3)",

        // Borders
        "border-default": "var(--border-default)",
        "border-subtle": "var(--border-subtle)",

        // Legacy support
        background: "#F5F5F7",
        surface: "rgba(255, 255, 255, 0.7)",
        "surface-glass": "rgba(255, 255, 255, 0.8)",

        // Category colors
        cat: {
          food: "#FF9F0A", // Orange
          shopping: "#FFD60A", // Yellow
          travel: "#30D158", // Green
          transport: "#0A84FF", // Blue
          services: "#BF5AF2", // Purple
          entertainment: "#FF375F", // Pink
          health: "#FF453A", // Red
        },
      },
      boxShadow: {
        soft: "0 18px 60px rgba(0, 0, 0, 0.08)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
