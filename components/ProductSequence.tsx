"use client";

import { useCallback, useEffect, useRef } from "react";
import { gsap, ScrollTrigger, useScene } from "@/lib/animation";

/**
 * SEZIONE 3b — Sequenza prodotto su canvas.
 *
 * Momento animato: lo stick ruota di 360° in scrub mentre la sezione è
 * pinnata, e i callout entrano a intervalli lungo la rotazione.
 *
 * I fotogrammi vengono da assets/rotazione-prodotto.mp4, prima
 * interpolato a 72fps e poi campionato a cambiamento visivo costante —
 * il video generato dall'IA ruota a velocità irregolare, e campionarlo
 * a tempo produce una rotazione a scatti. Il procedimento completo è
 * documentato in scripts/frames-from-video.mjs, e
 * scripts/verifica-rotazione.mjs controlla che il sorgente contenga
 * davvero un giro completo prima di estrarre.
 * Se cambi numero di fotogrammi o formato, aggiorna le due costanti
 * qui sotto.
 */
const FRAME_COUNT = 180;
const FRAME_EXT = "jpg";
const FRAME_SRC = (i: number) =>
  `/sequence/frame-${String(i + 1).padStart(3, "0")}.${FRAME_EXT}`;

/**
 * Quante immagini scaricare in parallelo. Lanciare 180 richieste
 * insieme satura la connessione e i primi fotogrammi — gli unici che
 * servono subito — arrivano per ultimi.
 */
const CONCURRENCY = 8;

/**
 * Su mobile si usa un fotogramma ogni tre.
 *
 * Lì il prodotto viene disegnato a circa 227 px di larghezza: tenere
 * 180 immagini decodificate in memoria per quella dimensione è spreco
 * puro, e su un telefono la pressione sulla memoria è reale. Sessanta
 * fotogrammi restano fluidi a quella scala. Stessi file, nessun asset
 * aggiuntivo: si saltano e basta.
 */
const MOBILE_STEP = 3;

/**
 * Ordine di caricamento a passate successive.
 *
 * Prima un fotogramma ogni sei: la sequenza diventa usabile dopo circa
 * un sesto del peso totale. Poi ogni tre, poi tutti. Con 180 immagini
 * il caricamento sequenziale lascerebbe il canvas fermo sul primo
 * fotogramma per troppo tempo.
 */
function loadOrder(length: number) {
  const order: number[] = [];
  const seen = new Set<number>();
  for (const stride of [6, 3, 1]) {
    for (let i = 0; i < length; i += stride) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
}

/** Posa mostrata nella variante senza animazione: tre quarti. */
const STATIC_POSITION = 0.12;

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

/**
 * Inquadratura `contain`: il prodotto sta tutto dentro, anche sui
 * formati stretti. Estratta perché ora serve in tre punti — i due
 * fotogrammi della sfumatura e la costruzione della vignettatura.
 */
function inquadra(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const scala = Math.min(
    canvas.width / image.naturalWidth,
    canvas.height / image.naturalHeight,
  );
  const w = image.naturalWidth * scala;
  const h = image.naturalHeight * scala;
  return { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h };
}

export default function ProductSequence() {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * `sequence` contiene gli indici assoluti dei fotogrammi realmente
   * usati (tutti su desktop, uno ogni tre su mobile) e `images` è
   * parallelo a esso. Tenere i due allineati permette al resto del
   * componente di ragionare su una sola posizione 0..sequence.length-1
   * senza sapere nulla del passo.
   */
  const sequence = useRef<number[]>([]);
  const images = useRef<HTMLImageElement[]>([]);
  const position = useRef(0);

  /**
   * Vignettatura pre-disegnata in un canvas fuori schermo.
   *
   * Le quattro sfumature sui bordi non cambiano mai — dipendono solo
   * dalla dimensione del canvas e dalle proporzioni dell'immagine — ma
   * ridisegnarle a ogni fotogramma significa quattro riempimenti a
   * gradiente su un buffer da 2880x1800. Costruita una volta per
   * resize, resta un solo drawImage per fotogramma, e il tempo
   * risparmiato paga la sfumatura fra fotogrammi qui sotto.
   */
  const vignettatura = useRef<HTMLCanvasElement | null>(null);

  const isReady = (image?: HTMLImageElement) =>
    Boolean(image?.complete && image.naturalWidth);

  /**
   * Posizione più vicina a quella richiesta per cui il fotogramma è
   * già stato caricato.
   *
   * Serve per il caricamento a passate: durante la prima passata solo
   * un fotogramma su sei esiste, e senza questo ripiego il canvas
   * resterebbe fermo sull'ultimo disegnato mentre l'utente scorre.
   * Meglio un fotogramma leggermente sbagliato che uno immobile.
   */
  const nearestLoaded = useCallback((index: number) => {
    const list = images.current;
    if (isReady(list[index])) return index;
    for (let distance = 1; distance < list.length; distance++) {
      const before = index - distance;
      const after = index + distance;
      if (before >= 0 && isReady(list[before])) return before;
      if (after < list.length && isReady(list[after])) return after;
    }
    return -1;
  }, []);

  /** Ricostruisce la vignettatura. Da chiamare a ogni resize. */
  const costruisciVignettatura = useCallback(() => {
    const canvas = canvasRef.current;
    const campione = images.current.find(isReady);
    if (!canvas || !campione || !canvas.width) return;

    const off =
      vignettatura.current ??
      (vignettatura.current = document.createElement("canvas"));
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext("2d");
    if (!octx) return;

    const { x, y, w, h } = inquadra(canvas, campione);
    fadeEdges(octx, x, y, w, h);
  }, []);

  /**
   * Disegna la posizione richiesta, che è FRAZIONARIA.
   *
   * Il fotogramma intero viene disegnato pieno, e sopra gli si sfuma
   * il successivo con opacità pari alla parte decimale. È la
   * correzione della sensazione di scatto: con un indice arrotondato
   * all'intero, scrollando piano l'immagine resta ferma per due o tre
   * frame di rendering e poi salta — si vede la quantizzazione. Due
   * fotogrammi adiacenti distano circa due gradi, quindi la
   * sovrapposizione si legge come sfocatura di movimento, non come
   * immagine doppia.
   */
  const draw = useCallback(
    (valore: number) => {
      // La posizione richiesta viene memorizzata comunque, anche se il
      // fotogramma non c'è ancora: un resize successivo ridisegnerà
      // quello giusto una volta arrivato.
      position.current = valore;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const ultimo = images.current.length - 1;
      if (ultimo < 0) return;

      const base = Math.min(Math.max(Math.floor(valore), 0), ultimo);
      const frazione = valore - Math.floor(valore);

      const primo = nearestLoaded(base);
      if (primo < 0) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const disegna = (indice: number, opacita: number) => {
        const image = images.current[indice];
        const { x, y, w, h } = inquadra(canvas, image);
        ctx.globalAlpha = opacita;
        ctx.drawImage(image, x, y, w, h);
        ctx.globalAlpha = 1;
      };

      disegna(primo, 1);

      // Sotto il 2% la sovrapposizione non si vede e costa un
      // drawImage: si salta.
      if (frazione > 0.02) {
        const successivo = nearestLoaded(Math.min(base + 1, ultimo));
        if (successivo >= 0 && successivo !== primo) {
          disegna(successivo, frazione);
        }
      }

      // Il fondo dello studio nei fotogrammi va da #0d1112 in alto a
      // #242527 in basso, dove c'è il piano: senza sfumatura si
      // vedrebbe il bordo dell'immagine contro il nero della sezione.
      if (vignettatura.current) ctx.drawImage(vignettatura.current, 0, 0);
    },
    [nearestLoaded],
  );

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
    costruisciVignettatura();
    draw(position.current);
  }, [draw, costruisciVignettatura]);

  // --- Caricamento pigro, a passate successive ---------------------
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    // Il passo è deciso una volta al mount: cambiarlo a un resize
    // significherebbe ricaricare l'intera sequenza mentre l'utente
    // trascina il bordo della finestra.
    const step = window.matchMedia("(min-width: 768px)").matches
      ? 1
      : MOBILE_STEP;
    sequence.current = [];
    for (let i = 0; i < FRAME_COUNT; i += step) sequence.current.push(i);
    images.current = new Array(sequence.current.length);

    let cancelled = false;
    resize();

    const loadSequence = async () => {
      const order = loadOrder(sequence.current.length);
      let cursor = 0;

      // Worker che pescano dallo stesso cursore: al massimo
      // CONCURRENCY richieste aperte insieme, e l'ordine resta quello
      // delle passate.
      const worker = async () => {
        while (cursor < order.length && !cancelled) {
          const slot = order[cursor++];
          await new Promise<void>((resolve) => {
            const image = new Image();
            image.decoding = "async";
            image.onload = image.onerror = () => resolve();
            image.src = FRAME_SRC(sequence.current[slot]);
            images.current[slot] = image;
          });
          // Ridisegna man mano: durante le prime passate ogni nuovo
          // fotogramma può essere più vicino di quello ripiegato.
          if (!cancelled) {
            // La vignettatura ha bisogno di un'immagine per conoscere
            // le proporzioni: al primo arrivo va costruita.
            if (!vignettatura.current) costruisciVignettatura();
            draw(position.current);
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (cancelled) return;
      draw(position.current);
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
  }, [draw, resize, costruisciVignettatura]);

  // --- Scena -------------------------------------------------------
  useScene(root, {
    full: () => {
      const last = sequence.current.length - 1;
      // Oggetto proxy: GSAP anima un numero, non il DOM. È il pattern
      // standard per le sequenze canvas.
      const state = { frame: 0 };
      const callouts = gsap.utils.toArray<HTMLElement>("[data-callout]");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          // Con 180 fotogrammi su 220% di viewport si cambia immagine
          // ogni ~11 px di scroll, che è la soglia sotto cui la
          // rotazione smette di leggersi a scatti.
          end: "+=220%",
          scrub: 0.5,
          pin: root.current!.querySelector("[data-pin]"),
          anticipatePin: 1,
        },
      });

      tl.to(
        state,
        {
          frame: last,
          // NIENTE snap: l'indice resta frazionario e draw sfuma fra i
          // due fotogrammi adiacenti. Arrotondando all'intero, a scroll
          // lento si vede la quantizzazione — l'immagine tiene per due
          // o tre frame di rendering e poi salta.
          ease: "none",
          duration: 10,
          onUpdate: () => draw(state.frame),
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

    // Statica: una posa di tre quarti, callout tutti visibili,
    // nessun pin.
    reduced: () => {
      draw(Math.round((sequence.current.length - 1) * STATIC_POSITION));
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
          <p data-reveal className="type-label text-volt">il prodotto</p>

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
                  className="mb-3 block h-1.5 w-1.5 rounded-full bg-volt md:mb-4"
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
