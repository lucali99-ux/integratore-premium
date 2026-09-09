"use client";

/**
 * VOLTA — nucleo animazioni.
 *
 * Unico punto in cui GSAP e i suoi plugin vengono registrati.
 * Registrare i plugin più volte (o durante l'SSR, dove `window`
 * non esiste) è la prima fonte di bug in un progetto Next + GSAP.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";

// gsap.registerPlugin è idempotente, ma la guardia su `window`
// evita che il modulo tocchi API di browser durante il render server.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

  // In sviluppo espongo gsap e ScrollTrigger sul window: su un sito
  // scroll-driven poter fare ScrollTrigger.getAll() dalla console è
  // l'unico modo pratico di capire perché una timeline non avanza.
  // Il ramo viene eliminato dal bundle di produzione.
  if (process.env.NODE_ENV === "development") {
    Object.assign(window, { gsap, ScrollTrigger });
  }
}

export { gsap, ScrollTrigger, SplitText, useGSAP };

/**
 * Le due condizioni di gsap.matchMedia().
 * Ogni sezione DEVE dichiarare entrambe: `FULL` anima, `REDUCED`
 * porta gli elementi direttamente allo stato finale.
 */
export const FULL = "(prefers-reduced-motion: no-preference)";
export const REDUCED = "(prefers-reduced-motion: reduce)";

/** Breakpoint condiviso con Tailwind (`md`), usato nelle scene responsive. */
export const DESKTOP = "(min-width: 768px)";

type SceneFn = (context: gsap.Context) => void | (() => void);

export interface Scenes {
  /** Animazione completa. Gira solo se l'utente non ha chiesto motion ridotto. */
  full: SceneFn;
  /**
   * Variante statica. Deve portare gli elementi al loro stato finale
   * (visibili, in posizione). Non lasciare mai questo ramo vuoto se
   * `full` parte da uno stato nascosto.
   */
  reduced: SceneFn;
}

/**
 * Hook di scena.
 *
 * - incapsula tutto in un gsap.context legato allo `scope`, così i
 *   selettori sono locali al componente e il cleanup è automatico;
 * - separa esplicitamente animazione e fallback statico;
 * - sblocca la visibilità (`data-anim-hidden`) nello stesso layout
 *   effect, evitando il flash del testo non ancora processato.
 */
export function useScene(
  scope: RefObject<HTMLElement | null>,
  scenes: Scenes,
  dependencies: unknown[] = [],
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(FULL, scenes.full);
      mm.add(REDUCED, scenes.reduced);

      // Rivelazione: eseguita comunque, anche se nessuna delle due
      // media query ha fatto match (browser molto vecchi). Il peggio
      // che può succedere è contenuto statico, mai contenuto invisibile.
      const root = scope.current;
      if (root) {
        if (root.hasAttribute("data-anim-hidden")) {
          root.removeAttribute("data-anim-hidden");
        }
        root
          .querySelectorAll("[data-anim-hidden]")
          .forEach((el) => el.removeAttribute("data-anim-hidden"));
      }

      return () => mm.revert();
    },
    { scope, dependencies },
  );
}

/**
 * Wrapper su SplitText che restituisce anche la funzione di revert.
 *
 * SplitText riscrive il DOM del testo: senza revert, un resize o un
 * re-render lo spezzerebbe due volte, duplicando i caratteri.
 * `autoSplit` + `onSplit` (GSAP 3.13+) rifanno lo split quando il
 * testo va a capo diversamente, ricreando anche l'animazione.
 */
export function splitLines(target: Element) {
  return SplitText.create(target, {
    type: "lines,chars",
    // Ogni riga viene avvolta in .split-line (overflow: clip):
    // è la "maschera" da cui i caratteri salgono.
    linesClass: "split-line",
    mask: "lines",
    autoSplit: true,
    reduceWhiteSpace: false,
  });
}
