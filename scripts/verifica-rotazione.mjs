/**
 * Verifica che un video di turntable contenga davvero UN giro completo.
 *
 * Uso:
 *   node scripts/verifica-rotazione.mjs <video> [crop]
 *
 * COSA MISURA E PERCHÉ
 *
 * La larghezza della sagoma è la firma diretta dell'angolo: un oggetto
 * piatto che ruota sul proprio asse è largo quando è di faccia e
 * stretto quando è di taglio. Contando i minimi di larghezza si sa
 * quante volte passa di taglio, e da lì quanti gradi ha percorso.
 *
 *   giro completo di 360°  →  2 passaggi di taglio, 3 facce larghe
 *   mezzo giro di 180°     →  1 passaggio,           2 facce
 *   oscillazione           →  numero dispari di facce fra due tagli,
 *                             oppure due facce larghe consecutive
 *                             separate da un solo taglio
 *
 * Serve perché i modelli video, a cui si chiede una rotazione completa,
 * tendono a girare fin oltre il mezzo giro e poi tornare indietro. A
 * occhio, scorrendo, si legge come "la bustina gira male" senza che sia
 * evidente il perché.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const [video, crop] = process.argv.slice(2);
if (!video || !existsSync(video)) {
  console.error("Uso: node scripts/verifica-rotazione.mjs <video> [w:h:x:y]");
  process.exit(1);
}

const W = 160, H = 280;
const filtro = [crop ? `crop=${crop}` : null, `scale=${W}:${H}`, "format=gray"]
  .filter(Boolean)
  .join(",");

const grezzo = execFileSync(FFMPEG, [
  "-v", "error", "-i", video, "-vf", filtro, "-f", "rawvideo", "-",
], { maxBuffer: 1 << 28 });

const N = Math.floor(grezzo.length / (W * H));
const larghezze = [];
for (let i = 0; i < N; i++) {
  const riga = grezzo.subarray(i * W * H + (H >> 1) * W, i * W * H + ((H >> 1) + 1) * W);
  let n = 0;
  for (const v of riga) if (v > 90) n++;
  larghezze.push(n);
}

const max = Math.max(...larghezze);
const min = Math.min(...larghezze);
// Soglia a metà fra il minimo e il massimo: separa "di taglio" da
// "di faccia" senza dipendere dalle dimensioni assolute del soggetto.
const soglia = min + (max - min) * 0.45;

// Conta le transizioni faccia → taglio → faccia
let stato = larghezze[0] > soglia ? "faccia" : "taglio";
const passaggi = [];
larghezze.forEach((l, i) => {
  const nuovo = l > soglia ? "faccia" : "taglio";
  if (nuovo !== stato) {
    passaggi.push({ a: nuovo, frame: i + 1 });
    stato = nuovo;
  }
});

const tagli = passaggi.filter((p) => p.a === "taglio").length;
const facce = passaggi.filter((p) => p.a === "faccia").length + 1;

console.log(`fotogrammi analizzati : ${N}`);
console.log(`larghezza min / max   : ${min} / ${max}  (soglia ${soglia.toFixed(0)})`);
console.log(`passaggi di taglio    : ${tagli}`);
console.log(`facce larghe          : ${facce}`);
console.log(`transizioni           : ${passaggi.map((p) => `${p.a}@${p.frame}`).join("  ")}`);
console.log();

if (tagli === 2 && facce === 3) {
  console.log("✓ GIRO COMPLETO: fronte → taglio → retro → taglio → fronte");
} else if (tagli === 1 && facce === 2) {
  console.log("~ MEZZO GIRO: fronte → taglio → retro. Coerente, ma 180°.");
} else {
  console.log(
    `✗ ROTAZIONE NON VALIDA: con ${tagli} tagli e ${facce} facce il\n` +
    "  movimento non è un giro monotono. Con due facce consecutive\n" +
    "  separate da un solo taglio l'oggetto torna indietro invece di\n" +
    "  proseguire: sono i fotogrammi che mancherebbero per il giro.",
  );
}
