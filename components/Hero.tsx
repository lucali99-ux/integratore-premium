"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, SplitText, useScene } from "@/lib/animation";
import { introDone } from "@/lib/intro";

/**
 * SEZIONE 1 — Hero.
 *
 * Struttura ricalcata dal riferimento: headline minuscola gigante in
 * alto a sinistra, micro-paragrafo sotto, prodotto che esce dal bordo
 * destro, pill CTA in basso.
 *
 * Momento animato: reveal char-by-char, in due tempi.
 *  - riga 1 al load  → la pagina non è mai vuota all'atterraggio
 *  - riga 2 in scrub → è il momento forte, guidato dallo scroll
 *
 * Il blocco è `sticky` (CSS) e non pinnato (GSAP): stesso effetto,
 * senza spacer iniettati nel DOM né reflow.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      const lineOne = root.current!.querySelector("[data-line='1']")!;
      const lineTwo = root.current!.querySelector("[data-line='2']")!;

      // --- Riga 1: entrata alla fine dell'intro -------------------
      // Il tween nasce in pausa: se partisse al mount si consumerebbe
      // dietro allo schermo nero dell'intro e l'utente atterrerebbe su
      // una headline già ferma. `introDone` si risolve subito quando
      // l'intro non gira (prefers-reduced-motion).
      const splitOne = SplitText.create(lineOne, {
        type: "chars",
        mask: "chars", // wrapper con overflow:clip attorno a ogni lettera
        autoSplit: true, // ri-split se il testo va a capo diversamente
        onSplit: (self) => {
          const tween = gsap.from(self.chars, {
            yPercent: 115,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.028,
            paused: true,
          });
          introDone.then(() => tween.play());
          return tween;
        },
      });

      // --- Riga 2: reveal guidato dallo scroll --------------------
      const splitTwo = SplitText.create(lineTwo, {
        type: "chars",
        mask: "chars",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.chars, {
            yPercent: 115,
            ease: "none", // in scrub l'ease va tolto: la guida è lo scroll
            stagger: 0.5, // in scrub lo stagger è proporzione, non secondi
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "+=40%", // completa entro i primi 40vh di scroll
              scrub: 0.6, // micro-ritardo = sensazione di peso
            },
          }),
      });

      // --- Uscita: l'hero si dissolve mentre scorre via -----------
      gsap.to(root.current!.querySelector("[data-hero-inner]"), {
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          // "top-=75%": il top dell'hero raggiunge un punto 75vh SOPRA
          // il bordo alto della viewport, cioè dopo 75vh di scroll.
          // Con "top+=75%" il trigger sarebbe già superato a scroll 0.
          start: "top top-=75%",
          end: "bottom top",
          scrub: true,
        },
      });

      // SplitText riscrive il DOM: senza revert un remount
      // ri-splitterebbe testo già splittato, duplicando i caratteri.
      return () => {
        splitOne.revert();
        splitTwo.revert();
      };
    },

    // Statica: nessuno split, nessun trigger. Il markup è già nel suo
    // stato finale — useScene si limita a renderlo visibile.
    reduced: () => {},
  });

  return (
    <section
      id="top"
      ref={root}
      className="relative min-h-[155svh] bg-paper"
      aria-label="Introduzione"
    >
      <div
        data-hero-inner
        className="sticky top-0 h-svh overflow-hidden"
      >
        {/*
          Prodotto scontornato (PNG con canale alpha): galleggia sul
          fondo pagina senza il bordo del rettangolo fotografico, che
          si vedrebbe perché il beige dello scatto non coincide con
          il paper del sito.
          `drop-shadow` e non `box-shadow`: la prima segue la sagoma
          reale, la seconda disegnerebbe un'ombra rettangolare.
          `priority` perché è l'elemento LCP dell'hero.
        */}
        <Image
          src="/product/pouch-cutout.png"
          alt="Bustina VOLTA di magnesio marino ed elettroliti"
          width={305}
          height={1050}
          priority
          className="pointer-events-none absolute right-[4%] bottom-[8%] h-[42svh] w-auto max-w-none sm:right-[8%] md:right-[10%] md:bottom-[3%] md:h-[86svh]"
          style={{ filter: "drop-shadow(-24px 40px 55px rgba(11,11,11,0.22))" }}
        />

        <div className="shell relative z-10 flex h-full flex-col pt-20 pb-24 md:pt-28 md:pb-32">
          {/* Headline: due parole, minuscole, alla massima scala */}
          <h1
            data-anim-hidden="true"
            className="type-display text-mega md:max-w-[62%]"
          >
            <span data-line="1" className="block">
              recupera
            </span>
            <span data-line="2" className="block">
              davvero
            </span>
          </h1>

          {/* Micro-paragrafo: nel riferimento sta subito sotto la
              headline, piccolissimo. È il contrappunto alla scala. */}
          <p className="type-label mt-6 max-w-[44ch] leading-relaxed text-ink/70 md:mt-8">
            il recupero non è riposo, è un processo biochimico che puoi
            alimentare — volta lo fa con minerali marini ed estratti vegetali,
            in una bustina da sciogliere
          </p>

          {/* Meta: unico punto dell'hero in cui compare il lime */}
          <p className="type-meta mt-4 flex items-center gap-2 text-ash">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-volt"
            />
            30 bustine monodose · 4,5 g
          </p>

          {/* CTA piena, centrata in basso come nel riferimento */}
          {/* Su mobile la CTA sta a sinistra: al centro finirebbe
              sopra al prodotto, che occupa l'angolo destro. */}
          <div className="mt-auto flex justify-start md:justify-center">
            <a
              href="#acquista"
              className="type-label capsule bg-ink px-8 py-4 text-paper transition-colors duration-300 hover:bg-volt hover:text-ink"
            >
              acquista volta
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
