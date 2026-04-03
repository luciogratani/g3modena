# @g3/content-contract

Contratto condiviso per le section key CMS usate da `admin` e `web`.

Obiettivo: evitare mismatch tra chiavi salvate da admin e chiavi lette dal parser web.

## Collegamenti utili

- Monorepo overview: `../../README.md`
- Web design docs: `../../web/README.md`
- Web DB/CMS integration: `../../web/DB_CMS_INTEGRATION.md`
- Admin development notes: `../../admin/DEVELOPMENT_NOTES.md`

## Export principali

- `CMS_SECTION`
  - chiavi canoniche sezione:
  - `hero`, `about`, `clients`, `why_g3`, `footer`, `sections`
- `CMS_SECTION_KEYS`
  - lista completa chiavi canoniche
- `normalizeCmsSectionKey(raw)`
  - normalizza una chiave grezza verso la chiave canonica (se supportata)
- `CMS_SECTION_TOGGLE`
  - chiavi toggle sezione:
  - `contactForm`, `careersForm`
- `CMS_SECTION_TOGGLE_ALIASES`
  - alias supportati per backward compatibility:
  - `contactForm | contact_form`
  - `careersForm | careers_form`

## Uso in Admin

Usare sempre le costanti del contratto quando si definiscono tab/sezioni CMS.

```ts
import { CMS_SECTION } from "@g3/content-contract"

const sections = [
  { id: CMS_SECTION.hero, label: "Hero" },
  { id: CMS_SECTION.about, label: "Chi siamo" },
  { id: CMS_SECTION.clients, label: "Clienti" },
  { id: CMS_SECTION.whyG3, label: "Perché G3" },
  { id: CMS_SECTION.footer, label: "Footer" },
  { id: CMS_SECTION.sections, label: "Sezioni" },
]
```

## Uso in Web Adapter

Normalizzare la chiave sezione in ingresso prima del mapping.

```ts
import { normalizeCmsSectionKey, CMS_SECTION } from "@g3/content-contract"

const normalizedKey = normalizeCmsSectionKey(row.sectionKey)
if (normalizedKey) sectionMap.set(normalizedKey, row.content)

const whyG3 = sectionMap.get(CMS_SECTION.whyG3)
```

## Regola operativa

Quando aggiungi una nuova sezione CMS:

1. aggiorna prima questo package;
2. aggiorna admin (editor/tabs/forms);
3. aggiorna web adapter (mapping/normalizzazione/fallback);
4. verifica build `admin` e `web`.
