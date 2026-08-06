/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B0E2D",
          50: "#EEF0F7",
          100: "#D6DAEC",
          200: "#AEB5D9",
          300: "#8890C6",
          400: "#5E67A8",
          500: "#3B4180",
          600: "#232759",
          700: "#161A3E",
          800: "#0F1233",
          900: "#0B0E2D",
          950: "#06081C",
        },
        status: {
          available: "#166534",
          reserved: "#171717",
          sold: "#dc2626",
          hold: "#6b7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11,14,45,0.06), 0 1px 3px 0 rgba(11,14,45,0.08)",
        panel: "0 4px 24px -4px rgba(11,14,45,0.18)",
      },
    },
  },
  plugins: [],
};
