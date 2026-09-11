"use client";

import { useRef, useState } from "react";
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
    commento:
      "Il terzo giorno di una settimana pesante non arrivo più con le gambe vuote. Non è che non sento la fatica: la sento dopo.",
    come: "una la sera, in mezzo litro, appena chiuso il metcon",
    daQuando: "da febbraio, preparando il throwdown",
  },
  {
    name: "marco bellandi",
    discipline: "boxe",
    stat: "18 incontri in due stagioni",
    image: "/atleti/marco.jpg",
    commento:
      "I crampi al polpaccio la notte prima del match sono spariti. Era la cosa che mi mangiava il sonno, e nel taglio peso il sonno è metà del lavoro.",
    come: "due al giorno in settimana di scarico, una quando non taglio",
    daQuando: "da un anno e mezzo, me l'ha messa il preparatore",
  },
  {
    name: "elias roth",
    discipline: "hyrox",
    stat: "sub-60 in categoria pro",
    image: "/atleti/elias.jpg",
    commento:
      "Recupero meglio fra una stazione e l'altra. Il quarto blocco non è più quello dove perdo tutto quello che ho guadagnato prima.",
    come: "una al mattino e una subito dopo la sessione lunga",
    daQuando: "da otto mesi",
  },
];

export default function Athletes() {
  const root = useRef<HTMLElement>(null);
  // Più ritratti possono restare girati insieme: chi confronta due
  // testimonianze non deve richiudere la prima per aprire la seconda.
  const [girati, setGirati] = useState<Set<string>>(new Set());

  const gira = (id: string) =>
    setGirati((precedenti) => {
      const successivi = new Set(precedenti);
      if (successivi.has(id)) successivi.delete(id);
      else successivi.add(id);
      return successivi;
    });

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

        {/* Due colonne fino a 1024, tre sopra. A tre colonne su 768px
            ogni card è larga ~230px, e il retro — citazione più due
            voci — arrivava a riempirla fino ai bordi. */}
        <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {ATHLETES.map((athlete) => {
            const girato = girati.has(athlete.name);

            return (
              <article key={athlete.name} data-reveal>
                {/*
                  Gira solo la fotografia: nome e disciplina restano
                  fermi sotto, così mentre leggi il commento sai sempre
                  di chi è. Riusa le classi .scheda delle card
                  ingrediente, quindi eredita anche il comportamento
                  con prefers-reduced-motion.
                */}
                <button
                  type="button"
                  data-flipped={girato}
                  aria-expanded={girato}
                  aria-label={`Leggi il commento di ${athlete.name}`}
                  onClick={() => gira(athlete.name)}
                  className="scheda group relative block aspect-[3/4] w-full text-left"
                >
                  <div className="scheda-corpo">
                    {/* ---------- FRONTE ---------- */}
                    <div
                      className="scheda-faccia scheda-fronte"
                      aria-hidden={girato}
                      inert={girato}
                    >
                      <Image
                        src={athlete.image}
                        alt={`${athlete.name}, ${athlete.discipline}`}
                        fill
                        sizes="(min-width: 640px) 33vw, 100vw"
                        className="object-cover grayscale transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
                      />
                      {/* Velatura leggera: uniforma i tre scatti e li
                          lega al nero della sezione. */}
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />

                      <span
                        aria-hidden
                        className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full border border-paper/30 text-paper/70 transition-all duration-500 group-hover:rotate-180 group-hover:border-volt group-hover:text-volt"
                      >
                        ↻
                      </span>
                    </div>

                    {/* ---------- RETRO ---------- */}
                    <div
                      className="scheda-faccia scheda-retro bg-coal"
                      aria-hidden={!girato}
                      inert={!girato}
                    >
                      <Image
                        src={athlete.image}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 33vw, 100vw"
                        className="object-cover opacity-[0.1] grayscale"
                      />
                      <span
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-px bg-volt"
                      />

                      <div className="relative flex h-full flex-col p-6 md:p-7">
                        <div className="type-meta flex items-baseline justify-between gap-4 text-paper/50">
                          <span>{athlete.discipline}</span>
                          <span
                            aria-hidden
                            className="text-paper/70 transition-colors group-hover:text-volt"
                          >
                            ↺ chiudi
                          </span>
                        </div>

                        <blockquote className="mt-auto">
                          <p className="type-label leading-relaxed text-paper/85">
                            «{athlete.commento}»
                          </p>
                        </blockquote>

                        <dl className="mt-6 space-y-3 border-t border-line-dark pt-5">
                          <div>
                            <dt className="type-meta text-volt">come</dt>
                            <dd className="type-label mt-1 text-paper/65">
                              {athlete.come}
                            </dd>
                          </div>
                          <div>
                            <dt className="type-meta text-volt">da quando</dt>
                            <dd className="type-label mt-1 text-paper/65">
                              {athlete.daQuando}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                </button>

                <h3 className="type-display mt-5 text-lead">{athlete.name}</h3>

                <div className="type-meta mt-2 flex items-baseline justify-between gap-4 text-paper/50">
                  <span>{athlete.discipline}</span>
                  <span className="text-volt">{athlete.stat}</span>
                </div>
              </article>
            );
          })}
        </div>

        <p data-reveal className="type-meta mt-10 text-ash">
          testimonianze fittizie, a scopo dimostrativo
        </p>
      </div>
    </section>
  );
}
