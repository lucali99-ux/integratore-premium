/**
 * Ritaglia un PNG scontornato al rettangolo minimo che contiene il
 * soggetto, poi lo ridimensiona.
 *
 * Uso:
 *   node scripts/ritaglia-scontorno.mjs <ingresso.png> <uscita.png> [altezza]
 *
 * Perché serve: i PNG che escono dallo scontorno hanno molto margine
 * trasparente attorno al prodotto. Montati così, il prodotto risulta
 * molto più piccolo dello spazio che occupa, e le classi di altezza
 * nel CSS diventano impossibili da accordare fra un asset e l'altro.
 *
 * Il bounding box si ricava dal canale alpha: ffmpeg lo estrae come
 * immagine in scala di grigi, e la si scandisce per trovare la prima e
 * l'ultima riga e colonna con un pixel non trasparente.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";
const SOGLIA = 12; // sotto questo valore l'alpha è considerato vuoto
const MARGINE = 0.02; // 2% di aria attorno al soggetto

const [ingresso, uscita, altezzaArg] = process.argv.slice(2);
if (!ingresso || !existsSync(ingresso) || !uscita) {
  console.error("Uso: node scripts/ritaglia-scontorno.mjs <in.png> <out.png> [altezza]");
  process.exit(1);
}
const ALTEZZA = Number(altezzaArg) || 1050;

const [L, A] = execFileSync(FFPROBE, [
  "-v", "error", "-select_streams", "v:0",
  "-show_entries", "stream=width,height",
  "-of", "csv=p=0:s=x", ingresso,
], { encoding: "utf8" }).trim().split("x").map(Number);

// Canale alpha in un unico flusso grezzo: una passata sola.
const alpha = execFileSync(FFMPEG, [
  "-v", "error", "-i", ingresso,
  "-vf", "alphaextract,format=gray",
  "-f", "rawvideo", "-",
], { maxBuffer: 1 << 28 });

let minX = L, maxX = -1, minY = A, maxY = -1;
for (let y = 0; y < A; y++) {
  const riga = alpha.subarray(y * L, (y + 1) * L);
  let primo = -1, ultimo = -1;
  for (let x = 0; x < L; x++) {
    if (riga[x] > SOGLIA) {
      if (primo < 0) primo = x;
      ultimo = x;
    }
  }
  if (primo < 0) continue;
  if (y < minY) minY = y;
  maxY = y;
  if (primo < minX) minX = primo;
  if (ultimo > maxX) maxX = ultimo;
}

if (maxX < 0) {
  console.error("Immagine completamente trasparente.");
  process.exit(1);
}

const aria = Math.round(Math.max(maxX - minX, maxY - minY) * MARGINE);
const x = Math.max(0, minX - aria);
const y = Math.max(0, minY - aria);
const w = Math.min(L - x, maxX - minX + 1 + aria * 2);
const h = Math.min(A - y, maxY - minY + 1 + aria * 2);

const temporanea = join(tmpdir(), `ritaglio-${Date.now()}.png`);
execFileSync(FFMPEG, [
  "-v", "error", "-y", "-i", ingresso,
  "-vf", `crop=${w}:${h}:${x}:${y},scale=-1:${ALTEZZA}`,
  "-pix_fmt", "rgba", temporanea,
], { stdio: "inherit" });
execFileSync("cp", [temporanea, uscita]);
rmSync(temporanea, { force: true });

console.log(`✓ ${uscita}  (da ${L}x${A} → ritaglio ${w}x${h} → altezza ${ALTEZZA})`);
