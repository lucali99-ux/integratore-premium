"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useScene } from "@/lib/animation";

/**
 * Reveal staggered globale.
 *
 * Anima ogni elemento marcato `data-reveal` quando entra nel viewport,
 * scaglionando quelli che entrano insieme.
 *
 * Perché ScrollTrigger.batch e non uno ScrollTrigger per elemento:
 * batch raggruppa gli elementi che entrano nella stessa finestra
 * temporale e li anima con un unico stagger. Con un trigger ciascuno
 * si otterrebbero decine di trigger indipendenti, ognuno che parte per
 * conto suo — niente stagger, e molto più lavoro a ogni refresh.
 *
 * Rapporto con la regola "un solo momento animato forte per sezione":
 * questo NON è quel momento. È un movimento di fondo, volutamente
 * corto e discreto (18 px, 0.6 s), riservato ai contenuti secondari —
 * label, paragrafi, righe di dati. Le headline restano al loro
 * momento forte, e la griglia ingredienti tiene il suo stagger.
 */
export default function ScrollReveal() {
  const root = useRef<HTMLDivElement>(null);

  useScene(root, {
    full: () => {
      // Selezione esplicita dal document: dentro un gsap.context con
      // `scope` le stringhe selettore vengono risolte SOLO nello scope,
      // e qui gli elementi da animare stanno ovunque tranne che dentro
      // questo componente.
      const targets = gsap.utils.toArray<HTMLElement>(
        document.querySelectorAll("[data-reveal]"),
      );
      if (!targets.length) return;

      gsap.set(targets, { autoAlpha: 0, y: 18 });

      const batch = ScrollTrigger.batch(targets, {
        start: "top 88%",
        once: true, // un reveal che si ripete a ogni risalita stanca
        onEnter: (group) =>
          gsap.to(group, {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.07,
            overwrite: true,
          }),
      });

      return () => batch.forEach((trigger) => trigger.kill());
    },

    // Statica: nessuno stato iniziale nascosto, quindi non c'è nulla
    // da ripristinare. Gli elementi sono già dove devono essere.
    reduced: () => {},
  });

  return <div ref={root} aria-hidden className="hidden" />;
}
