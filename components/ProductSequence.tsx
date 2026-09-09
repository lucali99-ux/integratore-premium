"use client";

import { useCallback, useEffect, useRef } from "react";
import { gsap, ScrollTrigger, useScene } from "@/lib/animation";

/**
 * SEZIONE 3b — Sequenza prodotto su canvas.
 *
 * Momento animato: lo stick ruota di 360° in scrub mentre la sezione è
 * pinnata, e i callout entrano a intervalli lungo la rotazione.
 *
 * I fotogrammi vengono da assets/rotazione-prodotto.mp4, estratti con
 *   node scripts/frames-from-video.mjs assets/rotazione-prodotto.mp4 60 1200 700:1248:482:0
 * Per rifarli con un altro video basta rilanciare lo script e, se cambi
 * numero o formato, aggiornare le due costanti qui sotto.
 */
const FRAME_COUNT = 60;
const FRAME_EXT = "jpg";
const FRAME_SRC = (i: number) =>
  `/sequence/frame-${String(i + 1).padStart(3, "0")}.${FRAME_EXT}`;

/**
 * Quante immagini scaricare in parallelo. Con 60 JPG da ~150 KB,
 * lanciare 60 richieste insieme satura la connessione e i primi
 * frame — gli unici che servono subito — arrivano per ultimi.
 */
const CONCURRENCY = 8;

/** Frame mostrato nella variante senza animazione: una posa di 3/4. */
const STATIC_FRAME = Math.round(FRAME_COUNT * 0.12);

const CALLOUTS = [
  {
    title: "monodose",
    body: "4,5 g esatti in ogni bustina — niente misurini, niente dosaggi a occhio dopo l'allenamento",
    position: "md:left-0 md:top-[18%]",
  },
  {
    title: "solubilità totale",
    body: "si scioglie in quindici secondi in acqua fredda, senza residuo sul fondo del bicchiere",
    position: "md:right-0 md:top-[44%] md:text-right",
  },
  {
    title: "zero zuccheri",
    body: "nessun dolcificante, nessun colorante, nessun aroma artificiale nella formula",
    position: "md:left-[6%] md:bottom-[14%]",
  },
];

/** Colore di fondo della sezione, in cui sfumare i bordi dei frame. */
const BG = "11, 11, 11";

function fadeEdges(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const band = (
    x0: number, y0: number, x1: number, y1: number,
    bw: number, bh: number,
  ) => {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, `rgb(${BG})`);
    gradient.addColorStop(1, `rgba(${BG}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), bw, bh);
  };

  // Sfumature larghe di proposito: strette lasciavano una linea
  // verticale visibile al bordo dell'immagine, perché lo stacco fra il
  // fondo dello studio e il nero della sezione veniva compresso in
  // pochi pixel. A un terzo della larghezza legge come vignettatura.
  const side = w * 0.34;
  const top = h * 0.1;
  // In basso serve di più: è dove il piano dello studio è più chiaro.
  const bottom = h * 0.2;

  band(x, y, x + side, y, side, h); // sinistra
  band(x + w, y, x + w - side, y, side, h); // destra
  band(x, y, x, y + top, w, top); // alto
  band(x, y + h, x, y + h - bottom, w, bottom); // basso
}

export default function ProductSequence() {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useRef<HTMLImageElement[]>([]);
  const currentFrame = useRef(0);

  /**
   * Disegna un frame. `contain` e non `cover`: il prodotto deve stare
   * tutto dentro l'inquadratura, anche sui formati stretti.
   */
  const draw = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const image = frames.current[index];
    if (!canvas || !image?.complete || !image.naturalWidth) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas; // dimensioni del buffer, non CSS
    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(
      width / image.naturalWidth,
      height / image.naturalHeight,
    );
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    ctx.drawImage(image, x, y, w, h);

    // Il fondo dello studio nei fotogrammi va da #0d1112 in alto (di
    // fatto il nero della sezione) a #242527 in basso, dove c'è il
    // piano: senza intervento si vede il bordo dell'immagine.
    // La sfumatura è disegnata sui bordi dell'IMMAGINE, non applicata
    // come mask CSS all'elemento canvas: su mobile l'immagine non
    // riempie il canvas, e la maschera cadrebbe nel punto sbagliato.
    fadeEdges(ctx, x, y, w, h);

    currentFrame.current = index;
  }, []);

  /**
   * Adegua il buffer del canvas alla dimensione CSS e alla densità
   * dello schermo.
   * Senza questo, su display Retina il prodotto è visibilmente sfocato.
   * Cappo a 2: a 3 il buffer quadruplica per un guadagno invisibile.
   */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    draw(currentFrame.current);
  }, [draw]);

  // --- Caricamento pigro -------------------------------------------
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    let cancelled = false;
    resize();

    const loadSequence = async () => {
      let cursor = 0;

      // Worker che pescano dallo stesso cursore: l'ordine resta
      // sostanzialmente sequenziale, con al massimo CONCURRENCY
      // richieste aperte insieme.
      const worker = async () => {
        while (cursor < FRAME_COUNT && !cancelled) {
          const index = cursor++;
          await new Promise<void>((resolve) => {
            const image = new Image();
            image.decoding = "async";
            image.onload = image.onerror = () => resolve();
            image.src = FRAME_SRC(index);
            frames.current[index] = image;
          });
          // Appena il primo frame è pronto il canvas smette di
          // essere una superficie vuota.
          if (index === 0) draw(currentFrame.current);
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (cancelled) return;
      draw(currentFrame.current);
      // Le altezze non cambiano, ma un refresh dopo il caricamento
      // mette al riparo da start/end calcolati su un layout parziale.
      ScrollTrigger.refresh();
    };

    // rootMargin 100%: si comincia a caricare una viewport prima che
    // la sezione entri. Presto abbastanza da non vedere buchi, tardi
    // abbastanza da non pesare sul caricamento iniziale della pagina.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadSequence();
        }
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(el);

    // ResizeObserver e non window.resize: osserva la dimensione reale
    // del canvas, quindi copre anche i cambi di layout che non passano
    // da un ridimensionamento della finestra (breakpoint, rotazione,
    // comparsa della barra di sistema su mobile).
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvasRef.current!);

    return () => {
      cancelled = true;
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [draw, resize]);

  // --- Scena -------------------------------------------------------
  useScene(root, {
    full: () => {
      // Oggetto proxy: GSAP anima un numero, non il DOM. È il pattern
      // standard per le sequenze canvas.
      const state = { frame: 0 };
      const callouts = gsap.utils.toArray<HTMLElement>("[data-callout]");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=220%",
          scrub: 0.5,
          pin: root.current!.querySelector("[data-pin]"),
          anticipatePin: 1,
        },
      });

      tl.to(
        state,
        {
          frame: FRAME_COUNT - 1,
          // snap all'intero: draw viene invocata ~60 volte in tutto lo
          // scrub, non a ogni frame di rendering del browser.
          snap: "frame",
          ease: "none",
          duration: 10,
          onUpdate: () => draw(Math.round(state.frame)),
        },
        0,
      );

      // I callout entrano scaglionati lungo la rotazione e restano.
      callouts.forEach((el, i) => {
        tl.fromTo(
          el,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 1.2, ease: "power2.out" },
          1.6 + i * 2.6,
        );
      });

      // Uscita: il testo si dissolve mentre il pin sta per sganciarsi.
      // Senza, i callout scorrono via passando sotto l'header e per un
      // istante si sovrappongono al wordmark.
      tl.to(
        root.current!.querySelector("[data-pin-content]"),
        { autoAlpha: 0, duration: 0.8, ease: "none" },
        9.2,
      );
    },

    // Statica: una posa di 3/4, callout tutti visibili, nessun pin.
    reduced: () => {
      currentFrame.current = STATIC_FRAME;
      draw(STATIC_FRAME);
      gsap.set(gsap.utils.toArray<HTMLElement>("[data-callout]"), {
        autoAlpha: 1,
        y: 0,
      });
    },
  });

  return (
    <section
      id="prodotto"
      ref={root}
      className="relative bg-ink text-paper"
      aria-label="Il prodotto da vicino"
    >
      <div data-pin className="relative h-svh overflow-hidden">
        {/* Il canvas riempie la sezione; il testo alternativo sta nei
            callout, quindi qui basta nasconderlo agli screen reader. */}
        {/*
          Su mobile il canvas è confinato alla metà alta: a tutta
          altezza il prodotto passa dietro ai callout impilati e li
          rende illeggibili. Da md in su torna a pieno schermo, con
          i callout disposti ai lati.

          ALTEZZA ESPLICITA, non top+bottom: <canvas> è un elemento
          "replaced" come <img>, e per gli elementi replaced posizionati
          in assoluto la specifica CSS impone l'altezza intrinseca
          quando height è auto, ignorando `bottom`. Il canvas
          prenderebbe l'altezza del proprio buffer, che resize() ricava
          dal rect: un ciclo di retroazione che lo rimpicciolisce.
        */}
        <canvas
          ref={canvasRef}
          aria-hidden
          className="absolute inset-x-0 top-[6%] h-[48%] w-full md:top-0 md:h-full"
        />

        <div
          data-pin-content
          className="shell relative z-10 flex h-full flex-col pt-24 pb-24 md:pt-28"
        >
          <p data-reveal className="type-label text-ash">il prodotto</p>

          {/* Su mobile i callout stanno in colonna sotto il prodotto;
              da md in su si dispongono attorno all'inquadratura. */}
          {/* Contenitore relativo INTERNO al padding dello shell:
              senza, `md:left-0` posizionerebbe il callout sul bordo
              assoluto della viewport, fuori dalla gabbia tipografica. */}
          <div className="relative mt-auto flex flex-col gap-6 md:mt-0 md:block md:h-full">
            {CALLOUTS.map((item) => (
              <div
                key={item.title}
                data-callout
                data-anim-hidden="true"
                className={`max-w-[30ch] md:absolute md:w-[26ch] ${item.position}`}
              >
                <span
                  aria-hidden
                  className="mb-3 block h-1.5 w-1.5 rounded-full bg-paper md:mb-4"
                />
                <span className="block h-px w-full bg-line-dark" />
                <h3 className="type-display mt-3 text-lead">
                  {item.title}
                </h3>
                <p className="type-label mt-2 leading-relaxed text-paper/60">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
