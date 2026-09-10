# VOLTA — sito di prodotto

Pezzo espressivo "hero product brand" per un integratore fittizio di recupero
sportivo (magnesio marino + elettroliti in bustine). Riferimento di direzione:
`sofihealth.com`.

Stack: **Next.js 16** (App Router) · **Tailwind CSS v4** · **GSAP 3.15**
(ScrollTrigger + SplitText) · **Lenis**.

```bash
npm run dev     # sviluppo
npm run build   # build di produzione
```

---

## Struttura

```
app/
  layout.tsx        font, metadata, montaggio di SmoothScroll/Header/ScrollProgress/SideCta
  page.tsx          ordine delle sezioni
  globals.css       TUTTO il design system (token, registri tipografici, regole Lenis)
lib/
  animation.ts      registrazione plugin GSAP + hook useScene
lib/
  intro.ts          promessa condivisa: l'hero attende la fine dell'intro
  scroll.ts         registro Lenis + blocco/sblocco dello scroll
components/
  CinemaIntro.tsx   intro "a feritoia" (bande nere che si ritraggono)
  SmoothScroll.tsx  Lenis sincronizzato con il ticker GSAP
  Header.tsx        header fisso (Server Component, mix-blend-difference)
  ScrollProgress.tsx barra fissa in basso: valori + % di scroll
  SideCta.tsx       tab CTA verticale sul bordo destro
  Hero.tsx          §1 reveal char-by-char (load + scrub)
  Philosophy.tsx    §2 sezione pinnata, testo che si riempie per parole
  ProductType.tsx   §3a prodotto sovrapposto alla tipografia (parallasse)
  ProductSequence.tsx §3b sequenza canvas pinnata + callout
  Ingredients.tsx   §4 griglia formula (stagger reveal)
  Results.tsx       §5 contatore + prima/dopo
  FinalCta.tsx      §6 chiusura d'acquisto (reveal per righe)
  Footer.tsx        valori del brand (Server Component)
scripts/
  generate-frames.mjs   generatore dei frame placeholder (fallback)
  frames-from-video.mjs estrattore dei frame da un video di rotazione
```

---

## L'intro "cinema"

`components/CinemaIntro.tsx`. Schermo nero, una feritoia orizzontale che
si apre a tre scatti, e dentro parole (`recupera`, `reintegra`,
`naturalmente`) **tagliate dalle bande nere** sopra e sotto. All'ultimo
scatto la feritoia si apre a tutto schermo sull'hero.

Cose da sapere se ci metti mano:

- le aperture stanno in `APERTURE = [0.9, 0.75, 0.56]` — sono quanto resta
  *coperto*. Valori alti di proposito: se la feritoia si apre troppo la
  parola ci sta dentro intera e l'effetto sparisce;
- le bande si muovono con `scaleY`, mai con `height`: la seconda farebbe un
  layout per frame su due elementi a tutto schermo;
- il fondo dell'overlay è lo stesso `paper` dell'hero, così l'apertura
  finale non produce nessun lampo di colore;
- l'hero **aspetta** l'intro tramite la promessa `introDone` di
  `lib/intro.ts`: senza, la sua entrata si consumerebbe dietro al nero;
- click o rotella saltano l'intro accelerando la timeline (`timeScale(7)`)
  invece di saltare a `progress(1)`, così l'uscita resta un movimento e le
  callback di chiusura girano nell'ordine giusto;
- con `prefers-reduced-motion: reduce` l'intro non parte affatto e
  `markIntroDone()` viene chiamata subito, quindi nessuno resta in attesa.

Durata: circa 5,6 secondi.

---

## Gli asset del prodotto

Generati con Higgsfield e installati in `public/product/`:

| File | Cosa | Dove si usa |
|---|---|---|
| `pouch-cutout.png` | stick scontornato, canale alpha, ritagliato al bounding box | hero + sezione tipografica |
| `pouch-scene.jpg` | scatto scenico su fondo chiaro con ombra lunga | riserva |
| `pouch-dark.jpg` | scatto frontale su fondo scuro | fotogramma di partenza del video |

Lo scontorno serve perché il beige dello scatto non coincide con il `paper`
del sito: montando il rettangolo fotografico si vedrebbe il bordo. Con il PNG
in alpha il prodotto galleggia su qualsiasi fondo, e l'ombra è una
`drop-shadow` CSS — che segue la sagoma, a differenza di `box-shadow`.

Hero e sezione tipografica usano `next/image` (con `priority` sull'hero, che
è l'elemento LCP): conversione automatica in AVIF/WebP e dimensionamento per
viewport. Era `<img>` finché gli asset erano SVG, formato per cui `next/image`
richiede il flag di sicurezza `dangerouslyAllowSVG`.

I bordi dei fotogrammi della sequenza vengono sfumati nel nero della sezione
dentro `draw()` di `ProductSequence`, non con una mask CSS: il fondo dello
studio nei frame va da `#0d1112` a `#242527`, e su mobile l'immagine non
riempie il canvas — una mask sull'elemento cadrebbe nel punto sbagliato.

### Rifare la sequenza di rotazione

```bash
node scripts/frames-from-video.mjs <video> 180 1200 700:1248:482:0
```

Lo script calcola l'fps che distribuisce esattamente 180 fotogrammi sulla
durata del video: estrarne "a caso" darebbe una rotazione che accelera e
rallenta lungo lo scroll. Scrive `public/sequence/frame-001.jpg` …

**Quanti fotogrammi servono.** La misura da guardare non è il numero ma i
**pixel di scroll per fotogramma**: distanza di pin diviso numero di
fotogrammi. Con 60 immagini su `+=220%` di viewport si cambiava immagine ogni
33 px e la rotazione si vedeva a scatti; con 180 si sta a 11 px, che è dentro
la finestra 5–15 px in cui il movimento si legge continuo. Se allunghi la
distanza di pin, alza i fotogrammi in proporzione.

Se cambi numero di frame o formato, aggiorna `FRAME_COUNT` e `FRAME_EXT` in
`components/ProductSequence.tsx`. Nient'altro: caricamento pigro, fit
`contain`, gestione del DPI e scrub restano identici.

**Caricamento.** Il componente carica a passate successive — prima un
fotogramma ogni sei, poi ogni tre, poi tutti — e `draw()` ripiega sul
fotogramma caricato più vicino a quello richiesto. Senza il ripiego, durante
la prima passata il canvas resterebbe fermo sull'ultima immagine disegnata
mentre l'utente scorre: meglio un fotogramma leggermente sbagliato che uno
immobile.

**Su mobile** si usa un fotogramma ogni tre (`MOBILE_STEP`): lì il prodotto è
disegnato a circa 227 px di larghezza, e tenere 180 immagini decodificate per
quella dimensione è spreco puro. Verificato: 60 richieste e 1,1 MB su 390 px
di viewport, 180 e 3,3 MB su 1440 px. Stessi file, nessun asset aggiuntivo.

`scripts/generate-frames.mjs` resta come fallback: rigenera i placeholder
geometrici numerati se ti serve lavorare senza gli asset veri.

---

## Regole del sistema

**Un solo momento animato forte per sezione.** Se ne aggiungi uno, toglierne
un altro nella stessa sezione.

**Ogni scena dichiara due varianti.** `lib/animation.ts` espone `useScene`, che
obbliga a scrivere sia `full` (l'animazione) sia `reduced` (lo stato finale
statico). La variante `reduced` non deve mai limitarsi a "non animare": deve
portare gli elementi dove sarebbero finiti. Verificato: con
`prefers-reduced-motion: reduce` la pagina non ha nessun elemento a
`opacity: 0` o `visibility: hidden`, il contatore mostra `87`, e non viene
creato nessun pin né lo smooth scroll.

**Non si clona la reference, si clonano i meccanismi.** Della pagina di
riferimento si riprende *come si comporta* — cosa è pinnato, cosa è in scrub,
come il testo si rivela, il ritmo delle sezioni. Non si riprendono le sue
forme riconoscibili: il fondale della sezione filosofia era una copia della
capsula di sofi ed è stato sostituito con un reticolo di righe che si apre,
che riprende invece le bande orizzontali dell'intro — il motivo proprio di
questo sito.

**Il lime (`--color-volt`) è una risorsa scarsa.** Tre soli usi: il pallino
meta dell'hero, l'hover delle CTA, il numero della sezione risultati. Il
premium del riferimento nasce dall'assenza di colore: aggiungerne indebolisce
tutto il resto.

**Attenzione ai token `--text-*` in Tailwind v4.** Quel namespace *è* quello
delle utility di dimensione: chiamare un token `--text-xl` sovrascrive il
`text-xl` di Tailwind in tutto il progetto. Per questo la scala display usa
`--text-mega`, `--text-xxl`, `--text-lead`, `--text-values`.

---

## Strumenti di debug (solo in sviluppo)

In `development` vengono esposti su `window`: `__lenis`, `gsap`, `ScrollTrigger`.
Servono a ispezionare un punto preciso della timeline dalla console:

```js
__lenis.scrollTo(5000, { immediate: true })
ScrollTrigger.getAll().map(s => [s.trigger?.id, s.start, s.end, s.progress])
```

I rami sono racchiusi in `process.env.NODE_ENV === "development"` e non
finiscono nel bundle di produzione.
