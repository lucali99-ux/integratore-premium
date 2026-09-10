"use client";

import { useRef } from "react";
import { gsap, useScene } from "@/lib/animation";
import ZigZag from "./ZigZag";

/**
 * SEZIONE 5 — Risultati.
 *
 * Momento animato: il contatore. Le barre prima/dopo crescono nella
 * stessa timeline, come accompagnamento — non sono un secondo effetto.
 *
 * Il valore finale è nell'HTML servito e il contatore parte DA zero
 * per arrivarci. Se il JavaScript non gira, il dato resta comunque
 * corretto: un contatore che scrive textContent partendo da 0
 * lascerebbe uno "0" permanente.
 */

const SCORE = 87;

const METRICS = [
  {
    label: "recupero percepito a 24h",
    before: "4,1",
    after: "7,8",
    fill: 78,
  },
  {
    label: "crampi notturni a settimana",
    before: "3,2",
    after: "0,9",
    fill: 41,
  },
  {
    label: "qualità del sonno",
    before: "5,6",
    after: "8,1",
    fill: 81,
  },
];

export default function Results() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      const number = root.current!.querySelector<HTMLElement>("[data-score]")!;
      const bars = gsap.utils.toArray<HTMLElement>("[data-bar]");
      const proxy = { value: 0 };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top 62%",
          once: true,
        },
      });

      tl.to(proxy, {
        value: SCORE,
        duration: 1.6,
        ease: "power2.out",
        // Senza snap il contatore mostrerebbe "72.4837" per un frame.
        snap: { value: 1 },
        onUpdate: () => {
          number.textContent = String(Math.round(proxy.value));
        },
      }).from(
        bars,
        {
          scaleX: 0,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.12,
          transformOrigin: "left center",
        },
        0.15,
      );
    },

    // Statica: numero e barre già al valore finale (sono lo stato
    // di partenza del markup, quindi non c'è nulla da fare).
    reduced: () => {},
  });

  return (
    <section
      id="risultati"
      ref={root}
      className="bg-paper py-[clamp(6rem,14vh,11rem)]"
      aria-label="Risultati del panel di test"
    >
      <div className="shell">
        <p
          data-reveal
          className="type-label mb-12 flex items-center gap-2 text-ink md:mb-16"
        >
          {/* Su fondo chiaro il lime non regge come testo: entra come
              forma piena accanto all'etichetta. */}
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-volt" />
          volta score
        </p>

        <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-20">
          {/* Il numero: unico punto della sezione in cui entra il lime */}
          <p className="type-display flex items-start text-mega text-volt">
            <span data-score>{SCORE}</span>
            <span className="mt-[0.12em] text-[0.34em] text-ink">%</span>
          </p>

          <p data-reveal className="max-w-[36ch] text-lg leading-snug text-ink/80 lg:mb-4 lg:text-xl">
            degli atleti del panel riporta un recupero percepito migliore entro
            quattordici giorni di assunzione quotidiana.
            <span className="type-meta mt-4 block text-ash">
              panel interno · 214 atleti · crossfit, hyrox, sport da
              combattimento · 8 settimane
            </span>
          </p>
        </div>

        {/* Prima / dopo */}
        <ul className="mt-16 md:mt-24">
          {METRICS.map((metric) => (
            <li key={metric.label}>
              {/* Divisore dinamico al posto della riga dritta */}
              <ZigZag className="text-ink/30" />

              <div className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 py-5 md:grid-cols-[minmax(0,26ch)_1fr_auto] md:py-6">
                <span className="type-label">{metric.label}</span>

                {/* La barra rappresenta il valore "dopo".
                    scaleX invece di width: nessun reflow durante la crescita. */}
                <span className="relative col-span-2 h-[3px] w-full bg-line md:col-span-1">
                  <span
                    data-bar
                    className="relative block h-full bg-ink"
                    style={{ width: `${metric.fill}%` }}
                  >
                    {/* Terminale lime: segna dove arriva il dato senza
                        affidare il lime a del testo poco contrastato. */}
                    <span
                      aria-hidden
                      className="absolute top-0 right-0 h-full w-2 bg-volt"
                    />
                  </span>
                </span>

                <span className="type-meta flex items-baseline gap-3 justify-self-end">
                  <span className="text-ash line-through">{metric.before}</span>
                  <span aria-hidden className="text-ash">
                    →
                  </span>
                  <span className="text-base">{metric.after}</span>
                </span>
              </div>
            </li>
          ))}
          <ZigZag className="text-ink/30" />
        </ul>

      </div>
    </section>
  );
}
