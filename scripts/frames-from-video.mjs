/**
 * Estrae i fotogrammi della sequenza prodotto da un video di rotazione.
 *
 * Uso:
 *   node scripts/frames-from-video.mjs <video> [numero-frame] [altezza-px] [crop]
 *
 * Esempio:
 *   node scripts/frames-from-video.mjs assets/rotazione.mp4 60 1200 700:1248:482:0
 *
 * Il ritaglio (w:h:x:y, sintassi di ffmpeg) serve quasi sempre: un video
 * di prodotto ha molta aria attorno al soggetto, e il canvas usa un fit
 * `contain` — senza ritaglio il prodotto risulta molto più piccolo di
 * quanto lo spazio permetterebbe.
 *
 * Scrive public/sequence/frame-001.jpg … e svuota la cartella prima.
 * Dopo l'estrazione aggiorna FRAME_COUNT e FRAME_EXT in
 * components/ProductSequence.tsx se hai cambiato numero o formato.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";

const [video, countArg, heightArg, cropArg] = process.argv.slice(2);
if (!video || !existsSync(video)) {
  console.error("Serve il percorso di un video esistente.");
  process.exit(1);
}

const FRAMES = Number(countArg) || 60;
const HEIGHT = Number(heightArg) || 1200;
const OUT = join(process.cwd(), "public", "sequence");

// La durata serve a calcolare l'fps che produce esattamente FRAMES
// fotogrammi distribuiti in modo uniforme: estrarne "a caso" darebbe
// una rotazione che accelera e rallenta lungo lo scroll.
const duration = Number(
  execFileSync(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    video,
  ], { encoding: "utf8" }).trim(),
);

const fps = (FRAMES / duration).toFixed(6);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

execFileSync(FFMPEG, [
  "-v", "error",
  "-i", video,
  "-vf", [
    `fps=${fps}`,
    cropArg ? `crop=${cropArg}` : null,
    `scale=-2:${HEIGHT}`,
  ].filter(Boolean).join(","),
  "-frames:v", String(FRAMES),
  // qualità 4: sotto i 6 gli artefatti si notano sui gradienti del
  // fondo scuro, sopra i 3 il peso cresce senza guadagno visibile.
  "-q:v", "4",
  join(OUT, "frame-%03d.jpg"),
], { stdio: "inherit" });

const written = readdirSync(OUT).length;
console.log(
  `✓ ${written} frame in public/sequence/ ` +
  `(video ${duration.toFixed(2)}s → ${fps} fps, altezza ${HEIGHT}px` +
  `${cropArg ? `, crop ${cropArg}` : ""})`,
);
