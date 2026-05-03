# Mock Dev Data — Design

**Date:** 2026-04-27
**Status:** Approved — pending user review of written spec

## Goal

Provide a reproducible mock dataset that lets a developer exercise every route in the app — including admin, audit log, reports, forecast, reconcile, and scope-filtered views — by switching the active dev user via `DEV_AUTH_USER_ID`.

## Non-goals

- Replacing or modifying the production seed (`src/lib/server/db/seed.ts`).
- Replacing the E2E fixture setup (`e2e/global-setup.ts`).
- Adding a UI for switching dev roles.

## Decisions

| Decision | Choice |
|---|---|
| Workflow | Separate `db:seed:dev` script that layers fixtures on top of the production seed. |
| Users | One fixed-ID user per role (6 total). |
| Volume | Heavy — 180 days of history, ~1500 transactions across ~15 offices. |
| Reproducibility | Deterministic core IDs + seeded RNG (`mulberry32`, constant seed) for bulk generation. |
| Edge cases | Recommended fixture set (pending count, inactive product/office, zero-inventory pair, receipt-attached transaction, "Other" free-text item, redistribute). |

---

## Section 1 — Architecture & workflow

### New artifacts

- `src/lib/server/db/seed-dev.ts` — dev-only seed script. Layers dev fixtures on top of the production seed; never touches reference data.
- `src/lib/server/db/seed-dev.test.ts` — smoke test asserting role coverage, ≥30 days history, no negative inventory, pending count exists, etc.
- `uploads/receipts/dev-sample-receipt.pdf` — a tiny placeholder PDF written by the seed script on each run (no binary checked into the repo).

### New npm scripts

```json
"db:seed:dev":   "npx tsx src/lib/server/db/seed-dev.ts",
"db:reset:dev":  "rm -f dev.db && rm -rf uploads/receipts/dev-* && npm run db:migrate && npm run db:seed && npm run db:seed:dev"
```

`db:reset` and `db:seed` stay unchanged (production-safe).

### Workflow

```sh
npm run db:reset:dev           # full reset with mock data
# edit .env: DEV_AUTH_USER_ID=dev-supervisor (or any other dev-* id)
npm run dev
```

### Idempotency

`seed-dev.ts` deletes any row whose id starts with `dev-` (across `users`, `transactions`, `transaction_line_items`, `inventory_counts`) before inserting, then rebuilds `current_inventory` by replaying the new transactions. Re-running produces identical state. `e2e-*` rows are untouched, so it doesn't conflict with Playwright setup.

### Service-layer reuse

Bulk history goes through `createTransaction()` so business rules (no-negative-inventory, scope checks, confirmation IDs, audit log entries, `current_inventory` upserts) are enforced. Direct DB writes are used for two cases:

1. Inserting the pending `inventory_counts` row — no public service for that exists yet.
2. Flipping `is_active = 0` on the inactive product/office fixtures — `toggleProduct` / `toggleOffice` exist in `src/lib/server/services/admin.ts` but require an authenticated session user; the seed script bypasses them for simplicity.

---

## Section 2 — Data plan

### Users (6 fixed IDs)

All bound to the Island region; team-scoped users sit on `VI Central North` so they share office visibility.

| ID | Role | Team | Region | Visible offices |
|---|---|---|---|---|
| `dev-ci` | ci_specialist | VI Central North | Island | ~6 (Duncan, Nanaimo, Port Alberni, Courtenay/Comox, Campbell River, Port Hardy) |
| `dev-supervisor` | supervisor | VI Central North | Island | same |
| `dev-asst-sup` | assistant_supervisor | VI Central North | Island | same |
| `dev-aaa` | aaa | — | Island | all Island offices |
| `dev-manager` | manager | — | Island | all Island offices |
| `dev-director` | director_3p | — | — | all 53 offices |

Emails: `dev-<role>@local.test`. Names: `Dev <Role>` (e.g. "Dev Supervisor").

### Bulk transaction history

- **Span:** 180 days back to today (covers forecast 30-day window with ~5× headroom).
- **Offices in play:** ~15 — all Island offices + 3-4 selected from each other region (so the director sees activity beyond Island, manager/aaa see meaningful regional rollups).
- **Volume target:** ~1500 transactions, distributed via seeded RNG (`mulberry32` with constant seed `0x5EED_DE7`).
- **Mix per day:** 8-15 transactions, weighted ~45% receive, ~30% remove, ~15% return, ~10% redistribute.
- **Line items:** 1-4 per transaction, quantities 1-50.
- **Recorder:** randomly chosen from the 6 dev users, filtered to those whose scope contains the transaction's office (so `dev-ci` only ever appears on Island team offices, etc.).
- **Negative-inventory guard:** generator skips/regenerates a `remove` or `redistribute` if it would underflow.
- All written via `createTransaction()` so confirmation IDs, audit log entries, and `current_inventory` upserts are produced naturally by the service layer.

### Edge-case fixtures (deterministic, applied after bulk)

1. **Pending inventory count** — fixed id `dev-pending-count`, on a known Island office, with at least one product where `counted_quantity ≠ current_inventory.quantity` so the reconcile screen surfaces a real variance. Bookmarkable URL: `/reconcile/dev-pending-count`.
2. **Inactive product** — flip one seeded product (e.g. `Spoons`) to `is_active = 0` so the products admin page shows it greyed out.
3. **Inactive office** — flip one non-Island office to `is_active = 0`.
4. **Zero-inventory office/product pair** — the bulk generator's per-office product allowlist deliberately excludes one product (e.g. `Vanilla` Ensure) at one Island office, so no `current_inventory` row is ever written for that pair.
5. **Receipt-attached transaction** — one `receive` with `shipping_receipt_path = 'uploads/receipts/dev-sample-receipt.pdf'`; the file is copied/written by the seed script.
6. **"Other" free-text line item** — one transaction with a line item against the `Other Cereal Bar/Snack` product, `otherDescription = 'Custom granola bars (sample)'`.
7. **Redistribute** — at least one redistribute between two Island offices is guaranteed (forced into the bulk gen if RNG didn't already produce one).

---

## Section 3 — Verification & route coverage

### Smoke test (`seed-dev.test.ts`)

Runs against an in-memory SQLite DB (reuses `createTestDb()` from `src/lib/server/db/test-db.ts`). The test re-runs the bulk-history generator with the same seed against the in-memory DB and asserts:

- All 6 dev users exist with correct roles, teams, regions.
- ≥30 days of transactions exist (forecast prerequisite).
- No row in `current_inventory` has a negative quantity.
- A pending row exists in `inventory_counts` with id `dev-pending-count`.
- At least one product has `is_active = 0`; at least one office has `is_active = 0`.
- At least one transaction has a non-null `shipping_receipt_path` and the file exists on disk.
- At least one line item has a non-empty `other_description`.
- At least one `redistribute` transaction exists.
- Per-role office visibility: `getOfficeIdsForUser()` returns exactly 6 offices for `dev-ci`, all Island offices for `dev-aaa`, and all 53 offices for `dev-director`.

### Manual route-coverage matrix

For each app route, this matrix names the dev user that exercises it and what fixture supplies the data.

| Route | User to log in as | Data source |
|---|---|---|
| `/auth/signin` | _logged out_ | n/a |
| `/(app)/dashboard` | any | bulk history + `current_inventory` |
| `/(app)/transactions/add` | `dev-ci` | offices + products in scope |
| `/(app)/transactions/return` | `dev-ci` | same |
| `/(app)/transactions/remove` | `dev-ci` | offices with positive inventory |
| `/(app)/transactions/redistribute` | `dev-supervisor` | ≥2 offices in scope |
| `/(app)/inventory-count` | `dev-supervisor` | bulk + pending count fixture |
| `/(app)/reconcile/dev-pending-count` | `dev-supervisor` | pending count fixture (#1) |
| `/(app)/audit-log` | `dev-supervisor` | bulk history (incl. receipt + redistribute + "Other") |
| `/(app)/reports` | `dev-manager` | bulk history (forecast computes from ≥30 days) |
| `/(app)/admin/users` | `dev-manager` | the 6 dev users |
| `/(app)/admin/products` | `dev-manager` | products incl. inactive (#2) |
| `/(app)/admin/offices` | `dev-manager` | offices incl. inactive (#3) |
| `/(app)/admin/qr-codes` | `dev-manager` | offices + products |
| `/scan/{officeId}/{productId}` | `dev-ci` | any seeded office/product |
| API routes (`/api/*`) | varies | covered by the data above |

### Verification block at end of seed run

`seed-dev.ts` finishes with a self-check that counts users, transactions, inventory counts, and each edge fixture, then prints a summary. If any assertion fails, the script exits non-zero so dev workflows fail loudly:

```
✅ Dev seed complete
   • 6 users (1 per role)
   • 1,512 transactions across 15 offices over 180 days
   • 1 pending count: /reconcile/dev-pending-count
   • Edge fixtures: inactive-product ✓ inactive-office ✓ zero-inv ✓ receipt ✓ other-item ✓ redistribute ✓
```

---

## Open questions / explicit deferrals

None — all design decisions resolved during brainstorming.

## Out of scope (explicitly)

- A dev-only role-switcher UI (option C from the user-switching question — rejected in favor of `.env`-based switching).
- Modifying the production seed.
- Modifying or running alongside `e2e/global-setup.ts` (lives in its own world; uses `e2e-*` prefix vs. our `dev-*` prefix).
- Migrating mock data into PostgreSQL — dev seed is SQLite-only.

