"use client";

import { useRef } from "react";
import { gsap, useScene } from "@/lib/animation";

/**
 * SEZIONE 4 — Ingredienti.
 *
 * Struttura della card ripresa dal riferimento: nome grande minuscolo,
 * riga meta con binomiale latino a sinistra e parola-effetto a destra,
 * visual, riga a piè di card con il dato.
 *
 * Momento animato: stagger reveal della griglia, una volta sola
 * (`once: true`). Un reveal che si ripete a ogni passaggio diventa
 * fastidioso già alla seconda risalita della pagina.
 */

const INGREDIENTS = [
  {
    name: "magnesio marino",
    latin: "magnesium marinum",
    effect: "affaticamento",
    dose: "300 mg",
    body: "riduce l'affaticamento muscolare e sostiene la sintesi di ATP nelle fibre sotto carico",
    stat: "−28% crampi notturni",
  },
  {
    name: "potassio citrato",
    latin: "kalium citricum",
    effect: "contrazione",
    dose: "250 mg",
    body: "mantiene il potenziale di membrana quando il volume di allenamento resta alto per giorni",
    stat: "+31% ritenzione",
  },
  {
    name: "sodio marino",
    latin: "natrium marinum",
    effect: "idratazione",
    dose: "180 mg",
    body: "reintegra il sodio perso col sudore e trattiene i liquidi nel compartimento giusto",
    stat: "1,2 l reidratati",
  },
  {
    name: "rodiola rosea",
    latin: "rhodiola rosea",
    effect: "adattamento",
    dose: "200 mg",
    body: "adattogeno: alza la soglia di tolleranza allo sforzo ripetuto e alla fatica centrale",
    stat: "−19% fatica percepita",
  },
  {
    name: "zenzero",
    latin: "zingiber officinale",
    effect: "infiammazione",
    dose: "150 mg",
    body: "modula la risposta infiammatoria nelle ventiquattro ore successive alla sessione",
    stat: "−22% indolenzimento",
  },
  {
    name: "vitamina b6",
    latin: "pyridoxinum",
    effect: "assorbimento",
    dose: "1,4 mg",
    body: "cofattore enzimatico: aumenta la quota di magnesio che entra davvero nella cellula",
    stat: "+40% biodisponibilità",
  },
];

export default function Ingredients() {
  const root = useRef<HTMLElement>(null);

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
        {/* Intestazione: label + titolo, come nelle altre sezioni */}
        <div className="mb-14 flex flex-col gap-6 md:mb-20 md:flex-row md:items-end md:justify-between">
          <h2 className="type-display max-w-[14ch] text-xxl">
            sei componenti, nessun riempitivo
          </h2>
          <p className="type-label max-w-[38ch] leading-relaxed text-paper/60">
            ogni dose dichiarata è quella che trovi nella bustina — nessuna
            miscela proprietaria dietro cui nascondere i grammi
          </p>
        </div>

        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {INGREDIENTS.map((item) => (
            <article
              key={item.latin}
              data-card
              data-anim-hidden="true"
              className="flex flex-col border-t border-line-dark pt-5"
            >
              <h3 className="type-display text-lead">
                {item.name}
              </h3>

              {/* Riga meta: binomiale a sinistra, effetto a destra */}
              <div className="type-meta mt-3 flex items-baseline justify-between gap-4 text-ash">
                <span>lat.// {item.latin}</span>
                <span className="text-paper">{item.effect}</span>
              </div>

              {/* Visual: la capsula, stessa geometria del resto del
                  sistema. Con le foto vere diventa un <img>. */}
              <div className="mt-6 flex aspect-[4/3] items-center justify-center rounded-[1.75rem] bg-coal">
                <span className="type-display text-lead text-paper/15">
                  {item.dose}
                </span>
              </div>

              <p className="type-label mt-5 leading-relaxed text-paper/60">
                {item.body}
              </p>

              {/* Piè di card: il dato, come "impact: +51%" nel riferimento */}
              <div className="type-meta mt-auto flex items-baseline justify-between gap-4 border-t border-line-dark pt-4 text-ash">
                <span>dose // {item.dose}</span>
                <span className="text-paper">{item.stat}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
