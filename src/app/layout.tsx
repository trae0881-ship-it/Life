import type { Metadata } from "next";
import ScriptInjector from "./ScriptInjector";
import GlobalFooter from "./GlobalFooter";
import "./globals.css";
import "./sensitivity.css";
import "./api-platform.css";

export const metadata: Metadata = {
  title: "LIFE — Vedic Astrology & Jyotish Workbench",
  description: "Explore a Vedic birth chart with local astronomical calculations, documented Jyotish conventions, divisional charts and inspectable results.",
  openGraph: {
    type: "website",
    title: "LIFE — Vedic Astrology & Jyotish Workbench",
    description: "Explore a Vedic birth chart with local astronomical calculations, documented Jyotish conventions and inspectable results.",
    siteName: "LIFE Jyotish Workbench",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "LIFE — Vedic Astrology & Jyotish Workbench",
    description: "Explore a Vedic birth chart with local astronomical calculations, documented Jyotish conventions and inspectable results.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<ScriptInjector /><GlobalFooter /></body></html>;
}
