"use client";

import { useId } from "react";

/**
 * Divisore a zig-zag.
 *
 * Sostituisce le righe dritte che separano i blocchi. Il colore viene
 * da `currentColor`, quindi si imposta con una classe di testo sul
 * componente e funziona sia sulle sezioni chiare sia su quelle scure.
 *
 * Il motivo è un `<pattern>` SVG in coordinate utente: si ripete da
 * solo su qualsiasi larghezza senza ricalcoli in JavaScript, e resta
 * nitido a ogni densità di schermo.
 *
 * L'id del pattern viene da useId perché sulla pagina ce ne sono
 * decine: con un id fisso tutte le istanze punterebbero alla prima,
 * e cambiare colore a una le cambierebbe tutte.
 */
export default function ZigZag({
  className = "",
  passo = 14,
  altezza = 7,
}: {
  className?: string;
  /** Larghezza di un dente. Più piccolo = zig-zag più fitto. */
  passo?: number;
  altezza?: number;
}) {
  const id = useId().replace(/:/g, "");
  const meta = passo / 2;

  return (
    <svg
      aria-hidden
      width="100%"
      height={altezza}
      className={`block ${className}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <pattern
          id={id}
          width={passo}
          height={altezza}
          patternUnits="userSpaceOnUse"
        >
          <polyline
            points={`0,${altezza - 0.5} ${meta},0.5 ${passo},${altezza - 0.5}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </pattern>
      </defs>
      <rect width="100%" height={altezza} fill={`url(#${id})`} />
    </svg>
  );
}
