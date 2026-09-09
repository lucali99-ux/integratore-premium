"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/animation";
import { registerLenis } from "@/lib/scroll";

/**
 * Smooth scroll globale.
 *
 * Monta Lenis e — punto cruciale — lo sincronizza con il ticker di GSAP.
 * Due RAF separati (uno di Lenis, uno di GSAP) fanno leggere a
 * ScrollTrigger una posizione vecchia di un frame: è la causa del
 * jitter sugli elementi pinnati.
 *
 * Non renderizza nulla: avvolge i figli e basta.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Lo smooth scroll è esso stesso movimento aggiunto: se l'utente
    // lo ha disattivato a livello di sistema, si usa lo scroll nativo.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1, // inerzia: sotto 1 è nervoso, sopra 1.4 è "melmoso"
      // Ease esponenziale: parte veloce, si ferma morbido.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Su touch NON si intercetta: lo scroll nativo mobile è già
      // fluido e sovrascriverlo peggiora la sensazione e la batteria.
      syncTouch: false,
    });

    // In sviluppo espongo l'istanza: su un sito scroll-driven è
    // indispensabile poter fare window.__lenis.scrollTo(...) dalla
    // console per ispezionare un punto preciso della timeline.
    // Il ramo viene eliminato dal bundle di produzione.
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    }

    // Registrata nel modulo condiviso: l'intro deve poter fermare lo
    // scroll mentre gira, e vive in un componente fratello.
    registerLenis(lenis);

    // 1. Ogni movimento di Lenis aggiorna ScrollTrigger.
    lenis.on("scroll", ScrollTrigger.update);

    // 2. Un solo loop: GSAP guida Lenis (il ticker passa i secondi, raf vuole ms).
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);

    // 3. Niente lag smoothing: falserebbe le animazioni scrubbed.
    gsap.ticker.lagSmoothing(0);

    // I link interni passano da Lenis, altrimenti l'ancora nativa
    // "teletrasporta" la pagina rompendo l'inerzia.
    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: 0 });
    };
    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      registerLenis(null);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33); // ripristina il default
      lenis.destroy();
    };
  }, []);

  /**
   * I font display cambiano le altezze del testo: se ScrollTrigger
   * calcola gli start/end prima che siano caricati, i trigger finiscono
   * qualche decina di pixel fuori posto.
   */
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  return <>{children}</>;
}
