"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/animation";

/**
 * Barra fissa in fondo alla viewport: valori del brand + progresso.
 *
 * Due accorgimenti che valgono la pena:
 *
 * 1. `mix-blend-difference` su testo bianco → la barra si inverte da
 *    sola sopra le sezioni chiare e scure. Nessuna logica JS per
 *    sapere che colore ha il fondo che scorre sotto.
 *
 * 2. La percentuale è scritta direttamente nel nodo DOM dentro
 *    onUpdate. Con uno useState React ri-renderizzerebbe il
 *    componente a ogni frame di scroll per cambiare due cifre.
 */
export default function ScrollProgress() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const fill = root.current!.querySelector<HTMLElement>("[data-fill]")!;
      const value = root.current!.querySelector<HTMLElement>("[data-value]")!;

      // scaleX su un elemento con transform-origin left: nessun
      // ricalcolo di layout, solo composite. Animare `width`
      // costerebbe un reflow per frame.
      gsap.set(fill, { scaleX: 0, transformOrigin: "left center" });

      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          fill.style.transform = `scaleX(${self.progress})`;
          value.textContent = `${Math.round(self.progress * 100)}%`;
        },
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mix-blend-difference"
    >
      <div className="shell flex items-center justify-between gap-6 pb-4 text-white md:pb-5">
        {/* Valori del brand: la riga che non cambia mai, come firma */}
        <p className="type-label hidden sm:block">
          purezza vegetale <span className="px-1 opacity-50">·</span> ricerca
          applicata <span className="px-1 opacity-50">·</span> prestazione
        </p>

        {/* Indicatore di scroll */}
        <div className="ml-auto flex items-center gap-3">
          <span className="type-label">scorri</span>
          <span className="relative block h-px w-20 bg-white/30 md:w-32">
            <span
              data-fill
              className="absolute inset-0 block bg-white"
              style={{ transform: "scaleX(0)" }}
            />
          </span>
          <span data-value className="type-meta w-9 text-right">
            0%
          </span>
        </div>
      </div>
    </div>
  );
}
