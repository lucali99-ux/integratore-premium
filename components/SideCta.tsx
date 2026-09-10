"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useScene } from "@/lib/animation";

/**
 * CTA verticale ancorata al bordo destro (il "shop sofi" del
 * riferimento). Seconda delle tre ripetizioni della call to action:
 * header → tab laterale → chiusura di pagina.
 *
 * Il testo è ruotato con `writing-mode: vertical-rl` e non con
 * `transform: rotate()`: il primo mantiene la box del layout coerente
 * e il testo selezionabile, il secondo la lascia orizzontale mentre
 * il contenuto ruota, costringendo a compensare a mano.
 */
export default function SideCta() {
  const root = useRef<HTMLDivElement>(null);

  useScene(root, {
    full: () => {
      const tab = root.current!.querySelector("[data-tab]");
      gsap.set(tab, { xPercent: 120, autoAlpha: 0 });

      // I trigger stanno FUORI da questo componente, quindi vanno
      // passati come elementi e non come stringhe: dentro un
      // gsap.context con `scope`, i selettori vengono risolti solo
      // all'interno dello scope. Con "#top" ScrollTrigger non trovava
      // nulla e creava un intervallo di lunghezza zero (start === end),
      // che non si attiva mai.
      const heroEl = document.querySelector("#top");
      const ctaEl = document.querySelector("#acquista");
      if (!heroEl || !ctaEl) return;

      // Entra quando la hero è uscita di scena, esce quando arriva
      // la CTA finale (dove sarebbe ridondante).
      ScrollTrigger.create({
        trigger: heroEl,
        start: "bottom 60%",
        endTrigger: ctaEl,
        end: "top 25%", // sparisce solo quando la CTA finale è ben visibile
        // Questo componente vive nel layout, quindi il suo trigger è
        // il primo a essere calcolato — prima che le sezioni pinnate
        // più in basso abbiano allungato il documento, e la fine
        // dell'intervallo finiva migliaia di pixel troppo in alto.
        // Priorità negativa = ricalcolato per ultimo, su offset finali.
        refreshPriority: -1,
        onToggle: ({ isActive }) =>
          gsap.to(tab, {
            xPercent: isActive ? 0 : 120,
            autoAlpha: isActive ? 1 : 0,
            duration: 0.45,
            ease: "power3.out",
          }),
      });
    },
    // Statica: il tab è semplicemente sempre presente e visibile.
    reduced: () => {
      gsap.set(root.current!.querySelector("[data-tab]"), {
        xPercent: 0,
        autoAlpha: 1,
      });
    },
  });

  return (
    <div
      ref={root}
      className="fixed top-1/2 right-0 z-40 hidden -translate-y-1/2 md:block"
    >
      {/*
        writing-mode va applicato SOLO allo span di testo. Se sta sul
        contenitore flex ruota anche l'asse di flex-direction: "column"
        diventa orizzontale e la pill collassa in un cerchio.
      */}
      <a
        data-tab
        href="#acquista"
        className="capsule flex flex-col items-center gap-3 bg-ink px-3 py-6 text-paper transition-colors hover:bg-volt hover:text-ink"
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-volt" />
        <span
          className="type-label tracking-[0.08em]"
          style={{ writingMode: "vertical-rl" }}
        >
          acquista
        </span>
      </a>
    </div>
  );
}
