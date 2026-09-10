"use client";

import { useRef } from "react";
import { gsap, SplitText, useScene } from "@/lib/animation";

/**
 * SEZIONE 2 — Filosofia (pinnata).
 *
 * La frase resta ferma al centro mentre il fondo si apre e il testo si
 * riempie parola per parola, da grigio a bianco.
 *
 * Perché QUI il pin di ScrollTrigger e non `sticky` come nell'hero:
 * serve una distanza di scroll esplicita ("+=180%") scollegata
 * dall'altezza della sezione, e serve che il pin termini esattamente
 * quando la frase è completa. Con `sticky` andrebbe calcolata a mano
 * l'altezza del contenitore.
 *
 * Perché per PAROLE e non per lettere: a questa scala un riempimento
 * lettera per lettera rende la frase illeggibile durante la
 * transizione. Per parole resta leggibile in ogni fotogramma.
 *
 * Il fondale è un reticolo di righe che si apre. Riprende le bande
 * orizzontali dell'intro — il motivo proprio di questo sito — invece
 * di una forma presa dalla pagina di riferimento.
 */

/** Righe del reticolo. Dispari, così una resta esattamente al centro. */
const RULES = 7;

/**
 * Opacità massima di una riga. Il reticolo deve leggersi come scelta
 * grafica, non come artefatto: a #2a2a2a su nero spariva, a piena
 * opacità competerebbe con il testo.
 */
const RULE_ALPHA = 0.32;

export default function Philosophy() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      const copy = root.current!.querySelector("[data-copy]")!;
      const pinned = root.current!.querySelector("[data-pin]");
      const rules = gsap.utils.toArray<HTMLElement>("[data-rule]");
      const middle = (RULES - 1) / 2;

      const split = SplitText.create(copy, {
        type: "words",
        autoSplit: true,
        onSplit: (self) => {
          // Una sola timeline: il testo che si riempie e il reticolo
          // che si apre sono lo stesso momento, non due effetti
          // sovrapposti.
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "+=180%", // distanza di scroll dedicata alla sezione
              scrub: 0.8,
              pin: pinned,
              pinSpacing: true,
              anticipatePin: 1, // evita il "salto" di un frame all'aggancio
              // Le distanze del reticolo dipendono dall'altezza della
              // viewport: senza questo resterebbero fissate ai pixel
              // del primo caricamento anche dopo un resize.
              invalidateOnRefresh: true,
            },
          });

          tl.fromTo(
            self.words,
            { opacity: 0.18 },
            { opacity: 1, ease: "none", stagger: 1, duration: 6 },
            0,
          ).fromTo(
            rules,
            {
              // Partenza: righe quasi sovrapposte al centro.
              y: (i: number) => (i - middle) * 4,
              opacity: 0,
            },
            {
              // Arrivo: si aprono fino a coprire quasi tutta l'altezza,
              // con le esterne più deboli.
              y: (i: number) => (i - middle) * window.innerHeight * 0.13,
              opacity: (i: number) =>
                RULE_ALPHA * (1 - Math.abs(i - middle) / (middle + 1.8)),
              ease: "none",
              duration: 8,
            },
            0,
          );

          return tl;
        },
      });

      return () => split.revert();
    },

    // Statica: nessun pin, nessuno split. Frase piena e reticolo già
    // aperto, così la composizione regge anche senza movimento.
    reduced: () => {
      const middle = (RULES - 1) / 2;
      gsap.set(gsap.utils.toArray<HTMLElement>("[data-rule]"), {
        y: (i: number) => (i - middle) * window.innerHeight * 0.13,
        opacity: (i: number) =>
          RULE_ALPHA * (1 - Math.abs(i - middle) / (middle + 1.8)),
      });
    },
  });

  return (
    <section
      id="filosofia"
      ref={root}
      className="relative bg-ink text-paper"
      aria-label="La filosofia del brand"
    >
      <div
        data-pin
        className="relative flex h-svh items-center justify-center overflow-hidden"
      >
        {/*
          Reticolo di fondo: righe che si aprono dal centro.
          Le lunghezze si alternano — piena, poi rientrata — così il
          gruppo legge come una scala di misura invece che come un
          fondo generico. È il riferimento al registro "ricerca
          applicata" del brand.
        */}
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-0">
          {Array.from({ length: RULES }).map((_, i) => (
            <span
              key={i}
              data-rule
              // La riga centrale è lime: è il punto su cui il testo
              // si appoggia, e dà un fuoco al reticolo.
              className={`absolute block h-px ${
                i === (RULES - 1) / 2 ? "bg-volt" : "bg-paper"
              } ${i % 2 === 0 ? "inset-x-0" : "inset-x-[24%] md:inset-x-[32%]"}`}
            />
          ))}
        </div>

        <div className="shell relative z-10 flex flex-col items-center text-center">
          <p data-reveal className="type-label mb-10 text-volt">
            la formula
          </p>

          <p
            data-copy
            data-anim-hidden="true"
            className="type-display max-w-[19ch] text-xxl"
          >
            minerali marini ed estratti vegetali, dosati sulla fisiologia di
            chi si allena davvero
          </p>
        </div>
      </div>
    </section>
  );
}
