"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useScene } from "@/lib/animation";

/**
 * SEZIONE 3a — Prodotto sovrapposto alla tipografia.
 *
 * Momento animato: parallasse in scrub. Il prodotto attraversa il
 * blocco di testo muovendosi più lentamente e ruotando appena: è la
 * differenza di velocità a produrre la profondità, non un'ombra.
 *
 * Il testo NON si anima. È già alla sua scala massima e resta fermo:
 * un secondo effetto qui trasformerebbe la sezione in rumore.
 */
export default function ProductType() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      gsap.fromTo(
        root.current!.querySelector("[data-float]"),
        { yPercent: 14, rotate: -18 },
        {
          yPercent: -14,
          rotate: -6,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom", // entra appena la sezione affiora
            end: "bottom top", // finisce quando è uscita del tutto
            scrub: 0.7,
          },
        },
      );
    },

    // Statica: il prodotto resta nella sua posizione centrale,
    // già ruotato. La composizione regge senza movimento.
    reduced: () => {
      gsap.set(root.current!.querySelector("[data-float]"), {
        yPercent: 0,
        rotate: -12,
      });
    },
  });

  return (
    <section
      ref={root}
      className="relative overflow-hidden bg-paper py-[clamp(8rem,20vh,16rem)]"
      aria-label="Il prodotto"
    >
      <div className="shell relative">
        {/* Wrapper relativo attorno alla sola headline: è rispetto a
            QUESTO che il prodotto viene posizionato, così lo attraversa
            sempre, qualunque sia l'altezza del resto della sezione. */}
        <div className="relative">
          <h2 className="type-display relative z-0 text-mega">
            <span className="block">tutto parte</span>
            <span className="block">da una bustina</span>
          </h2>

          {/*
            Il prodotto passa SOPRA la tipografia, come nel riferimento.
            Altezza in vh e non in % della headline: deve restare grande
            anche quando il testo va a capo diversamente.
            will-change lo promuove a layer di composizione, così il
            testo sotto non viene ridisegnato a ogni frame di parallasse.
          */}
          <Image
            data-float
            src="/product/pouch-cutout.png"
            alt=""
            aria-hidden
            width={305}
            height={1050}
            className="pointer-events-none absolute top-1/2 right-[2%] z-10 h-[42vh] w-auto max-w-none -translate-y-1/2 md:right-[14%] md:h-[74vh]"
            style={{
              willChange: "transform",
              filter: "drop-shadow(-30px 40px 60px rgba(11,11,11,0.28))",
            }}
          />
        </div>

        {/* Micro-copy in basso: stessa gerarchia dell'hero */}
        <div className="relative z-20 mt-12 grid gap-8 md:mt-20 md:grid-cols-[1fr_auto] md:items-end">
          <p className="type-label max-w-[46ch] leading-relaxed text-ink/70">
            4,5 grammi di polvere micronizzata che si sciolgono in acqua senza
            residuo — nessuna capsula da deglutire, nessun dosatore da lavare,
            nessuna scusa per saltarla
          </p>
          <p className="type-meta text-ash">lat.// magnesium marinum</p>
        </div>
      </div>
    </section>
  );
}
