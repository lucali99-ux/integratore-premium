"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useScene, DESKTOP } from "@/lib/animation";

/**
 * SEZIONE — La gamma.
 *
 * Tre varianti di bustina presentate in scorrimento ORIZZONTALE:
 * la sezione si pinna e il binario trasla lateralmente mentre si
 * scorre in basso. Ogni slide apre una "finestra" con la spiegazione
 * quando arriva al centro.
 *
 * Scelte tecniche:
 *
 * - lo scorrimento orizzontale vale solo da 768px in su. Su touch uno
 *   scrub laterale entra in conflitto col gesto di scroll nativo e la
 *   pagina diventa difficile da governare: lì le slide si impilano in
 *   verticale e la sezione resta una lista normale. Il ramo è gestito
 *   con un matchMedia annidato, così il passaggio da una modalità
 *   all'altra funziona anche ridimensionando la finestra;
 *
 * - la distanza di scroll è calcolata da `scrollWidth`, non scritta a
 *   mano: con `invalidateOnRefresh` si ricalcola a ogni resize, e il
 *   binario finisce sempre esattamente a filo dell'ultima slide;
 *
 * - le finestre si aprono da sole all'arrivo della slide, non al
 *   click: mentre scorri in orizzontale non stai cercando bersagli;
 *
 * - la tenda nera d'ingresso riprende i pannelli obliqui dell'intro.
 *   È lo stesso gesto, usato come stacco di capitolo.
 */

/** Inclinazione della tenda: stesso taglio dell'intro e dell'hero. */
const SLANT = 6;

/**
 * Le tre varianti.
 *
 * `colore` è campionato dal corpo della confezione fotografata e serve
 * all'alone dietro la bustina; `chiaro` è la sua versione schiarita e
 * serve a testi e filetti, perché la tinta piena su fondo nero ha un
 * contrasto troppo basso per leggersi.
 *
 * Le immagini sono i PNG scontornati delle tre confezioni, ritagliati
 * al soggetto con scripts/ritaglia-scontorno.mjs.
 */
const VARIANTI = [
  {
    nome: "notte",
    colore: "#9e9d28",
    chiaro: "#d6d45c",
    immagine: "/gamma/notte.png",
    larghezza: 444,
    quando: "la sera, dopo l'ultima sessione",
    formula: "magnesio marino + melissa",
    claim: "chiude la giornata",
    spiegazione:
      "La melissa accorcia il tempo che serve al sistema nervoso per scendere di giri dopo un allenamento serale. Stessa base minerale della bustina bianca, senza nulla che tenga sveglio.",
    dato: "−31 min per addormentarsi",
  },
  {
    nome: "idratazione",
    colore: "#244fc1",
    chiaro: "#8aa6f5",
    immagine: "/gamma/idratazione.png",
    larghezza: 322,
    quando: "durante lo sforzo, sopra i 60 minuti",
    formula: "elettroliti + sodio marino",
    claim: "regge la sessione",
    spiegazione:
      "Rapporto sodio-potassio calibrato sulla composizione del sudore, non sull'acqua che bevi. Si scioglie in borraccia e non lascia il retrogusto metallico dei sali da farmacia.",
    dato: "1,8 l reintegrati per bustina",
  },
  {
    nome: "spinta",
    colore: "#e34035",
    chiaro: "#ff9084",
    immagine: "/gamma/spinta.png",
    larghezza: 273,
    quando: "quaranta minuti prima della gara",
    formula: "rodiola + caffeina da guaranà",
    claim: "apre la gara",
    spiegazione:
      "La caffeina del guaranà si libera più lentamente di quella sintetica: la curva è più lunga e non lascia il crollo a metà gara. La rodiola alza la soglia di fatica percepita.",
    dato: "+14% potenza sul quarto round",
  },
];

export default function Range() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      // matchMedia annidato: lo scorrimento orizzontale esiste solo
      // dove c'è spazio e un puntatore, e si smonta da solo se la
      // finestra scende sotto il breakpoint.
      const mm = gsap.matchMedia();

      mm.add(DESKTOP, () => {
        const binario =
          root.current!.querySelector<HTMLElement>("[data-binario]")!;
        const pin = root.current!.querySelector<HTMLElement>("[data-pin]")!;
        const tende = gsap.utils.toArray<HTMLElement>("[data-tenda]");
        const finestre = gsap.utils.toArray<HTMLElement>("[data-finestra]");

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            // La corsa dipende dalla larghezza reale del binario:
            // scritta a mano, l'ultima slide resterebbe tagliata su
            // schermi di proporzioni diverse.
            // Corsa orizzontale più una battuta iniziale in cui il
            // binario sta fermo mentre la tenda si apre. Senza,
            // la prima slide non si vede mai ferma e scoperta.
            end: () =>
              "+=" +
              (binario.scrollWidth -
                window.innerWidth +
                window.innerHeight * 0.7),
            scrub: 1,
            pin,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Battuta 0 → 1: la tenda si apre sulla prima slide ferma.
        const ATTESA = 1;
        tl.to(
          tende[0],
          { xPercent: -110, ease: "power2.inOut", duration: ATTESA },
          0,
        ).to(
          tende[1],
          { xPercent: 110, ease: "power2.inOut", duration: ATTESA },
          0,
        );

        // Da lì in poi scorre il binario.
        tl.to(
          binario,
          {
            x: () => -(binario.scrollWidth - window.innerWidth),
            ease: "none",
            duration: 10,
          },
          ATTESA,
        );

        /*
          Finestre: ognuna finisce di aprirsi ESATTAMENTE quando la
          sua slide arriva al centro.

          Con n slide larghe una viewport, il binario percorre n−1
          viewport: la slide i è centrata a (i / (n−1)) della corsa,
          cioè al tempo (i / (n−1)) * 10 sulla timeline. L'apertura
          parte poco prima e ci arriva. Dividendo la timeline in parti
          uguali — com'era prima — la finestra della seconda slide era
          aperta solo al 37% nel momento in cui la leggevi.
        */
        const ultima = VARIANTI.length - 1;
        const DURATA = 1.3;
        finestre.forEach((finestra, i) => {
          const centrata = ATTESA + (ultima === 0 ? 0 : (i / ultima) * 10);
          tl.fromTo(
            finestra,
            { clipPath: "inset(0% 0% 100% 0%)", opacity: 0 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              opacity: 1,
              ease: "power3.out",
              duration: DURATA,
            },
            Math.max(0.2, centrata - DURATA),
          );
        });
      });

      return () => mm.revert();
    },

    // Statica: nessun pin, nessuna traslazione. Le slide restano
    // impilate e le finestre già aperte.
    reduced: () => {
      gsap.set(gsap.utils.toArray<HTMLElement>("[data-finestra]"), {
        clipPath: "inset(0% 0% 0% 0%)",
        opacity: 1,
      });
      gsap.set(gsap.utils.toArray<HTMLElement>("[data-tenda]"), {
        autoAlpha: 0,
      });
    },
  });

  return (
    <section
      id="gamma"
      ref={root}
      className="relative bg-ink text-paper"
      aria-label="Le tre varianti della gamma"
    >
      <div
        data-pin
        className="relative overflow-hidden md:h-svh"
      >
        {/* Intestazione ferma: resta al suo posto mentre il binario
            scorre sotto. */}
        <div className="shell pointer-events-none absolute inset-x-0 top-0 z-20 hidden pt-24 md:block">
          <p className="type-label text-volt">la gamma</p>
        </div>

        {/*
          Binario. Da md in su è una riga che trasla; sotto è una
          colonna e la sezione si comporta come una lista normale.
        */}
        <div
          data-binario
          className="flex flex-col md:h-full md:flex-row md:will-change-transform"
        >
          {VARIANTI.map((v) => (
            <article
              key={v.nome}
              className="flex shrink-0 flex-col justify-center border-b border-line-dark px-[clamp(1.25rem,3.5vw,3rem)] py-20 md:w-screen md:border-b-0 md:py-0"
            >
              {/* Larghezza contenuta e centrata: a tutta viewport la
                  bustina finiva contro il bordo sinistro e il testo
                  contro quello destro, con un vuoto in mezzo. */}
              <div className="mx-auto grid w-full max-w-[76rem] items-center gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:gap-14">
                {/* Bustina */}
                <div className="relative flex justify-center md:justify-start">
                  <div
                    aria-hidden
                    className="absolute top-1/2 left-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px] opacity-40"
                    style={{ backgroundColor: v.colore }}
                  />
                  <Image
                    src={v.immagine}
                    alt={`Bustina volta ${v.nome}`}
                    width={v.larghezza}
                    height={1050}
                    sizes="(min-width: 768px) 24vw, 50vw"
                    className="relative h-[46svh] w-auto md:h-[62svh]"
                    style={{
                      filter: "drop-shadow(-24px 40px 55px rgba(0,0,0,0.5))",
                    }}
                  />
                </div>

                {/* Testo */}
                <div className="max-w-[46ch]">
                  <p className="type-meta mb-4 flex items-center gap-2 text-paper/50">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: v.chiaro }}
                    />
                    {v.formula}
                  </p>

                  <h2 className="type-display text-xxl">{v.nome}</h2>

                  <p className="type-label mt-4 text-paper/70">{v.claim}</p>

                  {/* La finestra che si apre all'arrivo della slide */}
                  <div
                    data-finestra
                    className="mt-8 border-t border-line-dark pt-6"
                    style={{ borderTopColor: v.chiaro }}
                  >
                    <p className="type-label leading-relaxed text-paper/75">
                      {v.spiegazione}
                    </p>
                    <div className="type-meta mt-6 flex items-baseline justify-between gap-4 text-paper/50">
                      <span>{v.quando}</span>
                      <span style={{ color: v.chiaro }}>{v.dato}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/*
          Tenda nera d'ingresso: due pannelli tagliati in obliquo, come
          nell'intro. Stanno sopra al binario e si aprono appena la
          sezione si aggancia.
        */}
        {[0, 1].map((i) => (
          <div
            key={i}
            data-tenda
            aria-hidden
            className={`absolute inset-y-0 z-30 hidden w-[120%] bg-ink md:block ${
              i === 0 ? "-left-[10%]" : "-right-[10%]"
            }`}
            style={{
              clipPath:
                i === 0
                  ? `polygon(0 0, ${50 + SLANT}% 0, ${50 - SLANT}% 100%, 0 100%)`
                  : `polygon(${50 + SLANT}% 0, 100% 0, 100% 100%, ${50 - SLANT}% 100%)`,
            }}
          />
        ))}
      </div>
    </section>
  );
}
