# Backpack Inventory

A web-based inventory management system for tracking backpack and fire suppression equipment across offices, teams, and regions. Built with SvelteKit, Drizzle ORM, and SQLite (local) / PostgreSQL (production).

## Features

- **Inventory transactions** — receive, remove, return, and redistribute items between offices
- **QR code scanning** — scan office+product QR codes to jump directly to a transaction form; no manual office selection
- **Inventory counts** — submit physical counts; supervisors reconcile discrepancies (accept or reject)
- **Burn-rate forecast** — dashboard badges show estimated days of stock remaining based on recent removal history
- **Audit log** — full timestamped history of every transaction and count
- **Reports** — transaction history and staff usage summaries, filterable by date range and office
- **Admin panel** — manage users, product catalogue, and offices; scoped by region or team
- **Role-based access control** — six roles with fine-grained permissions and location scopes (team / region / all)

## Roles

| Role | Scope | Key permissions |
|---|---|---|
| `ci_specialist` | team | add, remove, inventory count |
| `supervisor` | team | all of the above + reconcile, audit log, reports, manage users |
| `assistant_supervisor` | team | same as supervisor |
| `aaa` | region | add, remove, audit log, reports, manage users |
| `manager` | region | same as supervisor |
| `director_3p` | all | view reports only |

## Tech Stack

- **Framework:** SvelteKit 2 with Svelte 5
- **Styling:** Tailwind CSS v4
- **ORM:** Drizzle ORM
- **Database:** SQLite (local dev via better-sqlite3) / PostgreSQL (production)
- **Auth:** Auth.js (OIDC — Azure AD, Okta, Keycloak, etc.)
- **Testing:** Vitest (unit), Playwright (E2E)
- **QR codes:** `qrcode` package (server-side generation)

## Developing

### Prerequisites

- Node.js 20+
- npm

### First-time setup

```sh
npm install

# Copy the environment template and fill in your values
cp .env.example .env

# Run migrations and seed the database
npm run db:reset
```

### Environment variables

Key variables in `.env`:

| Variable | Description |
|---|---|
| `DB_DRIVER` | `sqlite` (default) or `postgres` |
| `DATABASE_URL` | `file:./dev.db` for SQLite, or a Postgres connection string |
| `DEV_AUTH_USER_ID` | Set to any string to skip OAuth in local dev (auto-creates a manager user) |
| `AUTH_SECRET` | Secret for signing Auth.js JWTs (`openssl rand -base64 32`) |
| `OIDC_ISSUER` | Your OIDC provider's issuer URL |
| `OIDC_CLIENT_ID` | OIDC client ID |
| `OIDC_CLIENT_SECRET` | OIDC client secret |
| `BURN_RATE_DAYS` | Days of removal history used for burn-rate calculation (default 30) |
| `LOW_INVENTORY_THRESHOLD` | Units at/below which items are flagged low (default 10) |

### Start the dev server

```sh
npm run dev

# or open the app automatically in a browser tab
npm run dev -- --open
```

### Database commands

```sh
npm run db:migrate      # Apply pending SQLite migrations
npm run db:seed         # Seed regions, teams, offices, and products
npm run db:reset        # Drop and recreate the database, then seed
npm run db:studio       # Open Drizzle Studio (visual DB browser)

# PostgreSQL (set DB_DRIVER=postgres first)
npm run db:generate:pg  # Generate PG migrations
npm run db:migrate:pg   # Apply PG migrations
```

## Building

Create a production build:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

The app uses `@sveltejs/adapter-node` and produces a standard Node.js server. Deploy by running the output in `build/` with `node build`.

## Testing

```sh
# Unit tests (Vitest)
npm run test:unit

# E2E tests (Playwright) — requires a running preview server
npm run test:e2e

# Both
npm run test
```

Unit tests use an in-memory SQLite database and do not require a running server. E2E tests seed deterministic test users and use a header-based auth bypass (`x-test-user-id`) so OAuth is not required.

## Project structure

```
src/
├── lib/
│   ├── components/app/     # Shared Svelte components
│   ├── server/
│   │   ├── auth.ts         # Auth.js configuration
│   │   ├── db/
│   │   │   ├── schema/     # Drizzle schema (sqlite.ts + pg.ts)
│   │   │   ├── migrations/ # Generated SQL migrations
│   │   │   ├── seed.ts     # Database seeder
│   │   │   └── test-db.ts  # In-memory test database helpers
│   │   └── services/       # Business logic (inventory, transactions, admin, …)
│   └── types.ts            # Roles, permissions, and shared TypeScript types
├── routes/
│   ├── (app)/              # Authenticated shell
│   │   ├── dashboard/      # Inventory overview with burn-rate badges
│   │   ├── transactions/   # Add / remove / return / redistribute
│   │   ├── scan/           # QR code landing page (UC-8)
│   │   ├── inventory-count/# Submit physical counts (UC-9)
│   │   ├── reconcile/      # Accept or reject counts (UC-10)
│   │   ├── audit-log/      # Full activity log
│   │   ├── reports/        # Transaction history and staff usage reports
│   │   └── admin/          # Users, products, offices, and QR code management
│   ├── api/                # JSON endpoints (offices, products, inventory, …)
│   └── auth/               # Auth.js sign-in/sign-out routes
├── hooks.server.ts         # Auth resolution, RBAC route guards
└── app.html                # HTML shell
```
