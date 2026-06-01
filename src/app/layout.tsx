import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/locales";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Générateur Intelligent de Programmes Nutritionnels et Sportifs",
  description:
    "Plateforme médicale pour générer des programmes nutritionnels et sportifs personnalisés — Nutrition, Diabète, Obésité, Activité Physique.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} ${cairo.variable}`}>
      <body className="font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
