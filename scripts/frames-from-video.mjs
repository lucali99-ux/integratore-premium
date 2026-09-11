/**
 * Estrae i fotogrammi della sequenza prodotto da un video di rotazione.
 *
 * Uso:
 *   node scripts/frames-from-video.mjs <video> [numero] [altezza] [crop] [--uniforme]
 *
 * Esempio:
 *   node scripts/frames-from-video.mjs assets/rotazione.mp4 160 1200 700:1248:482:0
 *
 * IL PROBLEMA CHE QUESTO SCRIPT RISOLVE
 *
 * Un video generato dall'IA non ruota a velocità costante: resta fermo
 * per qualche decimo, poi scatta. Misurato sul nostro turntable, la
 * deviazione standard della differenza fra fotogrammi consecutivi era
 * l'86% della media, con 26 fotogrammi su 180 praticamente immobili e
 * picchi fino a 8 volte la media. Campionando a intervalli di TEMPO
 * uguali quell'irregolarità finisce dritta nella sequenza, e nessun
 * aumento del numero di fotogrammi la corregge.
 *
 * Qui i fotogrammi vengono scelti a intervalli di CAMBIAMENTO VISIVO
 * uguali: si misura quanto ogni fotogramma differisce dal precedente,
 * si costruisce una curva cumulativa di movimento e si campiona quella
 * in parti uguali. Le zone ferme collassano in pochi fotogrammi, le
 * zone veloci ne ricevono di più, e la rotazione risulta a velocità
 * percepita costante.
 *
 * Con `--uniforme` si torna al campionamento a tempo, utile se il
 * sorgente è già un render a velocità costante.
 *
 * LIVELLI
 *
 * La variabile d'ambiente LIVELLI applica una correzione dei livelli
 * ai fotogrammi estratti, nella forma `nero:bianco` in frazioni di
 * 0–1. Serve quando il fondo dello studio nel video è più chiaro del
 * fondo della sezione in pagina: senza, il fotogramma si legge come un
 * rettangolo grigio appoggiato sul nero.
 *
 *   LIVELLI=0.30:0.92 node scripts/frames-from-video.mjs ...
 *
 * Il valore del nero va scelto misurando: deve stare sopra il punto
 * più chiaro del FONDO e sotto il punto più scuro del PRODOTTO.
 *
 * INTERPOLAZIONE DEL SORGENTE
 *
 * La riequalizzazione non può inventare fotogrammi: se il sorgente ne
 * ha pochi proprio dove il movimento è veloce, quelli scelti si
 * ripetono. Il nostro turntable comprimeva il passaggio di taglio in
 * dodici fotogrammi su 193. Si risolve alzando il frame rate del
 * sorgente con interpolazione a compensazione di moto, PRIMA di
 * estrarre:
 *
 *   ffmpeg -i assets/rotazione-prodotto.mp4 \
 *     -vf "minterpolate=fps=72:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" \
 *     -c:v libx264 -crf 16 assets/rotazione-interpolata.mp4
 *
 * Da 193 a 574 fotogrammi, circa 75 secondi di elaborazione. Va
 * sempre ispezionato il tratto in cui la sagoma cambia più in fretta,
 * perché è lì che l'interpolazione produce deformazioni.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";

const args = process.argv.slice(2);
const UNIFORME = args.includes("--uniforme");
const [video, countArg, heightArg, cropArg] = args.filter((a) => a !== "--uniforme");

if (!video || !existsSync(video)) {
  console.error("Serve il percorso di un video esistente.");
  process.exit(1);
}

const FRAMES = Number(countArg) || 160;
const HEIGHT = Number(heightArg) || 1200;
const OUT = join(process.cwd(), "public", "sequence");

/**
 * Smorzamento della riequalizzazione.
 *
 * Con 1 il campionamento segue esattamente il cambiamento misurato,
 * con 0 torna a un campionamento uniforme. Misurato sul nostro
 * turntable, sulla deviazione standard della differenza fra
 * fotogrammi consecutivi (più bassa = più uniforme):
 *
 *   0.5 → 45%    0.8 → 34%    1.0 → 37%
 *
 * A 1 il passaggio di taglio, dove la sagoma cambia in modo violento,
 * si mangia troppi fotogrammi e le zone lente tornano a ripetersi.
 * 0.8 è il punto in cui gli scatti scendono a due su centottanta.
 */
const SMORZAMENTO = Number(process.env.SMORZAMENTO) || 0.8;

/** Filtro di ritaglio condiviso fra analisi ed estrazione. */
const crop = cropArg ? `crop=${cropArg},` : "";

/**
 * Correzione dei livelli, opzionale. Alza il punto di nero per
 * mandare il fondo dello studio a nero pieno, e abbassa quello di
 * bianco per non spegnere il prodotto nel farlo.
 */
const livelli = (() => {
  if (!process.env.LIVELLI) return "";
  const [nero, bianco] = process.env.LIVELLI.split(":").map(Number);
  const canali = ["r", "g", "b"]
    .map((c) => `${c}imin=${nero}:${c}imax=${bianco ?? 1}`)
    .join(":");
  return `,colorlevels=${canali}`;
})();

const durata = Number(
  execFileSync(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    video,
  ], { encoding: "utf8" }).trim(),
);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------
// Modalità a tempo: un solo passaggio di ffmpeg e finisce qui.
// ---------------------------------------------------------------
if (UNIFORME) {
  const fps = (FRAMES / durata).toFixed(6);
  execFileSync(FFMPEG, [
    "-v", "error", "-i", video,
    "-vf", `fps=${fps},${crop}scale=-2:${HEIGHT}${livelli}`,
    "-frames:v", String(FRAMES),
    "-q:v", "4",
    join(OUT, "frame-%03d.jpg"),
  ], { stdio: "inherit" });
  console.log(`✓ ${readdirSync(OUT).length} frame (campionamento a tempo, ${fps} fps)`);
  process.exit(0);
}

// ---------------------------------------------------------------
// 1. Analisi: tutti i fotogrammi sorgente in grigio piccolo, in un
//    unico flusso su stdout. Un'invocazione di ffmpeg per fotogramma
//    richiederebbe minuti.
// ---------------------------------------------------------------
const AW = 64, AH = 114;
const grezzo = execFileSync(FFMPEG, [
  "-v", "error", "-i", video,
  "-vf", `${crop}scale=${AW}:${AH},format=gray`,
  "-f", "rawvideo", "-",
], { maxBuffer: 1 << 28 });

const sorgente = Math.floor(grezzo.length / (AW * AH));
const piano = (i) => grezzo.subarray(i * AW * AH, (i + 1) * AW * AH);

// ---------------------------------------------------------------
// 2. Curva cumulativa di movimento.
//    L'ultimo fotogramma si confronta col primo: la rotazione è un
//    ciclo chiuso, e senza questo l'ultimo tratto resterebbe fuori.
// ---------------------------------------------------------------
const peso = [];
for (let i = 0; i < sorgente; i++) {
  const a = piano(i);
  const b = piano((i + 1) % sorgente);
  let somma = 0;
  for (let j = 0; j < a.length; j++) somma += Math.abs(a[j] - b[j]);
  peso.push(Math.pow(somma / a.length, SMORZAMENTO));
}

const cumulato = [];
let totale = 0;
for (const p of peso) {
  totale += p;
  cumulato.push(totale);
}

// ---------------------------------------------------------------
// 3. Scelta dei fotogrammi: si campiona la curva in parti uguali.
// ---------------------------------------------------------------
const scelti = [];
let cursore = 0;
for (let k = 0; k < FRAMES; k++) {
  const bersaglio = (k / FRAMES) * totale;
  while (cursore < sorgente - 1 && cumulato[cursore] < bersaglio) cursore++;
  scelti.push(cursore);
}

// ---------------------------------------------------------------
// 4. Estrazione di tutti i fotogrammi, poi copia di quelli scelti.
// ---------------------------------------------------------------
const temporanea = join(tmpdir(), `sequenza-${Date.now()}`);
mkdirSync(temporanea, { recursive: true });
execFileSync(FFMPEG, [
  "-v", "error", "-i", video,
  "-vf", `${crop}scale=-2:${HEIGHT}${livelli}`,
  // qualità 4: sotto i 6 gli artefatti si notano sui gradienti del
  // fondo scuro, sopra i 3 il peso cresce senza guadagno visibile.
  "-q:v", "4",
  join(temporanea, "src-%04d.jpg"),
], { stdio: "inherit" });

scelti.forEach((indice, k) => {
  const origine = join(temporanea, `src-${String(indice + 1).padStart(4, "0")}.jpg`);
  writeFileSync(join(OUT, `frame-${String(k + 1).padStart(3, "0")}.jpg`), readFileSync(origine));
});
rmSync(temporanea, { recursive: true, force: true });

const unici = new Set(scelti).size;
console.log(
  `✓ ${FRAMES} frame in public/sequence/\n` +
  `  sorgente: ${sorgente} fotogrammi in ${durata.toFixed(2)}s\n` +
  `  campionamento a cambiamento visivo costante (smorzamento ${SMORZAMENTO})\n` +
  `  fotogrammi sorgente distinti usati: ${unici}/${sorgente}` +
  (unici < FRAMES ? `  — ${FRAMES - unici} ripetuti nelle zone lente` : ""),
);
