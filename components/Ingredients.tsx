"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useScene } from "@/lib/animation";
import ZigZag from "./ZigZag";

/**
 * SEZIONE 4 — Ingredienti.
 *
 * Ogni card ha come fondo la macrofotografia del componente, con il
 * testo sopra su una velatura scura. Al passaggio del mouse la foto si
 * avvicina, la descrizione si apre e il filetto si tinge di lime.
 *
 * Momento animato della sezione: lo stagger reveal della griglia, una
 * volta sola (`once: true`). Un reveal che si ripete a ogni passaggio
 * diventa fastidioso già alla seconda risalita della pagina.
 *
 * L'apertura della descrizione è riservata ai dispositivi con
 * puntatore: su touch non esiste hover, e il testo resta sempre
 * visibile invece di essere irraggiungibile.
 */

const INGREDIENTS = [
  {
    name: "magnesio marino",
    latin: "magnesium marinum",
    effect: "affaticamento",
    dose: "300 mg",
    body: "riduce l'affaticamento muscolare e sostiene la sintesi di ATP nelle fibre sotto carico",
    stat: "−28% crampi notturni",
    image: "/ingredienti/magnesio.jpg",
  },
  {
    name: "potassio citrato",
    latin: "kalium citricum",
    effect: "contrazione",
    dose: "250 mg",
    body: "mantiene il potenziale di membrana quando il volume di allenamento resta alto per giorni",
    stat: "+31% ritenzione",
    image: "/ingredienti/potassio.jpg",
  },
  {
    name: "sodio marino",
    latin: "natrium marinum",
    effect: "idratazione",
    dose: "180 mg",
    body: "reintegra il sodio perso col sudore e trattiene i liquidi nel compartimento giusto",
    stat: "1,2 l reidratati",
    image: "/ingredienti/sodio.jpg",
  },
  {
    name: "rodiola rosea",
    latin: "rhodiola rosea",
    effect: "adattamento",
    dose: "200 mg",
    body: "adattogeno: alza la soglia di tolleranza allo sforzo ripetuto e alla fatica centrale",
    stat: "−19% fatica percepita",
    image: "/ingredienti/rodiola.jpg",
  },
  {
    name: "zenzero",
    latin: "zingiber officinale",
    effect: "infiammazione",
    dose: "150 mg",
    body: "modula la risposta infiammatoria nelle ventiquattro ore successive alla sessione",
    stat: "−22% indolenzimento",
    image: "/ingredienti/zenzero.jpg",
  },
  {
    name: "vitamina b6",
    latin: "pyridoxinum",
    effect: "assorbimento",
    dose: "1,4 mg",
    body: "cofattore enzimatico: aumenta la quota di magnesio che entra davvero nella cellula",
    stat: "+40% biodisponibilità",
    image: "/ingredienti/vitamina-b6.jpg",
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
            ogni dose dichiarata è quella che trovi nella bustina — nessuna
            miscela proprietaria dietro cui nascondere i grammi
          </p>
        </div>

        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {INGREDIENTS.map((item) => (
            <article
              key={item.latin}
              data-card
              data-anim-hidden="true"
              data-cursor
              className="group relative aspect-[4/5] overflow-hidden rounded-[1.5rem]"
            >
              {/* Fondo: la macrofotografia del componente */}
              <Image
                src={item.image}
                alt={`${item.name}, fotografia macro`}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
              />

              {/* Velatura: senza, il testo bianco sparirebbe sulle zone
                  chiare dei cristalli. Densa solo nel terzo basso, dove
                  il testo si appoggia; sopra lascia respirare la foto. */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 via-45% to-transparent" />

              <div className="relative flex h-full flex-col justify-end p-6 md:p-7">
                {/* Riga meta: binomiale a sinistra, effetto a destra */}
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

                {/*
                  Descrizione: nascosta finché non passi sopra, ma solo
                  dove l'hover esiste davvero. Su touch resta aperta.
                */}
                <p
                  data-desc
                  className="type-label overflow-hidden leading-relaxed text-paper/70 transition-all duration-500 ease-out [@media(hover:hover)]:max-h-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:mt-4 [@media(hover:hover)]:group-hover:max-h-32 [@media(hover:hover)]:group-hover:opacity-100 max-[767px]:mt-4"
                >
                  {item.body}
                </p>

                {/* Piè di card: dosaggio e dato */}
                <div className="type-meta mt-5 flex items-baseline justify-between gap-4 text-paper/50">
                  <span>dose // {item.dose}</span>
                  <span className="text-volt">{item.stat}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Divisore dinamico in chiusura di sezione */}
        <ZigZag className="mt-16 text-paper/30 md:mt-20" />
      </div>
    </section>
  );
}
