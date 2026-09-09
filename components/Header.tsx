/**
 * Header fisso e minimale.
 *
 * Nessun JavaScript: `mix-blend-difference` su testo bianco fa sì che
 * l'header si inverta automaticamente sopra le sezioni chiare e scure.
 * Questo elimina il bisogno di uno ScrollTrigger che tracci il colore
 * del fondo — motivo per cui questo resta un Server Component.
 *
 * Vincolo del blend: nessun elemento può avere un fondo proprio, quindi
 * la CTA qui è testuale. Le CTA "piene" vivono nell'hero, nel tab
 * laterale e nella chiusura.
 */
export default function Header() {
  const links = [
    ["formula", "#formula"],
    ["prodotto", "#prodotto"],
    ["risultati", "#risultati"],
  ] as const;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 mix-blend-difference">
      <div className="shell flex h-16 items-center justify-between gap-6 text-white md:h-20">
        <a
          href="#top"
          className="type-display pointer-events-auto text-2xl md:text-[1.75rem]"
        >
          volta
        </a>

        <div className="flex items-center gap-6 md:gap-10">
          <nav className="hidden items-center gap-8 md:flex">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="type-label pointer-events-auto opacity-60 transition-opacity hover:opacity-100"
              >
                {label}
              </a>
            ))}
          </nav>

          <a
            href="#acquista"
            className="type-label pointer-events-auto flex items-center gap-2"
          >
            acquista
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </header>
  );
}
