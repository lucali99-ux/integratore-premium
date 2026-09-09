"use client";

import { useCallback, useRef, useState } from "react";
import { gsap, SplitText, useScene } from "@/lib/animation";
import { markIntroDone } from "@/lib/intro";
import { lockScroll, unlockScroll } from "@/lib/scroll";

/**
 * INTRO "CINEMA".
 *
 * Ricalca l'apertura del riferimento: schermo nero, si apre una
 * feritoia orizzontale che cresce a scatti, e dentro scorrono parole
 * TAGLIATE dalle bande nere sopra e sotto. All'ultimo scatto la
 * feritoia si apre a tutto schermo sull'hero.
 *
 * Scelte tecniche:
 *
 * - le bande si muovono con `scaleY`, non con `height`: scaleY resta
 *   sul compositor, height farebbe un layout per frame su due
 *   elementi a tutto schermo;
 *
 * - le parole stanno SOTTO le bande, che quindi le mozzano. È questo
 *   il taglio che si vede nel riferimento, non un overflow:hidden;
 *
 * - le lettere entrano con una rotazione crescente lungo la parola
 *   (rotate come funzione dell'indice): è ciò che produce l'arco;
 *
 * - il fondo dell'overlay è lo stesso `paper` dell'hero, così quando
 *   le bande si aprono del tutto non c'è nessun lampo di colore.
 */

const WORDS = ["recupera", "reintegra", "naturalmente"];

/**
 * Quanto resta coperto dalle bande a ogni scatto (1 = tutto nero).
 * Valori alti di proposito: nel riferimento la prima parola si legge
 * a metà, tagliata sopra e sotto. Se la feritoia si apre troppo la
 * parola ci sta dentro tutta e l'effetto "cinema" sparisce.
 */
const APERTURE = [0.9, 0.75, 0.56];

export default function CinemaIntro() {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  // Smontaggio a intro finita: l'overlay non deve restare nel DOM a
  // intercettare eventi né a pesare come layer di composizione.
  const [done, setDone] = useState(false);

  useScene(root, {
    full: () => {
      lockScroll();

      const bars = gsap.utils.toArray<HTMLElement>("[data-bar]");
      const words = gsap.utils.toArray<HTMLElement>("[data-word]");
      const splits = words.map((word) =>
        SplitText.create(word, { type: "chars" }),
      );

      const tl = gsap.timeline({
        defaults: { ease: "expo.inOut" },
        onStart: () => {
          timeline.current = tl;
        },
        onComplete: () => {
          unlockScroll();
          markIntroDone(); // sblocca l'entrata dell'hero
          setDone(true);
        },
      });

      // Stato iniziale: schermo completamente nero, parole assenti.
      gsap.set(bars, { scaleY: 1 });
      gsap.set(words, { autoAlpha: 0 });
      splits.forEach((split) => gsap.set(split.chars, { autoAlpha: 0 }));

      tl.to({}, { duration: 0.2 }); // un respiro sul nero

      WORDS.forEach((_, i) => {
        const chars = splits[i].chars;

        // 1. la feritoia si allarga di uno scatto
        tl.to(bars, { scaleY: APERTURE[i], duration: 0.45 });

        // 2. la parola entra lettera per lettera, ad arco
        tl.set(words[i], { autoAlpha: 1 }, "<0.1").fromTo(
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
          "<",
        );

        // 3. breve tenuta, poi la parola esce verso l'alto
        tl.to(chars, {
          autoAlpha: 0,
          yPercent: -55,
          rotate: (index: number) => 8 + index * 1.5,
          duration: 0.3,
          ease: "power2.in",
          stagger: 0.018,
        }, `+=${i === WORDS.length - 1 ? 0.25 : 0.15}`);
      });

      // 4. apertura finale + dissolvenza dell'overlay sull'hero
      tl.to(bars, { scaleY: 0, duration: 0.85 })
        .to(root.current, { autoAlpha: 0, duration: 0.45, ease: "power2.out" }, "-=0.25");

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
   * così l'uscita resta un movimento (l'utente vede le bande aprirsi,
   * non un taglio netto) e le callback di fine — sblocco dello scroll,
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

      {/* Le due bande: coprono le parole e si ritraggono a scatti.
          transformOrigin agli estremi, così scaleY le fa rientrare
          verso il bordo invece di rimpicciolirle al centro. */}
      <div
        data-bar
        className="absolute inset-x-0 top-0 h-1/2 bg-ink"
        style={{ transformOrigin: "top center" }}
      />
      <div
        data-bar
        className="absolute inset-x-0 bottom-0 h-1/2 bg-ink"
        style={{ transformOrigin: "bottom center" }}
      />
    </div>
  );
}
