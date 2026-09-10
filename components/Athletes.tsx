"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, SplitText, useScene } from "@/lib/animation";
import ZigZag from "./ZigZag";

/**
 * SEZIONE — Chi la usa.
 *
 * Momento animato: la citazione gigante si riempie parola per parola
 * in scrub, come nella sezione filosofia. A differenza di quella però
 * NON è pinnata: due sezioni pinnate ravvicinate obbligherebbero a
 * scorrere due volte a vuoto, e il riempimento funziona bene anche
 * mentre il blocco attraversa la viewport.
 *
 * Le testimonianze sono inventate — il brand è fittizio — e la pagina
 * lo dichiara sotto la griglia, non solo nel footer.
 */

const ATHLETES = [
  {
    name: "nadia ferretti",
    discipline: "crossfit",
    stat: "3ª — italian throwdown 2025",
    image: "/atleti/nadia.jpg",
  },
  {
    name: "marco bellandi",
    discipline: "boxe",
    stat: "18 incontri in due stagioni",
    image: "/atleti/marco.jpg",
  },
  {
    name: "elias roth",
    discipline: "hyrox",
    stat: "sub-60 in categoria pro",
    image: "/atleti/elias.jpg",
  },
];

export default function Athletes() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      const copy = root.current!.querySelector("[data-quote]")!;

      const split = SplitText.create(copy, {
        type: "words",
        autoSplit: true,
        onSplit: (self) =>
          gsap.fromTo(
            self.words,
            { opacity: 0.16 },
            {
              opacity: 1,
              ease: "none",
              stagger: 1,
              scrollTrigger: {
                trigger: copy,
                // Il riempimento si consuma mentre la citazione
                // attraversa la metà alta della viewport.
                start: "top 82%",
                end: "bottom 45%",
                scrub: 0.8,
              },
            },
          ),
      });

      return () => split.revert();
    },

    // Statica: citazione piena, nessuno split.
    reduced: () => {},
  });

  return (
    <section
      id="atleti"
      ref={root}
      className="bg-ink py-[clamp(6rem,14vh,11rem)] text-paper"
      aria-label="Atleti che usano volta"
    >
      <div className="shell">
        <p data-reveal className="type-label mb-12 text-volt md:mb-16">
          chi la usa
        </p>

        <figure>
          <blockquote
            data-quote
            data-anim-hidden="true"
            className="type-display max-w-[20ch] text-xxl"
          >
            la differenza non si vede il giorno dopo, si vede alla terza
            sessione della settimana
          </blockquote>
          <figcaption
            data-reveal
            className="type-meta mt-8 flex items-center gap-3 text-paper/50"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-volt" />
            nadia ferretti — crossfit
          </figcaption>
        </figure>

        <ZigZag className="mt-16 text-paper/25 md:mt-24" />

        <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-3">
          {ATHLETES.map((athlete) => (
            <article
              key={athlete.name}
              data-reveal
              data-cursor
              className="group"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-[1.25rem]">
                <Image
                  src={athlete.image}
                  alt={`${athlete.name}, ${athlete.discipline}`}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover grayscale transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
                />
                {/* Velatura leggera: uniforma i tre scatti e li lega
                    al nero della sezione. */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              </div>

              <h3 className="type-display mt-5 text-lead">{athlete.name}</h3>

              <div className="type-meta mt-2 flex items-baseline justify-between gap-4 text-paper/50">
                <span>{athlete.discipline}</span>
                <span className="text-volt">{athlete.stat}</span>
              </div>
            </article>
          ))}
        </div>

        <p data-reveal className="type-meta mt-10 text-ash">
          testimonianze fittizie, a scopo dimostrativo
        </p>
      </div>
    </section>
  );
}
