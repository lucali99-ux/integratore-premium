"use client";

import { useRef } from "react";
import { gsap, SplitText, useScene } from "@/lib/animation";

/**
 * SEZIONE 2 — Filosofia (pinnata).
 *
 * La frase resta ferma al centro mentre il fondo si anima e il testo
 * si riempie parola per parola, da grigio a bianco.
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
 */
export default function Philosophy() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      const copy = root.current!.querySelector("[data-copy]")!;
      const capsule = root.current!.querySelector("[data-capsule]");
      const pinned = root.current!.querySelector("[data-pin]");

      const split = SplitText.create(copy, {
        type: "words",
        autoSplit: true,
        onSplit: (self) => {
          // Una sola timeline: il testo che si riempie e la capsula che
          // cresce sono lo stesso momento, non due effetti sovrapposti.
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "+=180%", // distanza di scroll dedicata alla sezione
              scrub: 0.8,
              pin: pinned,
              pinSpacing: true,
              anticipatePin: 1, // evita il "salto" di un frame all'aggancio
            },
          });

          tl.fromTo(
            self.words,
            { opacity: 0.18 },
            { opacity: 1, ease: "none", stagger: 1, duration: 6 },
            0,
          ).fromTo(
            capsule,
            { scale: 0.82, yPercent: 6 },
            { scale: 1.12, yPercent: -6, ease: "none", duration: 8 },
            0,
          );

          return tl;
        },
      });

      return () => split.revert();
    },

    // Statica: nessun pin, nessuno split. Frase piena e capsula a
    // scala neutra — la sezione resta leggibile e composta.
    reduced: () => {
      gsap.set(root.current!.querySelector("[data-capsule]"), { scale: 1 });
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
        {/* Capsula: la forma ricorrente del sistema, usata come fondale.
            Non è decorazione neutra — è la stessa geometria della pill
            delle CTA e della bustina. */}
        <div
          data-capsule
          aria-hidden
          className="capsule absolute h-[125%] w-[62vw] bg-coal sm:w-[44vw] md:w-[34vw]"
        />

        <div className="shell relative z-10 flex flex-col items-center text-center">
          <p data-reveal className="type-label mb-10 text-ash">la formula</p>

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
