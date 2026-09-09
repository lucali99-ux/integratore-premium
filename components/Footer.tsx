/**
 * Footer.
 *
 * Chiude con i tre valori del brand alla scala della headline: è la
 * stessa mossa della pagina di riferimento, e riporta la barra fissa
 * in basso ("purezza vegetale · ricerca applicata · prestazione") alla
 * sua dimensione originale.
 *
 * Nessuna animazione, deliberatamente: è l'unico punto della pagina in
 * cui il movimento non aggiungerebbe niente. Resta un Server Component.
 */
export default function Footer() {
  const values = [
    ["purezza", "materie prime"],
    ["ricerca", "dosaggi validati"],
    ["prestazione", "chi si allena"],
  ] as const;

  return (
    <footer className="bg-paper pt-[clamp(5rem,12vh,9rem)] pb-24">
      <div className="shell">
        {/* Una riga sola: le parole scalano con --text-values per
            stare in larghezza invece di andare a capo. Su mobile
            impilate, dove una riga sola sarebbe illeggibile. */}
        <div className="flex flex-col gap-8 sm:flex-row sm:flex-nowrap sm:items-end sm:gap-[clamp(1rem,3vw,3.5rem)]">
          {values.map(([word, label], index) => (
            <div key={word} className="flex items-end gap-[clamp(1rem,3vw,3.5rem)]">
              <div>
                <p className="type-meta mb-2 text-ash">{label}</p>
                <p className="type-display text-values whitespace-nowrap">
                  {word}
                </p>
              </div>
              {index < values.length - 1 && (
                <span
                  aria-hidden
                  className="mb-[0.3em] hidden h-1.5 w-1.5 shrink-0 rounded-full bg-ink sm:block"
                />
              )}
            </div>
          ))}
        </div>

        <div className="type-meta mt-20 flex flex-col gap-4 border-t border-line pt-8 text-ash sm:flex-row sm:items-center sm:justify-between">
          <p>© volta 2026 · marchio fittizio a scopo dimostrativo</p>
          <p>
            gli integratori non sostituiscono una dieta variata e uno stile di
            vita sano
          </p>
        </div>
      </div>
    </footer>
  );
}
