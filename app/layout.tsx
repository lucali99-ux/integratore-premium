import type { Metadata } from "next";
import { Familjen_Grotesk, Space_Grotesk } from "next/font/google";
import CinemaIntro from "@/components/CinemaIntro";
import CustomCursor from "@/components/CustomCursor";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollReveal from "@/components/ScrollReveal";
import SideCta from "@/components/SideCta";
import "./globals.css";

/**
 * Display. Grottesco con lettere caratterizzate (a, g, k con
 * terminazioni marcate): alla scala gigante e in minuscolo dà
 * personalità dove un neo-grottesco neutro resterebbe anonimo.
 * Variabile 400-700: un solo file per tutti i pesi che uso.
 */
const familjen = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-familjen",
  display: "swap",
});

/**
 * UI, label e dati. Le forme geometriche e le cifre a larghezza
 * fissa danno il registro "tecnico" alle micro-informazioni
 * (lat.//, percentuali, dosaggi).
 */
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "volta — recupero minerale per chi si allena davvero",
  description:
    "Magnesio marino, elettroliti ed estratti vegetali in bustine monodose. Formulato per CrossFit, Hyrox e sport da combattimento.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${familjen.variable} ${grotesk.variable}`}>
      <body className="bg-paper text-ink antialiased">
        {/* Intro "cinema": sta sopra a tutto e si smonta da sola */}
        <CinemaIntro />
        {/* Cursore custom: non si monta su touch né con reduced-motion */}
        <CustomCursor />
        <SmoothScroll>
          <Header />
          {/* CTA persistente sul bordo destro (come il "shop sofi" del riferimento) */}
          <SideCta />
          <main>{children}</main>
          {/* Reveal staggered di tutto ciò che è marcato data-reveal */}
          <ScrollReveal />
          {/* Barra fissa: valori del brand + percentuale di scroll */}
          <ScrollProgress />
        </SmoothScroll>
      </body>
    </html>
  );
}
