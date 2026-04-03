# G3 Modena – Monorepo

Repository monorepo con due applicazioni:

- **web** – Sito pubblico (www.domain.com)
- **admin** – Backoffice (admin.domain.com)

## Documentazione

- [Web design e scelte UX](web/README.md)
- [Integrazione DB/CMS Web](web/DB_CMS_INTEGRATION.md)
- [Contratto condiviso section key CMS](packages/content-contract/README.md)
- [Note sviluppo Admin](admin/DEVELOPMENT_NOTES.md)

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
