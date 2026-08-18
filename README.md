# Handled

Clientflow for independent businesses — clients, projects, invoices and payments in one modular
monolith.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma 7 · Better Auth ·
Zod · Argon2id · React Hook Form · Vitest · Playwright · ESLint · Prettier · pnpm.

No Redux, Redis, Docker, GraphQL, separate backend or microservices. State is server state; there is
no client store because nothing yet needs one.

## Getting started

You need a PostgreSQL database. Point `DATABASE_URL` at it:

```bash
cp .env.example .env      # .env is already generated with a random auth secret
pnpm install
pnpm db:migrate           # creates the schema
pnpm db:seed              # optional demo studio
pnpm dev
```

The seed signs you in as `demo@handled.test` / `demo-password-123`.

## Layout

```
prisma/schema.prisma      one schema, module-per-domain
src/lib/                  prisma, auth, password, money, validation, api helpers
src/app/(auth)/           sign-in, sign-up
src/app/(app)/            dashboard, projects, clients, invoices, tasks
src/app/api/              route handlers
tests/unit/               vitest
tests/e2e/                playwright
```

## Conventions worth knowing

**Money is integer minor units.** `valueCents`, `unitPriceCents`, `amountCents` — floats never touch
a total. `src/lib/money.ts` owns the arithmetic and formatting.

**Invoice status is derived, not set.** Only `DRAFT`, `SENT` and `VOID` are ever written by hand;
`PARTIALLY_PAID` and `PAID` fall out of the recorded payments via `deriveStatus`, which runs inside
the same transaction as the payment.

**Every query is workspace-scoped.** Writes go through `updateMany`/`deleteMany` filtered by
`workspaceId` so an id belonging to another tenant misses rather than leaks.

**Passwords are Argon2id** at OWASP's 19 MiB / t=2 / p=1, wired into Better Auth through
`src/lib/password.ts`.

**Route handlers share one error door.** `handler()` in `src/lib/api.ts` maps Zod issues to 422 with
field errors, `HttpError` to its own status, and anything else to a logged 500.

## Scripts

| Command            | Does                             |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Dev server                       |
| `pnpm build`       | Production build                 |
| `pnpm typecheck`   | `tsc --noEmit`                   |
| `pnpm lint`        | ESLint                           |
| `pnpm format`      | Prettier                         |
| `pnpm test`        | Vitest units                     |
| `pnpm test:e2e`    | Playwright (needs a database)    |
| `pnpm db:migrate`  | Apply migrations                 |
| `pnpm db:seed`     | Demo data                        |
| `pnpm db:studio`   | Prisma Studio                    |

## Not built yet

Contracts and e-signature, proposals, scheduling, client-facing portal, email delivery, real payment
processing (payments are recorded manually), team invitations, and file uploads.
