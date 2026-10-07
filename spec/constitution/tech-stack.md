# Tech stack

> Tecnologías y convenciones del monorepo.

## Apps

| App         | Stack                                 | Puerto |
| ----------- | ------------------------------------- | ------ |
| `api`       | NestJS 11, Express, Drizzle           | 3000   |
| `web`       | TanStack Start, React 19, Tailwind v4 | 3001   |
| `dashboard` | TanStack Start, React 19, Tailwind v4 | 3002   |

## Packages compartidos

| Package            | Responsabilidad                                             |
| ------------------ | ----------------------------------------------------------- |
| `@repo/db`         | Schema Drizzle, repositories, migraciones (Neon PostgreSQL) |
| `@repo/types`      | Tipos de dominio e interfaces API                           |
| `@repo/validators` | Schemas Zod (v4)                                            |
| `@repo/ui`         | Componentes ShadCN compartidos                              |

## Convenciones obligatorias

- **Validación:** Zod en `@repo/validators`; pipes `ZodValidationPipe` en API.
- **DB:** queries solo en `packages/db/src/repositories/`; servicios NestJS no importan `db` directo.
- **Constantes:** maps `SCREAMING_SNAKE_CASE` con `as const`; sin magic strings.
- **Lint / format:** oxlint + oxfmt; pre-commit en archivos staged.
- **Rutas TanStack:** literal en `createFileRoute`; constantes solo para navegación.
- **UI:** copy en español; identificadores en inglés.

## Almacenamiento de archivos

- `files-sdk` + Cloudflare R2 (`apps/api/src/modules/files/`).
- Variables: ver `packages/validators/src/upload.ts` y `apps/api/.env`.

## Correo (transaccional)

- Puerto `MailSender` + adaptador Amazon SES v2 (`apps/api/src/modules/mail/`, `SesMailSender`).
- Templates: React Email; copy en namespace i18n `emails`.
- Preview local: `pnpm --filter @repo/api mail:preview` (puerto 3333).
- Variables: `AWS_REGION` (usar `sa-east-1`), `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` opcionales y pareados (ambos vacíos = cadena de credenciales por defecto), `MAIL_DOMAIN`, `MAIL_REPLY_TO` (requerido solo para correos `SUPPORT`), `MAIL_SMOKE_TO`. `MAIL_DOMAIN` deriva `no-reply@<domain>` para correos automatizados y `support@<domain>` para soporte; schema compartido en `@repo/validators` y composición de entorno en `apps/api/src/config/env.schema.ts`.
- Humo: `pnpm --filter @repo/api mail:smoke` (solo development).
- Checklist de identidad SES para operadores: `deploy/env/README.md`.

## Comandos habituales

```bash
pnpm dev              # web + dashboard + api
pnpm dev:api          # solo API
pnpm type-check
pnpm lint && pnpm format:check
```

## Referencias

- [STYLEGUIDE.md](../../STYLEGUIDE.md)
- [AGENTS.md](../../AGENTS.md)
