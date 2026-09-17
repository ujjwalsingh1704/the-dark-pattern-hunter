/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#090D16",         // Deep midnight obsidian background
        panel: "#111827",         // Glassmorphic dark slate card panel
        panelborder: "#1E293B",
        ink: "#F8FAFC",           // Ultra bright crisp white text
        inkfaint: "#94A3B8",      // Muted slate gray text
        rule: "#1E293B",          // Subtle slate border divider
        flag: "#F43F5E",          // Neon crimson dark pattern alert
        flagfaint: "rgba(244, 63, 94, 0.12)",
        clear: "#10B981",         // Neon emerald clean rating
        clearfaint: "rgba(16, 185, 129, 0.12)",
        cyan: "#06B6D4",
        purple: "#A855F7"
      },
      fontFamily: {
        serif: ["Source Serif 4", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
