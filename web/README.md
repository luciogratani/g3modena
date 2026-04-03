# G3 Modena — Scelte di design

Documentazione delle scelte di design del sito **G3 Waiters & Experience**: direzione di sala e servizio premium per catering di alto livello.

Per note operative su integrazione database/CMS: `DB_CMS_INTEGRATION.md`.

## Collegamenti utili

- Monorepo overview: `../README.md`
- Integrazione DB/CMS: `DB_CMS_INTEGRATION.md`
- Contratto condiviso section key CMS: `../packages/content-contract/README.md`
- Note sviluppo admin: `../admin/DEVELOPMENT_NOTES.md`

---

## Nota tecnica (stato attuale)

- **Frontend**: SPA in **Vite + React** (nessun SSR, nessun routing applicativo, navigazione via anchor link).
- **Repository**: monorepo `pnpm` con due app (`web` e `admin`).
- **Form**: endpoint esterni configurabili via variabili ambiente:
  - `VITE_CONTACT_ENDPOINT`
  - `VITE_CAREER_ENDPOINT`
- **Comandi principali (da root repo)**:
  - `pnpm dev:web`
  - `pnpm build:web`
- **Comandi principali (da cartella `web`)**:
  - `pnpm dev`
  - `pnpm build`
  - `pnpm preview`

---

## Posizionamento e tono

- **Brand**: G3 — “Waiters & Experience” / “Servizio & Esperienza”. Il sito comunica eleganza, professionalità e attenzione al dettaglio, coerente con eventi di alto livello.
- **Lingua**: tutto il contenuto è in italiano; il sito è pensato per clienti e candidati in Italia (Modena, Italia centrale e settentrionale, Sardegna).
- **Messaggio principale**: “Il nostro team. Il vostro stile.” in hero, con sottotitolo che chiarisce direzione di sala e servizio premium.

---

## Palette e colori

- **Sfondo principale**: toni caldi neutri (bianco sporco / avorio) per dare calore senza essere freddi.
- **Testo**: nero molto scuro per massima leggibilità e contrasto.
- **Accento**: **oro** (`--gold`) usato per:
  - linee decorative (hero, titoli di sezione, divider tra sezioni),
  - hover su link e stati di focus,
  - label delle sezioni (“Chi siamo”, “Contatti”, ecc.),
  - elementi del loader e del cursore custom.
- **Footer**: sfondo scuro (stesso valore del foreground) per chiudere visivamente la pagina e dare risalto a link e contatti in chiaro.
- **Sezioni**: alternanza tra `background`, `card` (leggermente più grigio) e `foreground` (scuro in “Perché G3”) per ritmo visivo e separazione dei blocchi senza bordi pesanti.
- **Theme color**: `#1a1a1a` per barra del browser / PWA, in linea con l’identità scura.

---

## Tipografia

- **Sans**: usata per corpo testo, form, link, label e UI. Scelta per leggibilità e aspetto moderno ma non freddo.
- **Serif**: usata per il brand (G3), titoli di sezione e nomi clienti. Scelta per dare carattere “premium” e riconoscibilità.
- **Gerarchia**:
  - Titoli: serif, peso light, tracking ampio, spesso `text-balance` per bilanciare le righe.
  - Label di sezione: maiuscolo, tracking molto ampio (`0.2em`–`0.3em`), dimensione piccola (es. `11px`).
  - Corpo: dimensioni contenute, interlinea rilassata, colore `muted-foreground` dove serve gerarchia secondaria.
- **Coerenza**: stessi pattern (label + titolo, eventuale paragrafo) in tutte le sezioni tramite il componente HeadlineReveal.

---

## Layout e struttura della pagina

- **Flusso**: singola pagina con scroll; sezioni in ordine: Hero → Chi siamo → Clienti → Perché G3 → Contatti → Lavora con noi → Footer.
- **Larghezza contenuti**: `max-w-7xl` per le sezioni principali; `max-w-3xl` per form contatti e carriere per mantenere il form leggibile e centrato.
- **Spaziatura verticale**: padding generoso (`py-24` / `lg:py-32`) per respiro e ritmo; tra una sezione e l’altra sono inseriti **divider** (linee orizzontali oro) con larghezze variabili (60–120px) per non appiattire il layout.
- **Anchor**: le sezioni hanno `id` per i link di navigazione; è previsto `scroll-margin-top` per compensare la navbar fissa e evitare che il titolo resti sotto la barra.

---

## Hero

- **Full viewport**: altezza minima a tutta schermata per impatto immediato.
- **Sfondo**: immagine/video a tutta larghezza con **parallax** leggero (spostamento verso l’alto allo scroll) per dare profondità senza distrarre.
- **Overlay**: scuro semitrasparente sul media per garantire leggibilità del testo bianco e coerenza con la palette.
- **Contenuto**: linea decorativa oro, titolo principale, sottotitolo, due CTA (“Richiedi un incontro” → #contact, “Lavora con noi” → #careers).
- **CTA**: primario oro su testo bianco; secondario outline chiaro; entrambi con stile “luxury” (tracking, maiuscolo, hover con micro-interazione).
- **Scroll indicator**: testo “Scorri” + linea verticale in basso, con animazione leggera, per invitare allo scroll; visivamente discreto.

---

## Navigazione

- **Posizione**: navbar fissa in alto, sempre accessibile.
- **Stati**:
  - Sopra la fold: sfondo trasparente, testo chiaro (su hero scuro).
  - Dopo lo scroll: sfondo semiopaco con blur e bordo sottile, testo scuro per continuità con il resto della pagina.
- **Brand**: logo “G3” (mark) in navbar; stessa identita visiva usata nel footer in versione estesa.
- **Link**: stile `link-luxury` (hover con sottolineatura oro), maiuscolo e tracking ampio; su mobile il menu si apre a tendina sotto la barra con gli stessi link.
- **Animazione**: ingresso della navbar con slide dall’alto e easing “luxury” per un effetto di apertura ordinato.

---

## Sezioni e titoli

- **Pattern HeadlineReveal**: ogni sezione ha (opzionale) una **label** in oro (maiuscolo, tracking largo), un **titolo** (serif, light) e a volte un **paragrafo** introduttivo. Le animazioni sono “reveal” (opacità + leggero movimento) per dare ritmo allo scroll.
- **Divider tra sezioni**: linee orizzontali oro, larghezza massima variabile, centrate; animazione “scale from left” quando entrano in viewport per coerenza con le altre reveal.
- **About**: due colonne (testo + immagine); testo con linea oro sotto il titolo e paragrafi in muted; immagine in aspect ratio curato (es. 4/5 su desktop).
- **Clienti**: griglia di card con nome (serif) e luogo (label piccolo maiuscolo); bordo sottile e hover che schiarisce leggermente la card per feedback visivo.
- **Perché G3**: sfondo scuro, icone oro, titoli serif e descrizioni in grigio chiaro; griglia a 4 colonne su large per leggibilità.
- **Footer**: sfondo scuro, link e contatti in stile “link-luxury” con hover oro; blocco legale in basso con linea di separazione e testo piccolo; transizione colore (da card a foreground) in entrata per integrazione con lo scroll.

---

## Form (Contatti e Lavora con noi)

- **Stile campi**: nessun box pesante; **bordo solo in basso** (underline) e sfondo trasparente per un look pulito e “premium”.
- **Floating labels**: le label sono sopra il campo; quando il campo è vuoto e non in focus restano in posizione “placeholder”, quando in focus o con valore salgono e si riducono in maiuscolo con tracking; colore focus in oro. Transizioni fluide con la stessa easing “luxury”.
- **Focus**: bordo oro e leggera shadow oro per evidenziare il campo attivo senza essere invasivi.
- **Errori**: messaggi sotto il campo, colore destructive, con transizione di opacità/translate per non essere bruschi.
- **Pulsante invio**: stile primario scuro (foreground) con testo chiaro, stesso pattern “button-luxury” (hover con leggero sollevamento e brightness).
- **Feedback**: toast in basso al centro, stile scuro con bordo oro per coerenza con il tema; messaggi di successo/errore chiari e brevi.

---

## Animazioni e motion

- **Easing condivisa**: curva “luxury” (`cubic-bezier(0.22, 1, 0.36, 1)`) usata per reveal, hover e transizioni, per un feeling coerente e non “tecnico”.
- **Reveal on scroll**: le sezioni e i blocchi entrano in viewport con fade-in e leggero spostamento (Y o X); spesso con **stagger** sui figli (es. card clienti, punti “Perché G3”) per un effetto ordinato.
- **Once only**: le animazioni di reveal partono una sola volta (viewport `once: true`) per non distrarre in caso di scroll ripetuto.
- **Riduzione motion**: rispetto di `prefers-reduced-motion` con transizioni e animazioni ridotte o disattivate (inclusi link, pulsanti, loader e cursore custom), per accessibilità.

---

## Micro-interazioni e dettagli

- **Link**: classe `link-luxury`: sottolineatura oro che appare in hover/focus con animazione `scaleX` da sinistra; transizione colore verso oro.
- **Pulsanti**: classe `button-luxury`: hover con leggero `translateY(-1px)` e aumento di brightness; stato active riporta a posizione normale; stesse durate e easing.
- **Custom cursor** (solo desktop): cursore sostituito da punto oro + anello che segue con leggero ritardo; su hover su elementi interattivi l’anello si ingrandisce e si evidenzia; su touch/tablet e in preferenza “reduced motion” il cursore resta quello di sistema. Scelta per rafforzare la sensazione di sito curato senza essere essenziale.
- **Loader iniziale**: non presente nello stato attuale della web app.

---

## Accessibilità e usabilità

- **Scroll**: smooth scroll per navigazione tra sezioni; offset sugli anchor per la navbar fissa.
- **Contrasto**: testo scuro su sfondo chiaro e testo chiaro su sfondo scuro (footer, hero, Perché G3); oro usato per accenti e stati focus, non come unico indicatore.
- **Focus**: stati focus visibili (bordo/shadow oro, sottolineatura link); form con `aria-invalid` e label associate.
- **Motion**: riduzione o assenza di animazioni per chi preferisce `prefers-reduced-motion`.
- **Lingua**: `lang="it"` sul documento; contenuti e messaggi (toast, errori form) in italiano.

---

## Riepilogo intenti di design

- **Coerenza**: stessa palette (neutri caldi + oro), stessi font (sans + serif), stesso pattern di titoli (HeadlineReveal) e stessi micro-interactions (link, button, focus) in tutta la pagina.
- **Eleganza**: pochi elementi decorativi (linee oro, spacing generoso), niente effetti pesanti; animazioni misurate e uscita rispettosa della riduzione motion.
- **Chiarezza**: gerarchia tipografica netta, sezioni ben separate, CTA evidenti in hero e form semplici da scansionare.
- **Identità**: brand G3 e “Servizio & Esperienza” sempre riconoscibili; oro come filo visivo che lega hero, navigazione, sezioni e footer.

Questo documento descrive principalmente le **scelte di design** (colori, tipografia, layout, componenti visivi, animazioni, accessibilità), con una breve nota tecnica iniziale sul setup frontend corrente.
