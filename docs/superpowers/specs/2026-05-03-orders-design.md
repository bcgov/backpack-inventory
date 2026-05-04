# Orders — Design

**Date:** 2026-05-03
**Status:** Approved — pending user review of written spec

## Goal

Let supervisors and assistant_supervisors place orders for products at offices in their team scope. Orders are emailed to a per-office recipient list on submission, tracked through a multi-state lifecycle (pending → partial → received, or cancelled), and integrated with the existing receive-transaction flow so order receipts feed inventory and the audit log automatically.

## Non-goals

- Editing the line items on a pending order. (If a mistake is made, cancel and re-create.)
- Multiple drafts / saved-but-not-submitted orders.
- Approval workflow (any supervisor can place any order in their scope; no manager sign-off step).
- Order templates or recurring/scheduled orders.
- SMS or push notifications.
- Replying to order emails (one-way notifications only).
- Per-recipient delivery tracking (we record per-send success/failure in the outbox; we don't track read receipts or bounces).

## Decisions

| Decision | Choice |
|---|---|
| Email transport | Nodemailer + SMTP via env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`). Real send in prod; falls back to a stub in test/CI. |
| Recipient list scope | Per-office. Managed in admin panel. |
| Cancellation message | Admin sets a default template; supervisor sees it pre-filled in a textarea at cancel time and can edit before sending. |
| Receive model | Multiple receive events per order. Order has `partial` status until fully received. |
| 30-day autofill formula | `qty = max(0, ceil(30 * dailyBurnRate) - currentQty)` with global burn-rate fallback when local data is missing. Items with neither local nor global data stay at 0. |
| Permissions | Create + cancel: supervisors + assistant_supervisors. View + receive: all team-scoped roles (incl. ci_specialist). Region-scoped roles see orders read-only via existing reports/audit log. |
| Order numbering | 8-char hex `confirmationId`, matching the existing transaction pattern. |
| Email outbox | Every send is recorded in `email_outbox` for audit. SMTP delivery happens *after* the row is inserted; success/failure is updated on the row. |
| Cancellation snapshot | The actually-sent cancellation message is persisted on the `orders.cancellationMessage` column (not just on the outbox row), so the order detail screen can display it. |

---

## Section 1 — Data model

### New tables

```sql
orders
  id                   text   primary key (UUIDv7)
  confirmation_id      text   unique, 8-char hex
  office_id            text   fk → offices.id
  status               text   check in ('pending','partial','received','cancelled')
  notes                text   nullable
  created_by_user_id   text   fk → users.id
  created_at           text   ISO8601
  cancelled_at         text   nullable
  cancelled_by_user_id text   nullable, fk → users.id
  cancellation_message text   nullable — the customised body that was sent

order_line_items
  id                  text   primary key
  order_id            text   fk → orders.id, on delete cascade
  product_id          text   nullable, fk → products.id     -- null when isOther = true
  is_other            int    boolean
  other_description   text   nullable                       -- non-null when isOther = true
  quantity_ordered    int    > 0
  quantity_received   int    default 0                      -- running total across receive events

order_receive_events
  id                     text  primary key
  order_id               text  fk → orders.id, on delete cascade
  transaction_id         text  fk → transactions.id
  received_by_user_id    text  fk → users.id
  received_at            text  ISO8601
  shipping_receipt_path  text  nullable

office_email_recipients
  id          text   primary key
  office_id   text   fk → offices.id, on delete cascade
  email       text   unique per office
  created_at  text

email_templates
  id          text   primary key
  key         text   unique, in ('order_placed','order_cancelled')
  subject     text   may contain {placeholders}
  body        text   may contain {placeholders}
  updated_at  text

email_outbox
  id            text  primary key
  recipients    text  JSON-encoded string array
  subject       text
  body          text
  sent_at       text  set on attempt; row inserted before SMTP send
  success       int   boolean — null until send completes
  error         text  nullable
  related_kind  text  in ('order_placed','order_cancelled')   -- for filtering
  related_id    text  fk-style reference to orders.id, no SQL constraint
```

Both SQLite and PostgreSQL schemas in parallel, matching existing convention. `isOther` / `otherDescription` mirror the existing `transaction_line_items` pattern.

### State machine

```
pending  ──receive──> partial   ──receive──> received   (terminal)
pending  ──cancel───> cancelled                         (terminal)
partial  ──cancel───> cancelled                         (terminal)
```

`pending` → `received` is allowed in one shot if a single receive event closes out every line. Cancelling a partial order: already-received items stay; remaining lines are noted in the cancellation email body via `{itemsRemaining}`.

---

## Section 2 — Services

All services follow the existing dependency-injection pattern (`(db, schema, user, input)`), live in `src/lib/server/services/`, and are unit-tested with the in-memory test DB.

### `orders.ts`

```ts
createOrder(db, schema, user, input: {
  officeId: string;
  notes?: string;
  lineItems: Array<{ productId?: string; isOther?: boolean; otherDescription?: string; quantityOrdered: number }>;
}): Promise<{ orderId: string; confirmationId: string }>

listOrders(db, schema, user, filters: {
  status?: 'pending'|'partial'|'received'|'cancelled';
  officeId?: string;
}, sort?: OrderSort): Promise<OrderRow[]>

getOrder(db, schema, user, confirmationId: string): Promise<OrderDetail>

cancelOrder(db, schema, user, orderId: string, message: string): Promise<void>

receiveOrderBatch(db, schema, user, orderId: string, input: {
  lines: Array<{ orderLineItemId: string; quantityReceived: number }>;
  shippingReceiptPath?: string;
  notes?: string;
}): Promise<{ transactionId: string; newStatus: 'partial'|'received' }>
```

- `createOrder` requires `create_order` permission; calls `assertOfficeInScope`; inserts order + line items; calls `email.sendEmail()` with rendered `order_placed` template.
- `cancelOrder` requires `cancel_order` permission and order status ∈ {`pending`, `partial`}. Persists `cancellationMessage`, sets `cancelledAt`/`cancelledByUserId`, sends email.
- `receiveOrderBatch` requires `receive_order` permission; calls `transactions.createTransaction` with `action: 'receive'` to create the underlying inventory mutation, then inserts the `order_receive_events` row and increments `quantityReceived` on each affected line item. Status auto-transitions to `received` when every line item has `quantityReceived >= quantityOrdered`, otherwise `partial`.

All inserts that span multiple tables run inside a single `db.transaction()` (synchronous in SQLite, per the project's existing constraint).

### `email.ts`

```ts
sendEmail(db, schema, input: {
  to: string[];
  subject: string;
  body: string;
  relatedKind: 'order_placed'|'order_cancelled';
  relatedId: string;
}): Promise<{ success: boolean; error?: string }>
```

- Inserts an `email_outbox` row with `success: null` *before* attempting SMTP send.
- Uses nodemailer with a transport configured from env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`).
- Catches send errors; updates the outbox row with `success: false, error: msg` rather than throwing — order creation should not fail because email delivery failed. The caller can surface a non-fatal warning to the UI.
- In test env (`process.env.NODE_ENV === 'test'` or `EMAIL_TRANSPORT === 'stub'`), uses a no-op transport that records the send but doesn't actually transmit.

### `orderTemplates.ts`

```ts
getTemplate(db, schema, key: 'order_placed'|'order_cancelled'): Promise<{ subject: string; body: string }>
setTemplate(db, schema, user, key, input: { subject: string; body: string }): Promise<void>
renderTemplate(template: { subject: string; body: string }, vars: Record<string, string>): { subject: string; body: string }
```

Placeholder substitution is `{key}` → `vars.key` with a literal-string pass (no nested templating, no escaping — these are plaintext emails).

Supported placeholders by template:

| Placeholder | order_placed | order_cancelled |
|---|---|---|
| `{orderId}` | ✓ | ✓ |
| `{officeNumber}` | ✓ | ✓ |
| `{officeName}` | ✓ | ✓ |
| `{itemList}` (formatted, one per line) | ✓ | — |
| `{itemsRemaining}` (after partial receipt) | — | ✓ |
| `{itemsAlreadyReceived}` (after partial receipt) | — | ✓ |
| `{notes}` | ✓ | — |
| `{cancelledBy}` | — | ✓ |
| `{createdBy}` | ✓ | — |

Default templates seeded by migration:

```
order_placed
  subject: New backpack inventory order — {officeNumber} {officeName} ({orderId})
  body:    A new order has been placed for {officeNumber} {officeName} by {createdBy}.

           Items requested:
           {itemList}

           Notes: {notes}

           Order ID: {orderId}

order_cancelled
  subject: Cancelled — backpack inventory order {orderId}
  body:    Order {orderId} for {officeNumber} {officeName} has been cancelled by {cancelledBy}.

           Items already received (no action needed):
           {itemsAlreadyReceived}

           Items no longer expected:
           {itemsRemaining}
```

Admins can edit either via the admin UI; templates are upserted by `key`.

### Permission additions

`src/lib/types.ts` — add to `AppPermission`:

```ts
| 'create_order'
| 'cancel_order'
| 'receive_order'
| 'view_orders'
| 'manage_email_settings'
```

`ROLE_PERMISSIONS` updates:

| Role | + permissions |
|---|---|
| ci_specialist | `view_orders`, `receive_order` |
| supervisor | `view_orders`, `receive_order`, `create_order`, `cancel_order`, `manage_email_settings` |
| assistant_supervisor | `view_orders`, `receive_order`, `create_order`, `cancel_order`, `manage_email_settings` |
| aaa | `view_orders` (read-only — no receive/create/cancel) |
| manager | `view_orders` (read-only) |
| director_3p | `view_orders` (read-only) |

Route guards in `hooks.server.ts` — add `/orders` (requires `view_orders`), `/orders/new` (requires `create_order`), `/admin/email-templates` (requires `manage_email_settings`).

---

## Section 3 — UX

### Routes

| Path | Purpose | Permission |
|---|---|---|
| `/orders` | Filterable list | `view_orders` |
| `/orders/new` | Create form | `create_order` |
| `/orders/[confirmationId]` | Detail + receive + cancel | `view_orders` (receive/cancel buttons gated by their own permissions) |
| `/admin/email-templates` | Edit templates | `manage_email_settings` |
| Existing `/admin/offices` | + recipient editing per office | `manage_users` (existing) |

### `/orders/new`

- Office dropdown (in-scope offices). Default = first by office number.
- "Order for next 30 days" button next to the office dropdown — triggers an in-page recompute using forecast data for the selected office.
- Switching offices reloads the page with `?office=<id>` so the server pre-fetches the right forecast data. (Submitting on the wrong office is impossible — the form only POSTs the office that's currently selected.)
- Form layout: products grouped by category (matching dashboard). Per row: product name · current qty (read-only) · daily burn rate (read-only) · qty input (default 0).
- One "+ Add other item" row per category — appears as a new line with `isOther: true` + a text input + a qty input. Multiple "other" rows allowed per category.
- Notes textarea at the bottom.
- Submit validates: at least one line with qty > 0; user has `create_order`. Server-side re-validates everything.
- On success: redirects to `/orders/{confirmationId}` with a success flash. If the email send failed, shows a non-fatal warning.

### `/orders` list

- Filter chips: All · Pending · Partial · Received · Cancelled. Default = Pending.
- Office filter (same component used by dashboard/audit log).
- Sortable table (uses `<SortHeader>` from this morning's work): Confirmation ID, Office, Status badge, Items (line count), Created by, Created at.
- Each row links to `/orders/{confirmationId}`.

### `/orders/[confirmationId]`

- Header: confirmation ID, office, status badge, created by + at, [Cancel] button (if status ∈ {pending, partial} and user has `cancel_order`).
- Line items table: Product · Ordered · Received · Remaining. Line items with `isOther` show the description.
- Receive section (visible if status ∈ {pending, partial} and user has `receive_order`):
  - Form with one row per line item that has `remaining > 0`. Pre-filled with `remaining`, editable down to 0 (skipping that line) or up (over-receipt allowed; reflects what actually arrived).
  - Optional notes textarea.
  - Optional file upload (shipping receipt, same component used by the existing receive transaction flow).
  - Submit button creates a `receive` transaction, an `order_receive_events` row, increments line items, transitions status.
- Receive history: timeline of past receive events with timestamp, user name, link to the underlying transaction in the audit log, and a "view receipt" link if a file was uploaded.
- Cancellation block (visible only when status = cancelled): displays who cancelled it, when, and the actual message that was sent.
- Cancel modal: opened by [Cancel] button. Pre-filled textarea with the rendered `order_cancelled` template (placeholders already substituted). Confirm button calls `cancelOrder()`.

### `/admin/offices` — add recipient management

Each office row gets a "Recipients" expandable cell:

- Collapsed: "N recipients · ✏️"
- Expanded: textarea (one email per line) + Save button.
- Form posts to `?/setRecipients` action. Server validates each line as a valid email; rejects on invalid; replaces all rows for that office on success.

### `/admin/email-templates` (new tab in admin panel)

- Tab nav (existing pattern): Users · Products · Offices · **Email Templates**.
- Two cards stacked:
  - "Order placed email" — subject input, body textarea, placeholder reference panel, [Save] / [Reset to default] buttons.
  - "Order cancelled email" — same shape.
- Reset-to-default writes the seeded default template back over the row.

---

## Section 4 — Email integration

### Configuration

New env vars (added to `.env.example`):

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=backpack-inventory@example.com
EMAIL_TRANSPORT=smtp        # 'smtp' | 'stub' — stub is used for tests/CI
```

`EMAIL_TRANSPORT=stub` short-circuits actual SMTP send. The outbox row is still inserted with `success: true`.

### Send flow

1. Caller (e.g. `createOrder`) builds `to[]`, `subject`, `body` (already rendered through `renderTemplate`).
2. Calls `email.sendEmail()`.
3. `sendEmail` inserts an `email_outbox` row with `success: null`.
4. Calls `transporter.sendMail(...)`. On resolve: update outbox row with `success: true`. On reject: update with `success: false, error: msg`.
5. Returns `{ success, error? }` to the caller.

### Failure handling

- SMTP failure does NOT roll back the order. The order exists; the email row records the failure. The route surfaces a non-fatal warning in the UI ("Order created, but email notification failed — please contact recipients manually").
- No retry / backoff in this spec. A future enhancement could add a background retry process that scans outbox rows where `success = false`.

### Local development

- Default `.env` in this repo doesn't set SMTP vars, so dev defaults to `EMAIL_TRANSPORT=stub`.
- Developers can opt into [Mailpit](https://github.com/axllent/mailpit) (or any local SMTP server) by setting `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, etc.

---

## Section 5 — Files & testing

### New files

```
src/lib/server/db/migrations/sqlite/0002_<auto>.sql    (drizzle-kit auto-names; current latest is 0001_loud_captain_stacy.sql)
src/lib/server/db/migrations/pg/0002_<auto>.sql        (generated on the same db:generate run; pg path follows the project's existing generation flow)
src/lib/server/services/orders.ts
src/lib/server/services/orders.test.ts
src/lib/server/services/email.ts
src/lib/server/services/email.test.ts
src/lib/server/services/orderTemplates.ts
src/lib/server/services/orderTemplates.test.ts

src/routes/(app)/orders/+page.server.ts
src/routes/(app)/orders/+page.svelte
src/routes/(app)/orders/new/+page.server.ts
src/routes/(app)/orders/new/+page.svelte
src/routes/(app)/orders/[confirmationId]/+page.server.ts
src/routes/(app)/orders/[confirmationId]/+page.svelte

src/routes/(app)/admin/email-templates/+page.server.ts
src/routes/(app)/admin/email-templates/+page.svelte

src/lib/components/app/OrderLineItemRow.svelte    -- shared row (create form + receive form)
```

### Modified files

```
src/lib/types.ts                                  -- new permissions
src/lib/server/db/schema/sqlite.ts                -- new tables + relations
src/lib/server/db/schema/pg.ts                    -- parallel schema
src/lib/server/db/seed.ts                         -- seed default email templates
src/lib/server/db/test-db.ts                      -- helper for seeding orders in tests
src/hooks.server.ts                               -- route guards for /orders, /admin/email-templates
src/routes/(app)/+layout.svelte                   -- nav link to /orders
src/routes/(app)/admin/+layout.svelte             -- tab for Email Templates
src/routes/(app)/admin/offices/+page.server.ts    -- setRecipients action
src/routes/(app)/admin/offices/+page.svelte       -- recipient editor cell
src/lib/server/services/admin.ts                  -- listRecipients, setRecipients
src/lib/server/services/admin.test.ts             -- coverage for new admin actions
.env.example                                      -- SMTP/EMAIL vars
package.json                                      -- nodemailer dependency
```

### Testing

Unit tests (Vitest, server project — in-memory SQLite via `createTestDb`):

- `orders.test.ts`:
  - `createOrder` validates permission, scope, at least one line.
  - `createOrder` writes order + line items + outbox row + sends email (via stub transport).
  - `listOrders` filters by status, by office; respects scope.
  - `cancelOrder` validates permission, transitions state, persists `cancellationMessage`, sends email, blocks if status ∉ {pending, partial}.
  - `receiveOrderBatch` creates a `receive` transaction, increments `quantityReceived`, transitions to `partial`, then to `received` when fully fulfilled. Over-receipt allowed (received qty can exceed ordered qty).
  - Order cancelled while partial: already-received items stay; cancellation email body includes both lists.

- `email.test.ts`:
  - `sendEmail` inserts outbox row before send.
  - Stub transport: outbox row marked `success: true`; no SMTP attempted.
  - Forced failure (mocked transport): outbox row marked `success: false` with error.
  - Caller does not receive a thrown error on send failure — return value carries the failure.

- `orderTemplates.test.ts`:
  - `renderTemplate` substitutes all known placeholders.
  - Unknown placeholders left intact (so an admin typo doesn't crash a send).
  - `setTemplate` upserts; reading back returns updated values.

- `admin.test.ts` (extension):
  - `setOfficeRecipients` validates email format, replaces existing rows atomically.

No new E2E tests. The component wiring is straightforward; the load-bearing logic is in the services, all unit-covered. Manual smoke flow during dev verification covers the integration.

### Migration

A single migration file adds all six new tables, indices on `orders.officeId`, `orders.status`, `email_outbox.relatedId`, and seeds the two default email templates via INSERT statements at the bottom. Generated via `npm run db:generate` then committed.
