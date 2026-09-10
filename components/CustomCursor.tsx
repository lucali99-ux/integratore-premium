"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { introDone } from "@/lib/intro";
import { gsap } from "@/lib/animation";

/**
 * Cursore custom.
 *
 * Due elementi: un punto che segue il mouse in modo quasi istantaneo e
 * un anello che lo insegue con ritardo. È lo scarto fra i due a dare
 * la sensazione di inerzia.
 *
 * Tre scelte che contano:
 *
 * 1. `mix-blend-difference`, come header e barra di progresso: il
 *    cursore si inverte da solo sopra le sezioni chiare e scure. A
 *    colore fisso sparirebbe su metà del sito.
 *
 * 2. `gsap.quickTo` e non `gsap.to` dentro pointermove: quickTo crea
 *    UN tween riutilizzabile e ne aggiorna il valore. Creare un tween
 *    nuovo a ogni movimento del mouse significa allocare e smaltire
 *    decine di oggetti al secondo.
 *
 * 3. Non viene montato affatto su touch (`pointer: coarse`) né con
 *    prefers-reduced-motion: nel primo caso non c'è un puntatore da
 *    sostituire, nel secondo è movimento aggiunto e basta.
 */

/** Elementi che fanno reagire il cursore. */
const INTERACTIVE = 'a, button, [role="button"], [data-cursor]';

const POINTER_FINE = "(pointer: fine)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Il cursore è attivo solo con un puntatore di precisione e senza
 * richiesta di movimento ridotto.
 *
 * useSyncExternalStore e non useState+useEffect: è l'API pensata per
 * sottoscriversi a una fonte esterna come matchMedia. Dà lo snapshot
 * server (`false`, in SSR non c'è puntatore) senza mismatch di
 * idratazione, evita il setState dentro l'effetto — e in più reagisce
 * dal vivo se colleghi un mouse o cambi l'impostazione di sistema.
 */
function useCursorEnabled() {
  return useSyncExternalStore(
    (onChange) => {
      const queries = [POINTER_FINE, REDUCED_MOTION].map((q) =>
        window.matchMedia(q),
      );
      queries.forEach((q) => q.addEventListener("change", onChange));
      return () =>
        queries.forEach((q) => q.removeEventListener("change", onChange));
    },
    () =>
      window.matchMedia(POINTER_FINE).matches &&
      !window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export default function CustomCursor() {
  const root = useRef<HTMLDivElement>(null);
  const supportato = useCursorEnabled();

  /**
   * Il cursore non esiste finché l'intro non ha finito.
   *
   * Durante l'apertura il puntatore serve solo a saltare, e un anello
   * che insegue sopra i pannelli neri distrae dal momento. Lo stato
   * viene aggiornato dentro la callback della promessa, non nel corpo
   * dell'effetto: un setState sincrono lì scatenerebbe render a
   * cascata (ed è quello che react-hooks/set-state-in-effect vieta).
   */
  const [introFinita, setIntroFinita] = useState(false);
  useEffect(() => {
    let vivo = true;
    introDone.then(() => {
      if (vivo) setIntroFinita(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const enabled = supportato && introFinita;

  useEffect(() => {
    if (!enabled || !root.current) return;

    const ring = root.current.querySelector<HTMLElement>("[data-ring]")!;
    const dot = root.current.querySelector<HTMLElement>("[data-dot]")!;

    // xPercent/yPercent per il centraggio invece delle classi
    // -translate-x-1/2 di Tailwind: sono entrambe transform, e GSAP
    // sovrascriverebbe quelle di Tailwind scentrando gli elementi.
    gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });

    // Il punto quasi non ha ritardo, l'anello sì: lo scarto fra i due
    // è ciò che si legge come inerzia.
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "none" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "none" });

    let visible = false;
    const onMove = (event: PointerEvent) => {
      if (!visible) {
        visible = true;
        // Al primo movimento gli elementi vengono piazzati senza
        // animazione, altrimenti entrerebbero volando dall'angolo.
        gsap.set([ring, dot], { x: event.clientX, y: event.clientY });
        gsap.to(root.current, { autoAlpha: 1, duration: 0.25 });
      }
      ringX(event.clientX);
      ringY(event.clientY);
      dotX(event.clientX);
      dotY(event.clientY);
    };

    // Delegazione su document: un listener solo, e funziona anche sugli
    // elementi che compaiono dopo (i callout della sequenza prodotto).
    const onOver = (event: PointerEvent) => {
      const target = (event.target as HTMLElement)?.closest?.(INTERACTIVE);
      if (!target) return;
      gsap.to(ring, { scale: 2.4, borderWidth: 1, duration: 0.3, ease: "power3.out" });
      gsap.to(dot, { scale: 0, duration: 0.25, ease: "power3.out" });
    };

    const onOut = (event: PointerEvent) => {
      const target = (event.target as HTMLElement)?.closest?.(INTERACTIVE);
      if (!target) return;
      // relatedTarget dentro lo stesso elemento = spostamento interno,
      // non un'uscita: senza questo controllo il cursore sfarfalla
      // passando sopra il testo dentro un link.
      const to = event.relatedTarget as HTMLElement | null;
      if (to && target.contains(to)) return;
      gsap.to(ring, { scale: 1, duration: 0.3, ease: "power3.out" });
      gsap.to(dot, { scale: 1, duration: 0.25, ease: "power3.out" });
    };

    const onDown = () => gsap.to(ring, { scale: 0.8, duration: 0.18 });
    const onUp = () => gsap.to(ring, { scale: 1, duration: 0.25 });

    // Fuori dalla finestra il cursore va nascosto, altrimenti resta
    // appiccicato all'ultimo bordo toccato.
    const onLeave = () => gsap.to(root.current, { autoAlpha: 0, duration: 0.2 });
    const onEnter = () => gsap.to(root.current, { autoAlpha: 1, duration: 0.2 });

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);
    document.documentElement.classList.add("cursore-custom");

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
      document.documentElement.classList.remove("cursore-custom");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={root}
      aria-hidden
      // z-[200]: sopra anche all'intro (z-100), che è cliccabile.
      className="pointer-events-none fixed inset-0 z-[200] opacity-0 mix-blend-difference"
    >
      <div
        data-ring
        className="absolute top-0 left-0 h-9 w-9 rounded-full border border-white"
      />
      <div
        data-dot
        className="absolute top-0 left-0 h-1.5 w-1.5 rounded-full bg-white"
      />
    </div>
  );
}
