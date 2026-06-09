import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      // Padding responsive : compact sur mobile, plus aéré sur grands écrans.
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
      },
      // Exploite les grands écrans (1440 / 1600 / 1920 / ultrawide).
      screens: { "2xl": "1800px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0F4C81",
          foreground: "#FFFFFF",
          50: "#EAF2F9",
          100: "#CDE0F0",
          600: "#0F4C81",
          700: "#0C3D67",
        },
        secondary: {
          DEFAULT: "#2E8B57",
          foreground: "#FFFFFF",
          50: "#EAF6EF",
          600: "#2E8B57",
          700: "#246E45",
        },
        success: { DEFAULT: "#22C55E", foreground: "#FFFFFF" },
        warning: { DEFAULT: "#F59E0B", foreground: "#FFFFFF" },
        danger: { DEFAULT: "#EF4444", foreground: "#FFFFFF" },
        muted: { DEFAULT: "#F1F5F9", foreground: "#64748B" },
        card: { DEFAULT: "#FFFFFF", foreground: "#0F172A" },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        arabic: ["var(--font-cairo)", "Tahoma", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
