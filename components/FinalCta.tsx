"use client";

import { useRef } from "react";
import { gsap, SplitText, useScene } from "@/lib/animation";

/**
 * SEZIONE 6 — Chiusura / acquisto.
 *
 * Terza e ultima ripetizione della CTA (header → tab laterale → qui).
 *
 * Momento animato: reveal per RIGHE, non per caratteri. Il char-by-char
 * è la firma dell'hero: ripeterlo in chiusura lo svaluterebbe. Stessa
 * famiglia di gesto, registro più sobrio.
 */
export default function FinalCta() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      const headline = root.current!.querySelector("[data-headline]")!;

      const split = SplitText.create(headline, {
        type: "lines",
        mask: "lines", // ogni riga in un wrapper con overflow:clip
        linesClass: "split-line",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.09,
            scrollTrigger: {
              trigger: root.current,
              start: "top 70%",
              once: true,
            },
          }),
      });

      return () => split.revert();
    },

    reduced: () => {},
  });

  return (
    <section
      id="acquista"
      ref={root}
      className="bg-ink py-[clamp(7rem,18vh,14rem)] text-paper"
      aria-label="Acquista"
    >
      <div className="shell">
        <p data-reveal className="type-label mb-12 text-ash md:mb-16">disponibile ora</p>

        <h2
          data-headline
          data-anim-hidden="true"
          className="type-display max-w-[19ch] text-xxl"
        >
          inizia stasera, sentilo alla prossima sessione
        </h2>

        <div className="mt-14 flex flex-col gap-10 md:mt-20 md:flex-row md:items-end md:justify-between">
          {/* Prezzo: due opzioni, gerarchia chiara */}
          <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
            <div data-reveal>
              <p className="type-label text-ash">confezione singola</p>
              <p className="type-display mt-2 text-lead">
                39 €
              </p>
              <p className="type-meta mt-1 text-ash">30 bustine · 1,30 € a dose</p>
            </div>
            <div data-reveal>
              <p className="type-label text-ash">abbonamento mensile</p>
              <p className="type-display mt-2 text-lead">
                33 €
              </p>
              <p className="type-meta mt-1 text-ash">
                annullabile quando vuoi
              </p>
            </div>
          </div>

          <a
            data-reveal
            href="#acquista"
            className="type-label capsule inline-flex shrink-0 items-center gap-3 bg-paper px-9 py-5 text-ink transition-colors duration-300 hover:bg-volt"
          >
            acquista volta
            <span aria-hidden>→</span>
          </a>
        </div>

        <p data-reveal className="type-meta mt-12 text-ash">
          spedizione in 48h · reso entro 30 giorni · prodotto in italia
        </p>
      </div>
    </section>
  );
}
