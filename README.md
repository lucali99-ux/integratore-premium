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
  CinemaIntro.tsx   intro: apertura obliqua orizzontale
  Athletes.tsx      prova sociale: citazione in scrub + tre ritratti
  ZigZag.tsx        divisore dinamico (pattern SVG, colore da currentColor)
  CustomCursor.tsx  cursore custom (punto + anello, mix-blend-difference)
  ScrollReveal.tsx  reveal staggered globale via ScrollTrigger.batch
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

## L'intro

`components/CinemaIntro.tsx`. Due pannelli neri separati da un **taglio
obliquo** si aprono orizzontalmente a tre scatti, e nel varco scorrono le
parole (`recupera`, `reintegra`, `naturalmente`), **tagliate dai pannelli**.
All'ultimo scatto i pannelli escono e resta l'hero.

Il taglio obliquo non è decorazione: la pagina di riferimento apre con bande
orizzontali, e replicarle era una copia letterale. La diagonale dà lo stesso
momento con una geometria propria, e introduce l'obliquità che poi torna nei
divisori a zig-zag.

Cose da sapere se ci metti mano:

- `APERTURE = [0.24, 0.48, 0.72]` è l'ampiezza del varco in frazioni della
  larghezza di viewport. Il primo valore mostra un frammento di parola,
  l'ultimo quasi tutta: è la progressione che rende leggibile il gesto;
- `SLANT` è l'inclinazione del taglio. È in percentuale dentro un
  `clip-path`, quindi l'inclinazione visiva cambia con le proporzioni dello
  schermo: il filetto lime che segue il taglio ricava il proprio angolo da
  `window.innerWidth / innerHeight`, e va ricalcolato se tocchi SLANT;
- i pannelli si muovono con `x` in pixel, mai con `width`: la seconda farebbe
  un layout per frame su due elementi a tutto schermo;
- il filetto lime sta FUORI dai pannelli: come loro figlio verrebbe tagliato
  dal `clip-path` insieme al resto;
- il fondo dell'overlay è lo stesso `paper` dell'hero, così l'apertura
  finale non produce nessun lampo di colore;
- l'hero **aspetta** l'intro tramite la promessa `introDone` di
  `lib/intro.ts`: senza, la sua entrata si consumerebbe dietro al nero;
- click o rotella saltano l'intro accelerando la timeline (`timeScale(7)`)
  invece di saltare a `progress(1)`, così l'uscita resta un movimento e le
  callback di chiusura girano nell'ordine giusto;
- **il cursore custom non esiste finché l'intro non ha finito**: durante
  l'apertura il puntatore serve solo a saltare, e un anello che insegue sopra
  i pannelli distrae dal momento. `CustomCursor` aspetta `introDone`;
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
# 1. il sorgente contiene davvero un giro completo?
node scripts/verifica-rotazione.mjs assets/rotazione-prodotto.mp4

# 2. alza il frame rate con interpolazione a compensazione di moto
ffmpeg -i assets/rotazione-prodotto.mp4 \
  -vf "minterpolate=fps=72:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" \
  -c:v libx264 -crf 16 assets/rotazione-prodotto-interp.mp4

# 3. riverifica: l'interpolazione non deve aver rotto il movimento
node scripts/verifica-rotazione.mjs assets/rotazione-prodotto-interp.mp4

# 4. estrai campionando a cambiamento visivo costante, schiacciando il
#    fondo dello studio al nero della sezione
LIVELLI=0.30:0.92 node scripts/frames-from-video.mjs \
  assets/rotazione-prodotto-interp.mp4 180 1000 440:834:336:0
```

### Il primo passo non è opzionale

`scripts/verifica-rotazione.mjs` conta i passaggi di taglio misurando la
larghezza della sagoma fotogramma per fotogramma. Un giro completo ne ha
**esattamente due**, e tre facce larghe. Il primo video generato ne aveva
**tre e quattro**: la bustina arrivava a 270° e tornava indietro, quindi i
fotogrammi fra 180° e 360° non esistevano proprio. Nessun ricampionamento può
inventarli, e il difetto si vedeva solo scorrendo la pagina.

I modelli video, a cui si chiede «una rotazione completa», tendono a girare
oltre il mezzo giro e poi invertire. Il prompt che ha funzionato vieta
l'inversione in modo esplicito e impone il conteggio: *"turning in ONE
direction only, it must NEVER reverse, the pack passes edge-on EXACTLY
TWICE"*.

### I livelli

`LIVELLI=nero:bianco` schiaccia il fondo dello studio al nero della sezione.
Il valore va scelto misurando: sopra il punto più chiaro del **fondo**, sotto
il punto più scuro del **prodotto**. Su questo sorgente il fondo arrivava a
80/255 e il prodotto partiva da 136/255, quindi 0.30 (≈76) separa i due senza
spegnere il prodotto.

Lo script calcola l'fps che distribuisce esattamente 180 fotogrammi sulla
durata del video: estrarne "a caso" darebbe una rotazione che accelera e
rallenta lungo lo scroll. Scrive `public/sequence/frame-001.jpg` …

### Perché due passaggi e non un semplice `fps=`

**Il numero di fotogrammi è solo metà del problema.** La prima misura da
guardare sono i **pixel di scroll per fotogramma**: distanza di pin diviso
numero di fotogrammi. Con 60 immagini su `+=220%` di viewport si cambiava
immagine ogni 33 px, sopra la soglia oltre cui si vedono gli scatti; con 180
si sta a 11 px, dentro la finestra 5–15 px in cui il movimento si legge
continuo.

**La seconda è l'uniformità del sorgente**, ed è quella che ci ha fregato. Un
video generato dall'IA non ruota a velocità costante: il nostro restava fermo
per 26 fotogrammi su 193 e poi scattava, con picchi di 8 volte la media.
Campionandolo a intervalli di tempo uguali quell'irregolarità finisce dritta
nella sequenza, e nessun aumento del numero di fotogrammi la corregge.

La misura di controllo è la **deviazione standard della differenza fra
fotogrammi consecutivi**, in percentuale sulla media. Sotto il 40% la
rotazione si legge continua. Il percorso su questo progetto:

| | dev. std | fermi | scatti |
|---|---|---|---|
| campionamento a tempo, sorgente grezzo | 86% | 19 | 12 |
| riequalizzato, sorgente grezzo | 70% | 13 | 10 |
| riequalizzato, sorgente interpolato, smorzamento 0.5 | 45% | 3 | 9 |
| **riequalizzato, sorgente interpolato, smorzamento 0.8** | **34%** | 4 | **2** |

L'interpolazione serve perché la riequalizzazione non inventa fotogrammi: se
il sorgente ne ha pochi dove il movimento è veloce, quelli scelti si ripetono.
Da 193 a 574 fotogrammi i ripetuti sono passati da 29 a 3.

Per rimisurare dopo un cambio, il metodo è nel commento in testa allo script:
si decodificano i fotogrammi in grigio piccolo e si confrontano a coppie.

**Attenzione all'interpolazione**: `minterpolate` deforma dove la sagoma
cambia più in fretta. Sul nostro turntable il punto critico è il passaggio di
taglio, intorno ai 2 e ai 6 secondi — va sempre ispezionato prima di
estrarre.

Se cambi numero di frame o formato, aggiorna `FRAME_COUNT` e `FRAME_EXT` in
`components/ProductSequence.tsx`. Nient'altro: caricamento pigro, fit
`contain`, gestione del DPI e scrub restano identici.

**Caricamento.** Il componente carica a passate successive — prima un
fotogramma ogni sei, poi ogni tre, poi tutti — e `draw()` ripiega sul
fotogramma caricato più vicino a quello richiesto. Senza il ripiego, durante
la prima passata il canvas resterebbe fermo sull'ultima immagine disegnata
mentre l'utente scorre: meglio un fotogramma leggermente sbagliato che uno
immobile.

**Riferimento**: la pagina di riferimento usa la stessa tecnica — due canvas e
226 fotogrammi WebP da 28,5 KB, 6,3 MB in totale. Il loro vantaggio non è il
numero ma il sorgente, che è un render a velocità angolare costante.

**Su mobile** si usa un fotogramma ogni tre (`MOBILE_STEP`): lì il prodotto è
disegnato a circa 227 px di larghezza, e tenere 180 immagini decodificate per
quella dimensione è spreco puro. Verificato: 60 richieste e 1,1 MB su 390 px
di viewport, 180 e 3,3 MB su 1440 px. Stessi file, nessun asset aggiuntivo.

`scripts/generate-frames.mjs` resta come fallback: rigenera i placeholder
geometrici numerati se ti serve lavorare senza gli asset veri.

---

## Cursore custom

`components/CustomCursor.tsx`. Un punto che segue il mouse quasi senza
ritardo e un anello che lo insegue con inerzia: è lo scarto fra i due a dare
la sensazione di peso. Sopra `a`, `button`, `[role="button"]` e
`[data-cursor]` l'anello si allarga e il punto sparisce.

- `mix-blend-difference`, come header e barra di progresso: si inverte da
  solo su chiaro e su scuro, senza logica JS che tracci il fondo;
- `gsap.quickTo` e non `gsap.to` dentro `pointermove`: quickTo riusa UN
  tween e ne aggiorna il valore, invece di allocarne decine al secondo;
- delegazione degli eventi su `document`: un listener solo, e funziona anche
  sugli elementi che compaiono dopo (i callout della sequenza prodotto);
- in `pointerout` si controlla `relatedTarget`: senza, il cursore sfarfalla
  passando sopra il testo *dentro* un link;
- non viene montato affatto su touch (`pointer: coarse`) né con
  `prefers-reduced-motion`. La condizione è letta con `useSyncExternalStore`,
  che dà lo snapshot server senza mismatch di idratazione e reagisce dal vivo
  se colleghi un mouse o cambi l'impostazione di sistema;
- il cursore di sistema è nascosto da una regola CSS condizionata alla classe
  `.cursore-custom`, montata dal componente: senza JavaScript il puntatore
  nativo resta.

## Reveal staggered

`components/ScrollReveal.tsx`. Anima ogni elemento marcato `data-reveal`
quando entra nel viewport, scaglionando quelli che entrano insieme.

Usa `ScrollTrigger.batch`, che raggruppa gli elementi entranti nella stessa
finestra temporale e li anima con un unico stagger. Con uno ScrollTrigger per
elemento si otterrebbero decine di trigger indipendenti, ognuno che parte per
conto suo: niente stagger e molto più lavoro a ogni refresh.

Attenzione al rapporto con la regola "un solo momento animato forte per
sezione": questo **non** è quel momento. È un movimento di fondo volutamente
corto (18 px, 0.6 s) riservato ai contenuti secondari — label, paragrafi,
righe di dati. Headline e griglia ingredienti mantengono le loro animazioni
dedicate, e non vanno marcate `data-reveal`.

---

## La sezione gamma (scorrimento orizzontale)

`components/Range.tsx`. La sezione si pinna e il binario trasla lateralmente
mentre si scorre in basso. Cose da non rompere:

- **vale solo da 768px in su.** Su touch uno scrub orizzontale confligge col
  gesto di scroll nativo e la pagina diventa difficile da governare: lì le
  slide si impilano. Il ramo è gestito con un `matchMedia` annidato dentro
  `useScene`, così funziona anche ridimensionando la finestra;
- **la corsa viene da `scrollWidth`**, non scritta a mano, con
  `invalidateOnRefresh`: altrimenti su proporzioni diverse l'ultima slide
  resta tagliata;
- **la timeline dura 11 unità**: 1 di attesa in cui il binario sta fermo
  mentre la tenda si apre, 10 di corsa. Senza l'attesa la prima slide non si
  vede mai ferma e scoperta;
- **le finestre finiscono di aprirsi quando la loro slide arriva al centro.**
  Con n slide larghe una viewport il binario percorre n−1 viewport, quindi la
  slide i è centrata a `(i / (n−1)) * 10`. Dividendo la timeline in parti
  uguali — com'era in prima stesura — la finestra della seconda slide era
  aperta solo al 37% nel momento in cui la leggevi.

Gli asset delle tre confezioni stanno in `public/gamma/`, scontornati e
ritagliati al soggetto con `scripts/ritaglia-scontorno.mjs`. Il `colore` di
ogni variante è campionato dal corpo della confezione; `chiaro` è la versione
schiarita, necessaria perché la tinta piena su fondo nero non ha contrasto
sufficiente per il testo.

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

**Le card che si girano sono due famiglie.** Ingredienti (fronte fotografico,
retro con estrazione e funzione) e atleti (fronte ritratto, retro con la
testimonianza). Condividono le classi `.scheda` in `globals.css`, quindi
ereditano lo stesso comportamento con `prefers-reduced-motion`: se ne tocchi
una, controlla l'altra.

Sugli atleti gira **solo la fotografia**: nome e disciplina restano fermi
sotto, così mentre leggi il commento sai di chi è.

**Le card ingrediente si girano.** Fronte fotografico, retro con estrazione
in natura e funzione nella formula. Tre cose da non rompere:

- la card **è** un `<button>` con `aria-expanded`, quindi si gira anche da
  tastiera. La faccia nascosta è marcata `inert`: senza, uno screen reader
  leggerebbe il testo del retro mentre è voltato dall'altra parte;
- la `perspective` sta sul contenitore, non sull'elemento che ruota.
  Applicata al ruotante darebbe una proiezione piatta, senza scorcio;
- con `prefers-reduced-motion` la rotazione è disattivata, e serve un
  meccanismo alternativo: con `backface-visibility: hidden` e la rotazione
  ferma il retro non comparirebbe mai. Le due facce si scambiano con
  `opacity`/`visibility`. Verificato: `transform: none` sul corpo e retro
  comunque visibile.

**I divisori sono a zig-zag, non righe dritte.** `components/ZigZag.tsx` usa
un `<pattern>` SVG in coordinate utente, quindi si ripete da solo a qualsiasi
larghezza e resta nitido a ogni densità. L'id del pattern viene da `useId`:
sulla pagina ce ne sono sette, e con un id fisso punterebbero tutti al primo.
Il colore arriva da `currentColor`, così lo stesso componente serve sezioni
chiare e scure.

**Niente scroll che non produce nulla.** L'hero era alto 155svh con il
contenuto `sticky`: quei 55svh in più esistevano solo per dare corsa al reveal
di "davvero" legato allo scroll. Quando la riga è passata a scoprirsi al
caricamento, la corsa è rimasta lì senza scopo — mezza viewport in cui la
headline non si muoveva di un pixel. Se togli un'animazione legata allo
scroll, togli anche l'altezza che le serviva: si misura piazzando un elemento
e leggendo il suo `getBoundingClientRect().top` a scroll crescenti, e deve
cambiare fin dal primo scatto.

**Non si clona la reference, si clonano i meccanismi.** Della pagina di
riferimento si riprende *come si comporta* — cosa è pinnato, cosa è in scrub,
come il testo si rivela, il ritmo delle sezioni. Non si riprendono le sue
forme riconoscibili: il fondale della sezione filosofia era una copia della
capsula di sofi ed è stato sostituito con un reticolo di righe che si apre,
che riprende invece le bande orizzontali dell'intro — il motivo proprio di
questo sito.

**Il lime va solo su forme piene, sulle sezioni chiare.** Su `#F2F1EC` il
lime come colore di testo ha un contrasto pessimo: sulle sezioni chiare entra
come punto, filetto o terminale di barra, mai come parola. Sulle sezioni
scure funziona anche come testo, e lì marca le etichette di sezione, le
parole-effetto e i dati delle card. L'unica eccezione su fondo chiaro è il
numero dei risultati, che alla sua scala regge.

**Il lime (`--color-volt`) resta un accento, non un colore di sistema.** Tre soli usi: il pallino
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
