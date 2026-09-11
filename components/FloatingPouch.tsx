"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useScene } from "@/lib/animation";

/**
 * Bustina colorata che fluttua sullo sfondo di una sezione.
 *
 * Serve a far comparire la gamma anche fuori dalla sezione dedicata,
 * come fa quella bianca nell'hero e nella sezione tipografica.
 *
 * Si muove in parallasse: scorre più lentamente della pagina, e quella
 * differenza di velocità è ciò che si legge come profondità. È
 * decorativa, quindi `aria-hidden` e fuori dal flusso.
 *
 * Il `filtro` è PROVVISORIO: tinge la bustina bianca in attesa delle
 * fotografie vere delle tre confezioni.
 */
export default function FloatingPouch({
  filtro,
  className = "",
  rotazione = -14,
  corsa = 90,
  opacita = 0.5,
}: {
  filtro: string;
  className?: string;
  /** Inclinazione fissa, in gradi. */
  rotazione?: number;
  /** Escursione verticale del parallasse, in pixel. */
  corsa?: number;
  opacita?: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  useScene(root, {
    full: () => {
      gsap.fromTo(
        root.current,
        { y: corsa },
        {
          y: -corsa,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        },
      );
    },

    // Statica: resta dov'è, senza parallasse.
    reduced: () => {},
  });

  return (
    <div
      ref={root}
      aria-hidden
      className={`pointer-events-none absolute select-none ${className}`}
      style={{ willChange: "transform" }}
    >
      <Image
        src="/product/pouch-cutout.png"
        alt=""
        width={305}
        height={1050}
        sizes="20vw"
        className="h-full w-auto"
        style={{
          filter: `${filtro} drop-shadow(-18px 30px 40px rgba(0,0,0,0.35))`,
          opacity: opacita,
          transform: `rotate(${rotazione}deg)`,
        }}
      />
    </div>
  );
}
