"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap, useScene } from "@/lib/animation";
import ZigZag from "./ZigZag";

/**
 * SEZIONE 4 — Ingredienti.
 *
 * Ogni card ha come fronte la macrofotografia del componente. Al click
 * si gira e sul retro racconta da dove viene estratto in natura e che
 * lavoro fa dentro la formula.
 *
 * Momento animato della sezione: lo stagger reveal della griglia, una
 * volta sola (`once: true`). La rotazione delle card non conta come
 * secondo momento: è una risposta a un gesto dell'utente, non
 * qualcosa che parte da solo allo scroll.
 *
 * Accessibilità: la card È un <button> con aria-expanded, quindi si
 * gira anche da tastiera. La faccia nascosta viene marcata `inert`,
 * altrimenti uno screen reader leggerebbe il testo del retro mentre è
 * voltato dall'altra parte.
 */

const INGREDIENTS = [
  {
    name: "magnesio marino",
    latin: "magnesium marinum",
    effect: "affaticamento",
    dose: "300 mg",
    stat: "−28% crampi notturni",
    image: "/ingredienti/magnesio.jpg",
    natura:
      "Ricavato per evaporazione solare dell'acqua marina nelle saline del Mediterraneo: la salamoia residua viene lavata e lasciata cristallizzare, senza passaggi di sintesi.",
    formula:
      "È la base della bustina. Fornisce lo ione magnesio già in forma disciolta, che l'intestino assorbe senza doverlo staccare da un sale di sintesi.",
  },
  {
    name: "potassio citrato",
    latin: "kalium citricum",
    effect: "contrazione",
    dose: "250 mg",
    stat: "+31% ritenzione",
    image: "/ingredienti/potassio.jpg",
    natura:
      "Il potassio viene da depositi di silvinite: sali lasciati da bacini marini prosciugati milioni di anni fa. L'acido citrico che lo lega nasce invece da fermentazione.",
    formula:
      "Tampona la bevanda. Il citrato alza il pH della soluzione e rende la formula meno aggressiva sullo stomaco quando la bevi subito dopo lo sforzo.",
  },
  {
    name: "sodio marino",
    latin: "natrium marinum",
    effect: "idratazione",
    dose: "180 mg",
    stat: "1,2 l reidratati",
    image: "/ingredienti/sodio.jpg",
    natura:
      "Fiocchi raccolti a mano dalla superficie delle vasche di evaporazione, dove il sale cristallizza per primo formando piramidi cave e sottilissime.",
    formula:
      "È il vettore dell'acqua. Senza sodio il liquido che bevi attraversa l'intestino senza essere trattenuto, e la reidratazione semplicemente non avviene.",
  },
  {
    name: "rodiola rosea",
    latin: "rhodiola rosea",
    effect: "adattamento",
    dose: "200 mg",
    stat: "−19% fatica percepita",
    image: "/ingredienti/rodiola.jpg",
    natura:
      "Radice raccolta oltre i duemila metri sui massicci scandinavi e siberiani, dove il freddo concentra i glicosidi. Estratta in acqua ed etanolo, poi essiccata.",
    formula:
      "È l'adattogeno: non aggiunge energia, alza la soglia oltre la quale il sistema nervoso centrale comincia a segnalare fatica.",
  },
  {
    name: "zenzero",
    latin: "zingiber officinale",
    effect: "infiammazione",
    dose: "150 mg",
    stat: "−22% indolenzimento",
    image: "/ingredienti/zenzero.jpg",
    natura:
      "Rizoma coltivato in India e Nigeria, estratto con CO2 supercritica a bassa temperatura: il calore degraderebbe i gingeroli, che sono la parte utile.",
    formula:
      "Lavora sull'infiammazione nelle ore successive alla sessione, ed è anche ciò che dà alla bustina la nota calda che copre il salato.",
  },
  {
    name: "vitamina b6",
    latin: "pyridoxinum",
    effect: "assorbimento",
    dose: "1,4 mg",
    stat: "+40% biodisponibilità",
    image: "/ingredienti/vitamina-b6.jpg",
    natura:
      "In natura sta nei cereali integrali e nel pesce. Qui è nella forma già attiva, la stessa che il fegato produrrebbe convertendola.",
    formula:
      "È il cofattore. Senza, buona parte del magnesio resta nel sangue invece di entrare nella cellula: è il motivo per cui basta una dose così piccola.",
  },
];

export default function Ingredients() {
  const root = useRef<HTMLElement>(null);
  // Più card possono restare girate insieme: chi confronta due
  // ingredienti non deve richiudere il primo per aprire il secondo.
  const [girate, setGirate] = useState<Set<string>>(new Set());

  const gira = (id: string) =>
    setGirate((precedenti) => {
      const successive = new Set(precedenti);
      if (successive.has(id)) successive.delete(id);
      else successive.add(id);
      return successive;
    });

  useScene(root, {
    full: () => {
      gsap.from("[data-card]", {
        y: 48,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        // stagger "grid": le card entrano seguendo la lettura per
        // righe, qualunque sia il numero di colonne del breakpoint.
        stagger: { each: 0.08, from: "start", grid: "auto" },
        scrollTrigger: {
          trigger: root.current,
          start: "top 65%",
          once: true, // niente replay alla risalita
        },
      });
    },

    // Statica: le card sono già nella loro posizione finale.
    reduced: () => {},
  });

  return (
    <section
      id="formula"
      ref={root}
      className="bg-ink py-[clamp(6rem,14vh,11rem)] text-paper"
      aria-label="Gli ingredienti della formula"
    >
      <div className="shell">
        <div className="mb-14 flex flex-col gap-6 md:mb-20 md:flex-row md:items-end md:justify-between">
          <div>
            <p data-reveal className="type-label mb-6 text-volt">
              la formula
            </p>
            <h2 data-reveal className="type-display max-w-[14ch] text-xxl">
              sei componenti, nessun riempitivo
            </h2>
          </div>
          <p
            data-reveal
            className="type-label max-w-[38ch] leading-relaxed text-paper/60"
          >
            ogni dose dichiarata è quella che trovi nella bustina — tocca una
            card per vedere da dove viene e cosa ci fa
          </p>
        </div>

        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {INGREDIENTS.map((item) => {
            const girata = girate.has(item.latin);

            return (
              <button
                key={item.latin}
                type="button"
                data-card
                data-anim-hidden="true"
                data-flipped={girata}
                aria-expanded={girata}
                onClick={() => gira(item.latin)}
                className="scheda group relative block aspect-[4/5] w-full text-left"
              >
                <div className="scheda-corpo">
                  {/* ---------- FRONTE ---------- */}
                  <div
                    className="scheda-faccia scheda-fronte"
                    aria-hidden={girata}
                    inert={girata}
                  >
                    <Image
                      src={item.image}
                      alt={`${item.name}, fotografia macro`}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
                    />

                    {/* Velatura: senza, il testo bianco sparirebbe sulle
                        zone chiare dei cristalli. Densa solo nel terzo
                        basso, dove il testo si appoggia. */}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 via-45% to-transparent" />

                    {/* Affordance: dice che la card si gira. Ruota al
                        passaggio, così l'invito si legge prima del click. */}
                    <span
                      aria-hidden
                      className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full border border-paper/30 text-paper/70 transition-all duration-500 group-hover:rotate-180 group-hover:border-volt group-hover:text-volt"
                    >
                      ↻
                    </span>

                    <div className="relative flex h-full flex-col justify-end p-6 md:p-7">
                      <div className="type-meta mb-3 flex items-baseline justify-between gap-4 text-paper/50">
                        <span>lat.// {item.latin}</span>
                        <span className="text-volt">{item.effect}</span>
                      </div>

                      <h3 className="type-display text-[clamp(1.5rem,2.4vw,2.25rem)]">
                        {item.name}
                      </h3>

                      {/* Filetto che si tinge e si allunga al passaggio */}
                      <span className="mt-4 block h-px w-full bg-paper/25">
                        <span className="block h-full w-0 bg-volt transition-[width] duration-500 ease-out group-hover:w-full" />
                      </span>

                      <div className="type-meta mt-5 flex items-baseline justify-between gap-4 text-paper/50">
                        <span>dose // {item.dose}</span>
                        <span className="text-volt">{item.stat}</span>
                      </div>
                    </div>
                  </div>

                  {/* ---------- RETRO ---------- */}
                  <div
                    className="scheda-faccia scheda-retro bg-coal"
                    aria-hidden={!girata}
                    inert={!girata}
                  >
                    {/* Traccia della fotografia, appena percettibile:
                        lega il retro al fronte senza rubare leggibilità
                        al testo. */}
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover opacity-[0.12]"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-px bg-volt"
                    />

                    <div className="relative flex h-full flex-col p-6 md:p-7">
                      <div className="type-meta flex items-baseline justify-between gap-4 text-paper/50">
                        <span>lat.// {item.latin}</span>
                        <span
                          aria-hidden
                          className="text-paper/70 transition-colors group-hover:text-volt"
                        >
                          ↺ chiudi
                        </span>
                      </div>

                      <h3 className="type-display mt-3 text-[clamp(1.25rem,1.9vw,1.75rem)]">
                        {item.name}
                      </h3>

                      <div className="mt-auto space-y-5 pt-6">
                        <div>
                          <p className="type-label mb-2 text-volt">in natura</p>
                          <p className="type-label leading-relaxed text-paper/75">
                            {item.natura}
                          </p>
                        </div>
                        <div>
                          <p className="type-label mb-2 text-volt">
                            nella bustina
                          </p>
                          <p className="type-label leading-relaxed text-paper/75">
                            {item.formula}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <ZigZag className="mt-16 text-paper/30 md:mt-20" />
      </div>
    </section>
  );
}
