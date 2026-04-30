# G3 Modena – Monorepo

Repository monorepo con due applicazioni:

- **web** – Sito pubblico (www.domain.com)
- **admin** – Backoffice (admin.domain.com)

## Documentazione

Indice centralizzato: **[docs/README.md](docs/README.md)**  
Roadmap con checkbox (avanzamento implementazione): **[docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md)**

- [Design e scelte UX — sito web](docs/WEB_DESIGN.md)
- [Data layer & Supabase — web + pianificazione admin](docs/DB_CMS_INTEGRATION.md)
- [Concept pre-wiring: campagne, analytics, città, RLS](docs/PRE_WIRING_CONCEPT.md)
- [Prompt agent — audit ERD / coerenza schema](docs/AGENT_PROMPT_ERD_AUDIT.md)
- [Note sviluppo Admin](docs/DEVELOPMENT_NOTES.md)
- [Contratto condiviso section key CMS](packages/content-contract/README.md)

## Setup

```bash
pnpm install
```

## Script

| Comando       | Descrizione              |
|---------------|--------------------------|
| `pnpm dev:web`    | Avvia il sito in dev      |
| `pnpm dev:admin`  | Avvia l’admin in dev      |
| `pnpm build:web`   | Build produzione web      |
| `pnpm build:admin` | Build produzione admin    |
| `pnpm build`       | Build di entrambe le app  |

## Admin – Supabase

L’app admin usa Supabase. Copia `admin/.env.example` in `admin/.env` e imposta:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Client in `admin/src/lib/supabase.ts`.

## Deploy Vercel (2 progetti)

Repo GitHub: `https://github.com/luciogratani/g3modena`

- **web**
  - Build Command: `pnpm --filter web build`
  - Output Directory: `web/dist`
- **admin**
  - Build Command: `pnpm --filter admin build`
  - Output Directory: `admin/dist`

Entrambi i progetti usano `Install Command: pnpm install --frozen-lockfile`.
