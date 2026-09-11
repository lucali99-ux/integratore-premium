"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useScene } from "@/lib/animation";
import { introDone } from "@/lib/intro";

/**
 * SEZIONE 1 — Hero.
 *
 * Struttura ricalcata dal riferimento: headline minuscola gigante in
 * alto a sinistra, micro-paragrafo sotto, prodotto che esce dal bordo
 * destro, pill CTA in basso.
 *
 * Momento animato: le due righe vengono scoperte da un TAGLIO OBLIQUO
 * che le spazza da sinistra, con la stessa inclinazione con cui si
 * apre l'intro. È di fatto una rivelazione lettera per lettera — è il
 * bordo diagonale a scoprirle una a una — ma avviene al caricamento.
 *
 * Prima la seconda riga era legata allo scroll, e a pagina ferma
 * lasciava una banda vuota alta quanto una riga di testo: la headline
 * si leggeva monca. Legarla al caricamento risolve, e il taglio
 * obliquo la tiene coerente con l'apertura invece di essere una
 * comparsa qualunque.
 *
 * La sezione è alta ESATTAMENTE una viewport e il contenuto non è più
 * sticky. Prima era 155svh con il blocco incollato in cima: quei 55svh
 * in più servivano a dare corsa al reveal di "davvero" legato allo
 * scroll. Ora che la riga si scopre al caricamento quella corsa non ha
 * più uno scopo, e si traduceva in mezza viewport di scroll in cui la
 * headline restava immobile — misurata: l'h1 non si muoveva da scroll
 * 0 fino a 495px.
 */

/** Inclinazione del taglio, in percentuale della larghezza della riga.
 *  Stesso valore usato dall'intro, così i due gesti si somigliano. */
const SLANT = 6;

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useScene(root, {
    full: () => {
      const righe = gsap.utils.toArray<HTMLElement>("[data-line]");

      /**
       * Posiziona il bordo diagonale che scopre la riga.
       * I vertici escono sopra e sotto il riquadro (-20% / 120%)
       * perché il taglio deve attraversare anche ascendenti e
       * discendenti senza mozzarle.
       */
      const taglia = (el: HTMLElement, p: number) => {
        el.style.clipPath = `polygon(-3% -20%, ${p + SLANT}% -20%, ${p - SLANT}% 120%, -3% 120%)`;
      };

      const tl = gsap.timeline({ paused: true });

      righe.forEach((riga, i) => {
        // Stato iniziale: il bordo è a sinistra del testo, niente
        // è visibile. Applicato subito, prima del primo paint.
        taglia(riga, -SLANT - 3);

        const stato = { p: -SLANT - 3 };
        tl.to(
          stato,
          {
            p: 118,
            duration: 1.1,
            ease: "power3.inOut",
            onUpdate: () => taglia(riga, stato.p),
          },
          i * 0.22,
        );
      });

      // Parte quando l'intro ha finito: altrimenti si consumerebbe
      // dietro ai pannelli neri e l'utente atterrerebbe su una
      // headline già ferma. `introDone` si risolve subito quando
      // l'intro non gira (prefers-reduced-motion).
      introDone.then(() => tl.play());

      // --- Uscita ------------------------------------------------
      // La sezione dura una viewport, quindi l'intervallo va da poco
      // dopo l'inizio dello scroll fino a quando è uscita del tutto.
      const uscita = {
        trigger: root.current,
        start: "top top-=12%",
        end: "bottom top",
        scrub: true,
      } as const;

      gsap.to(root.current!.querySelector("[data-hero-inner]"), {
        opacity: 0,
        ease: "none",
        scrollTrigger: uscita,
      });

      // Il prodotto esce più lentamente del resto: la differenza di
      // velocità dà profondità allo stacco, e usa lo scroll che
      // rimane invece di lasciarlo a una sola dissolvenza.
      gsap.to(root.current!.querySelector("[data-prodotto]"), {
        yPercent: -18,
        ease: "none",
        scrollTrigger: uscita,
      });

      return () => {
        // Il clip-path è scritto a mano sugli elementi: va tolto, o
        // resterebbe l'ultimo valore su un remount.
        righe.forEach((riga) => {
          riga.style.clipPath = "";
        });
      };
    },

    // Statica: nessun taglio, nessun trigger. Il markup è già nel suo
    // stato finale — useScene si limita a renderlo visibile.
    reduced: () => {},
  });

  return (
    <section
      id="top"
      ref={root}
      className="relative h-svh bg-paper"
      aria-label="Introduzione"
    >
      <div
        data-hero-inner
        className="relative h-full overflow-hidden"
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
          data-prodotto
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
