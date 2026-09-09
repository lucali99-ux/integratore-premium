"use client";

import type Lenis from "lenis";

/**
 * Registro dell'istanza Lenis.
 *
 * Serve perché l'intro deve bloccare lo scroll mentre gira, ma
 * CinemaIntro e SmoothScroll sono due componenti fratelli: senza un
 * punto condiviso l'unico modo sarebbe passare l'istanza attraverso
 * un context, che qui sarebbe sproporzionato.
 */
let instance: Lenis | null = null;

export function registerLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function lockScroll() {
  window.scrollTo(0, 0);
  instance?.stop();
  // Anche in nativo: con prefers-reduced-motion Lenis non esiste.
  document.documentElement.style.overflow = "hidden";
}

export function unlockScroll() {
  document.documentElement.style.overflow = "";
  instance?.start();
}
