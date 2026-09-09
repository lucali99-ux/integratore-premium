/**
 * Generatore di frame placeholder per la sequenza prodotto.
 *
 * Produce N fotogrammi SVG di una bustina che ruota sul proprio asse
 * verticale. La rotazione è simulata, non 3D reale: la larghezza della
 * faccia frontale segue |cos(θ)| e le ombreggiature scorrono con
 * sin(θ). Basta a validare il meccanismo di scrub del canvas.
 *
 * SOSTITUZIONE CON LE FOTO VERE:
 *   svuota public/sequence/ e metti i tuoi file con lo stesso schema
 *   (frame-001.jpg, frame-002.jpg, ...), poi aggiorna FRAME_COUNT e
 *   l'estensione in components/ProductSequence.tsx. Nient'altro.
 *
 * Uso: node scripts/generate-frames.mjs
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "sequence");
const FRAMES = 60;
const W = 900;
const H = 1200;

// Bustina a riposo (θ = 0)
const BODY_W = 430;
const BODY_H = 780;
const EDGE_W = 52; // spessore minimo: di taglio non sparisce del tutto

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const round = (n) => Math.round(n * 100) / 100;

for (let i = 0; i < FRAMES; i++) {
  const t = i / FRAMES;
  const angle = t * Math.PI * 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Larghezza prospettica + spessore minimo del bordo
  const w = round(EDGE_W + (BODY_W - EDGE_W) * Math.abs(cos));
  const x = round((W - w) / 2);
  const y = round((H - BODY_H) / 2);

  // Il fronte è leggibile solo quando è girato verso di noi
  const faceOpacity = round(Math.max(0, cos) ** 0.6);
  const backOpacity = round(Math.max(0, -cos) ** 0.6);

  // La luce speculare scorre sulla superficie con la rotazione
  const gloss = round(0.5 + sin * 0.35);
  const shade = round(0.08 + Math.abs(sin) * 0.22);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- Foil: il gradiente si sposta con l'angolo, è ciò che vende la rotazione -->
    <linearGradient id="foil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9d9c95"/>
      <stop offset="${round(Math.max(0.05, Math.min(0.95, gloss)))}" stop-color="#f1f0eb"/>
      <stop offset="1" stop-color="#8e8d86"/>
    </linearGradient>
    <linearGradient id="seal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#050505"/>
      <stop offset="${round(Math.max(0.05, Math.min(0.95, gloss)))}" stop-color="#2b2b2b"/>
      <stop offset="1" stop-color="#050505"/>
    </linearGradient>
    <clipPath id="body">
      <rect x="${x}" y="${y}" width="${w}" height="${BODY_H}" rx="14"/>
    </clipPath>
  </defs>

  <g clip-path="url(#body)">
    <rect x="${x}" y="${y}" width="${w}" height="${BODY_H}" fill="url(#foil)"/>
    <!-- Ombra di curvatura sul lato che si allontana -->
    <rect x="${x}" y="${y}" width="${w}" height="${BODY_H}" fill="#000" opacity="${shade}"/>

    <!-- Sigilli: testa (con dentellatura di strappo) e fondo -->
    <rect x="${x}" y="${y}" width="${w}" height="96" fill="url(#seal)"/>
    <rect x="${x}" y="${round(y + BODY_H - 62)}" width="${w}" height="62" fill="url(#seal)"/>
    <rect x="${round(x + w * 0.5 - 26)}" y="${round(y + 88)}" width="52" height="10" fill="#0b0b0b"/>

    <!-- Fronte -->
    <g opacity="${faceOpacity}">
      <text x="${W / 2}" y="${round(y + 300)}" text-anchor="middle"
            font-family="Helvetica, Arial, sans-serif" font-size="76" font-weight="600"
            letter-spacing="-3" fill="#0b0b0b">volta</text>
      <rect x="${round(W / 2 - 90)}" y="${round(y + 336)}" width="180" height="2" fill="#0b0b0b" opacity="0.35"/>
      <text x="${W / 2}" y="${round(y + 384)}" text-anchor="middle"
            font-family="Helvetica, Arial, sans-serif" font-size="21" letter-spacing="3"
            fill="#0b0b0b" opacity="0.7">magnesio marino</text>
      <text x="${W / 2}" y="${round(y + 700)}" text-anchor="middle"
            font-family="Helvetica, Arial, sans-serif" font-size="19" letter-spacing="2"
            fill="#0b0b0b" opacity="0.55">4,5 g · monodose</text>
    </g>

    <!-- Retro: solo il codice lotto, come su una bustina vera -->
    <g opacity="${backOpacity}">
      <text x="${W / 2}" y="${round(y + 360)}" text-anchor="middle"
            font-family="Helvetica, Arial, sans-serif" font-size="19" letter-spacing="2"
            fill="#0b0b0b" opacity="0.55">lot. VLT-0${(i % 9) + 1}</text>
    </g>
  </g>

  <!-- Numero di frame: serve solo a verificare lo scrub, va via con le foto vere -->
  <text x="40" y="${H - 36}" font-family="Helvetica, Arial, sans-serif"
        font-size="24" fill="#8a8a82" opacity="0.5">${String(i + 1).padStart(3, "0")} / ${FRAMES}</text>
</svg>`;

  writeFileSync(join(OUT, `frame-${String(i + 1).padStart(3, "0")}.svg`), svg);
}

console.log(`✓ ${FRAMES} frame generati in public/sequence/`);
