"use client";

import { useCallback, useRef, useState } from "react";
import { gsap, SplitText, useScene } from "@/lib/animation";
import { markIntroDone } from "@/lib/intro";
import { lockScroll, unlockScroll } from "@/lib/scroll";

/**
 * INTRO — apertura obliqua.
 *
 * Due pannelli neri separati da un taglio diagonale si aprono
 * ORIZZONTALMENTE a scatti, e nel varco che si allarga scorrono le
 * parole, tagliate dai pannelti stessi. All'ultimo scatto i pannelli
 * escono di scena e resta l'hero.
 *
 * Perché obliqua e orizzontale invece delle bande orizzontali del
 * riferimento: quelle erano una copia letterale. Il taglio diagonale
 * dà lo stesso momento — una feritoia che si apre e mozza il testo —
 * con una geometria che appartiene a questo sito, e introduce
 * l'obliquità che poi torna nei divisori a zig-zag delle sezioni.
 *
 * Scelte tecniche:
 *
 * - il taglio è un `clip-path` con vertici in percentuale, quindi
 *   l'inclinazione resta la stessa a ogni proporzione di schermo;
 *
 * - i pannelli si muovono con `x` in pixel calcolati sulla larghezza
 *   della viewport, non con `width`: la prima è una trasformazione
 *   sul compositor, la seconda farebbe un layout per frame;
 *
 * - le parole stanno SOTTO i pannelli, che quindi le mozzano. È il
 *   taglio a rivelarle, non un'animazione di opacità;
 *
 * - il fondo dell'overlay è lo stesso `paper` dell'hero, così quando
 *   i pannelli escono non c'è nessun lampo di colore.
 */

const WORDS = ["recupera", "reintegra", "naturalmente"];

/**
 * Ampiezza del varco a ogni scatto, in frazione della larghezza di
 * viewport.
 *
 * Il primo valore deve bastare a contenere la parola più lunga del
 * primo scatto: a 0.24 il varco era 346px contro i ~460px di
 * "recupera", e si leggeva "ecupera". La progressione resta — il
 * varco cresce a ogni parola — ma parte da una misura leggibile.
 */
const APERTURE = [0.46, 0.64, 0.82];

/** Inclinazione del taglio: scostamento orizzontale fra alto e basso. */
const SLANT = 0.06;

export default function CinemaIntro() {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  // Smontaggio a intro finita: l'overlay non deve restare nel DOM a
  // intercettare eventi né a pesare come layer di composizione.
  const [done, setDone] = useState(false);

  useScene(root, {
    full: () => {
      lockScroll();

      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]");
      const edges = gsap.utils.toArray<HTMLElement>("[data-edge]");
      const words = gsap.utils.toArray<HTMLElement>("[data-word]");
      const splits = words.map((word) =>
        SplitText.create(word, { type: "chars" }),
      );

      // Il bordo lime è ruotato per seguire il taglio. L'angolo dipende
      // dalle proporzioni della finestra, quindi va calcolato: a parità
      // di inclinazione percentuale, uno schermo largo dà un taglio più
      // inclinato di uno stretto.
      const angolo =
        (Math.atan((SLANT * window.innerWidth) / window.innerHeight) * 180) /
        Math.PI;
      gsap.set(edges, { rotation: angolo });

      const larghezza = window.innerWidth;
      const scostamento = (frazione: number) => (larghezza * frazione) / 2;

      const tl = gsap.timeline({
        defaults: { ease: "expo.inOut" },
        onStart: () => {
          timeline.current = tl;
        },
        onComplete: () => {
          unlockScroll();
          markIntroDone(); // sblocca l'entrata dell'hero e il cursore
          setDone(true);
        },
      });

      // Stato iniziale: pannelli combacianti, parole assenti.
      gsap.set(panels[0], { x: 0 });
      gsap.set(panels[1], { x: 0 });
      gsap.set(edges[0], { x: 0 });
      gsap.set(edges[1], { x: 0 });
      gsap.set(words, { autoAlpha: 0 });
      splits.forEach((split) => gsap.set(split.chars, { autoAlpha: 0 }));

      tl.to({}, { duration: 0.2 }); // un respiro sul nero

      WORDS.forEach((_, i) => {
        const chars = splits[i].chars;
        const d = scostamento(APERTURE[i]);

        // 1. il varco si allarga di uno scatto
        tl.to(panels[0], { x: -d, duration: 0.5 }, `passo${i}`)
          .to(panels[1], { x: d, duration: 0.5 }, `passo${i}`)
          .to(edges[0], { x: -d, duration: 0.5 }, `passo${i}`)
          .to(edges[1], { x: d, duration: 0.5 }, `passo${i}`);

        // 2. la parola entra lettera per lettera, ad arco
        tl.set(words[i], { autoAlpha: 1 }, `passo${i}+=0.1`).fromTo(
          chars,
          {
            autoAlpha: 0,
            yPercent: 60,
            // rotazione crescente lungo la parola: le ultime lettere
            // partono più inclinate e "atterrano" per ultime.
            rotate: (index: number) => -14 - index * 2.5,
          },
          {
            autoAlpha: 1,
            yPercent: 0,
            rotate: 0,
            duration: 0.55,
            ease: "power3.out",
            stagger: 0.03,
            transformOrigin: "50% 120%",
          },
          `passo${i}+=0.1`,
        );

        // 3. breve tenuta, poi la parola esce verso l'alto
        tl.to(
          chars,
          {
            autoAlpha: 0,
            yPercent: -55,
            rotate: (index: number) => 8 + index * 1.5,
            duration: 0.3,
            ease: "power2.in",
            stagger: 0.018,
          },
          `+=${i === WORDS.length - 1 ? 0.25 : 0.15}`,
        );
      });

      // 4. apertura finale: i pannelli escono del tutto, poi
      //    l'overlay si dissolve sull'hero.
      const fuori = larghezza * 0.75;
      tl.to(panels[0], { x: -fuori, duration: 0.85 }, "fine")
        .to(panels[1], { x: fuori, duration: 0.85 }, "fine")
        .to(edges[0], { x: -fuori, autoAlpha: 0, duration: 0.85 }, "fine")
        .to(edges[1], { x: fuori, autoAlpha: 0, duration: 0.85 }, "fine")
        .to(
          root.current,
          { autoAlpha: 0, duration: 0.45, ease: "power2.out" },
          "fine+=0.6",
        );

      return () => {
        splits.forEach((split) => split.revert());
        unlockScroll();
      };
    },

    // Statica: nessuna intro. La pagina è immediatamente quella vera,
    // e chi aspetta `introDone` viene sbloccato subito.
    reduced: () => {
      markIntroDone();
      setDone(true);
    },
  });

  /**
   * Salto dell'intro.
   *
   * Accelera SOLO la timeline locale invece di saltare a progress(1):
   * così l'uscita resta un movimento (i pannelli si vedono aprire, non
   * sparire di colpo) e le callback di fine — sblocco dello scroll,
   * markIntroDone, smontaggio — girano nell'ordine giusto.
   */
  const skip = useCallback(() => {
    timeline.current?.timeScale(7);
  }, []);

  // L'early return DEVE stare dopo tutti gli hook.
  if (done) return null;

  return (
    <div
      ref={root}
      onClick={skip}
      onWheel={skip}
      aria-hidden
      className="fixed inset-0 z-[100] cursor-pointer overflow-hidden bg-paper"
    >
      {/* Le parole: tutte in posizione, mostrate una alla volta. */}
      <div className="absolute inset-0 flex items-center justify-center">
        {WORDS.map((word) => (
          <span
            key={word}
            data-word
            className="type-display absolute text-xxl whitespace-nowrap"
          >
            {word}
          </span>
        ))}
      </div>

      {/*
        I due pannelli. Il clip-path li taglia lungo la stessa diagonale
        — il vertice a 50%+SLANT in alto e 50%-SLANT in basso è
        condiviso — così a riposo combaciano senza fessure.
        Sono più larghi della viewport per non scoprire i bordi mentre
        traslano.
      */}
      <div
        data-panel
        className="absolute inset-y-0 -left-[10%] w-[120%] bg-ink"
        style={{
          clipPath: `polygon(0 0, ${50 + SLANT * 100}% 0, ${50 - SLANT * 100}% 100%, 0 100%)`,
        }}
      />
      <div
        data-panel
        className="absolute inset-y-0 -right-[10%] w-[120%] bg-ink"
        style={{
          clipPath: `polygon(${50 + SLANT * 100}% 0, 100% 0, 100% 100%, ${50 - SLANT * 100}% 100%)`,
        }}
      />

      {/*
        Bordo lime lungo il taglio. Sta FUORI dai pannelli: se fosse un
        loro figlio verrebbe tagliato dal clip-path insieme al resto.
        Altezza 200% perché la rotazione scopre gli angoli.
      */}
      {[0, 1].map((i) => (
        <span
          key={i}
          data-edge
          className="absolute top-1/2 left-1/2 h-[200%] w-px -translate-x-1/2 -translate-y-1/2 bg-volt"
        />
      ))}
    </div>
  );
}
