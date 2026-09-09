"use client";

/**
 * Sincronizzazione fra l'intro e il resto della pagina.
 *
 * L'hero non deve animare la propria entrata mentre l'intro è ancora
 * a schermo: si consumerebbe dietro alle bande nere e l'utente
 * atterrerebbe su una headline già ferma.
 *
 * Chi deve aspettare fa `introDone.then(...)`. Se l'intro non gira
 * affatto (prefers-reduced-motion, o intro disattivata) la promessa
 * viene risolta subito, quindi nessuno resta bloccato in attesa.
 */
let resolveIntro: (() => void) | undefined;

export const introDone = new Promise<void>((resolve) => {
  resolveIntro = resolve;
});

export function markIntroDone() {
  resolveIntro?.();
}
