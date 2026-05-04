/**
 * SQLite schema — used in local development.
 *
 * Mirrors pg.ts exactly in shape; differences from the PG schema:
 *  - No native enums   → stored as TEXT with CHECK constraints applied at
 *                        the application layer (Drizzle validates on insert).
 *  - No native BOOLEAN → stored as INTEGER (0 / 1); Drizzle maps to JS boolean.
 *  - No native TIMESTAMP WITH TIME ZONE → stored as TEXT (ISO-8601).
 *  - No SERIAL / sequences → UUIDs generated in application code.
 *
 * Run migrations with:
 *   DB_DRIVER=sqlite npx drizzle-kit migrate
 */

import { relations } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ─── Reference / lookup tables ───────────────────────────────────────────────

export const regions = sqliteTable('regions', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  slug:      text('slug').notNull().unique(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const teams = sqliteTable('teams', {
  id:        text('id').primaryKey(),
  regionId:  text('region_id')
               .notNull()
               .references(() => regions.id),
  name:      text('name').notNull(),
  slug:      text('slug').notNull().unique(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const offices = sqliteTable('offices', {
  id:           text('id').primaryKey(),
  teamId:       text('team_id')
                  .notNull()
                  .references(() => teams.id),
  regionId:     text('region_id')
                  .notNull()
                  .references(() => regions.id),
  officeNumber: text('office_number').notNull(),
  name:         text('name').notNull(),
  officeType:   text('office_type'),
  // SQLite has no BOOLEAN; Drizzle maps integer 0/1 ↔ false/true automatically
  isActive:     integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt:    text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  uniqOfficeNumberName: uniqueIndex('offices_number_name_idx').on(
    t.officeNumber,
    t.name,
  ),
}));

export const productCategories = sqliteTable('product_categories', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  slug:      text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const products = sqliteTable('products', {
  id:         text('id').primaryKey(),
  categoryId: text('category_id')
                .notNull()
                .references(() => productCategories.id),
  name:       text('name').notNull(),
  slug:       text('slug').notNull(),
  isOther:    integer('is_other', { mode: 'boolean' }).notNull().default(false),
  isActive:   integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt:  text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  uniqProductSlugCategory: uniqueIndex('products_slug_category_idx').on(
    t.slug,
    t.categoryId,
  ),
}));

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  email:       text('email').notNull().unique(),
  // Role stored as TEXT; validated against USER_ROLES union in service layer
  role:        text('role').notNull(),
  teamId:      text('team_id').references(() => teams.id),
  regionId:    text('region_id').references(() => regions.id),
  isActive:    integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLoginAt: text('last_login_at'),
  createdAt:   text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt:   text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactions = sqliteTable('transactions', {
  id:             text('id').primaryKey(),
  confirmationId: text('confirmation_id').notNull().unique(),
  // Action stored as TEXT; validated against INVENTORY_ACTIONS in service layer
  action:         text('action').notNull(),
  officeId:       text('office_id')
                    .notNull()
                    .references(() => offices.id),
  performedByUserId: text('performed_by_user_id')
                       .notNull()
                       .references(() => users.id),
  recordedByUserId: text('recorded_by_user_id')
                      .notNull()
                      .references(() => users.id),
  shippingReceiptPath: text('shipping_receipt_path'),
  notes:          text('notes'),
  createdAt:      text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const transactionLineItems = sqliteTable('transaction_line_items', {
  id:               text('id').primaryKey(),
  transactionId:    text('transaction_id')
                      .notNull()
                      .references(() => transactions.id, { onDelete: 'cascade' }),
  productId:        text('product_id')
                      .notNull()
                      .references(() => products.id),
  quantity:         integer('quantity').notNull(),
  otherDescription: text('other_description'),
});

export const redistributionDetails = sqliteTable('redistribution_details', {
  id:                  text('id').primaryKey(),
  transactionId:       text('transaction_id')
                         .notNull()
                         .unique()
                         .references(() => transactions.id, { onDelete: 'cascade' }),
  destinationOfficeId: text('destination_office_id')
                         .notNull()
                         .references(() => offices.id),
});

export const inventoryCounts = sqliteTable('inventory_counts', {
  id:                 text('id').primaryKey(),
  transactionId:      text('transaction_id')
                        .notNull()
                        .unique()
                        .references(() => transactions.id, { onDelete: 'cascade' }),
  // Status stored as TEXT; validated in service layer
  status:             text('status').notNull().default('pending'),
  reasonCode:         text('reason_code'),
  reconciledByUserId: text('reconciled_by_user_id')
                        .references(() => users.id),
  reconciledAt:       text('reconciled_at'),
  reconcilerNotes:    text('reconciler_notes'),
});

// ─── Current inventory (derived / maintained state) ──────────────────────────

export const currentInventory = sqliteTable('current_inventory', {
  id:        text('id').primaryKey(),
  officeId:  text('office_id')
               .notNull()
               .references(() => offices.id),
  productId: text('product_id')
               .notNull()
               .references(() => products.id),
  quantity:  integer('quantity').notNull().default(0),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  uniqOfficeProduct: uniqueIndex('current_inventory_office_product_idx').on(
    t.officeId,
    t.productId,
  ),
}));

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = sqliteTable('orders', {
  id:                 text('id').primaryKey(),
  confirmationId:     text('confirmation_id').notNull().unique(),
  officeId:           text('office_id').notNull().references(() => offices.id),
  // Status validated in service layer against ORDER_STATUSES
  status:             text('status').notNull().default('pending'),
  notes:              text('notes'),
  createdByUserId:    text('created_by_user_id').notNull().references(() => users.id),
  createdAt:          text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  cancelledAt:        text('cancelled_at'),
  cancelledByUserId:  text('cancelled_by_user_id').references(() => users.id),
  cancellationMessage:text('cancellation_message'),
});

export const orderLineItems = sqliteTable('order_line_items', {
  id:               text('id').primaryKey(),
  orderId:          text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId:        text('product_id').references(() => products.id),
  isOther:          integer('is_other', { mode: 'boolean' }).notNull().default(false),
  otherDescription: text('other_description'),
  quantityOrdered:  integer('quantity_ordered').notNull(),
  quantityReceived: integer('quantity_received').notNull().default(0),
});

export const orderReceiveEvents = sqliteTable('order_receive_events', {
  id:                  text('id').primaryKey(),
  orderId:             text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  transactionId:       text('transaction_id').notNull().references(() => transactions.id),
  receivedByUserId:    text('received_by_user_id').notNull().references(() => users.id),
  receivedAt:          text('received_at').notNull().$defaultFn(() => new Date().toISOString()),
  shippingReceiptPath: text('shipping_receipt_path'),
});

export const officeEmailRecipients = sqliteTable('office_email_recipients', {
  id:        text('id').primaryKey(),
  officeId:  text('office_id').notNull().references(() => offices.id, { onDelete: 'cascade' }),
  email:     text('email').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (t) => ({
  uniqOfficeEmail: uniqueIndex('office_email_recipients_office_email_idx').on(t.officeId, t.email),
}));

export const emailTemplates = sqliteTable('email_templates', {
  id:        text('id').primaryKey(),
  // 'order_placed' | 'order_cancelled'
  key:       text('key').notNull().unique(),
  subject:   text('subject').notNull(),
  body:      text('body').notNull(),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const emailOutbox = sqliteTable('email_outbox', {
  id:          text('id').primaryKey(),
  recipients:  text('recipients').notNull(),  // JSON-encoded string[]
  subject:     text('subject').notNull(),
  body:        text('body').notNull(),
  sentAt:      text('sent_at').notNull().$defaultFn(() => new Date().toISOString()),
  // null until send completes; 1 success, 0 failure
  success:     integer('success', { mode: 'boolean' }),
  error:       text('error'),
  // 'order_placed' | 'order_cancelled'
  relatedKind: text('related_kind').notNull(),
  relatedId:   text('related_id').notNull(),
});

// ─── Relations (identical to pg.ts) ──────────────────────────────────────────

export const regionsRelations = relations(regions, ({ many }) => ({
  teams: many(teams),
  users: many(users),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  region:  one(regions, { fields: [teams.regionId], references: [regions.id] }),
  offices: many(offices),
  users:   many(users),
}));

export const officesRelations = relations(offices, ({ one, many }) => ({
  team:             one(teams,   { fields: [offices.teamId],   references: [teams.id] }),
  region:           one(regions, { fields: [offices.regionId], references: [regions.id] }),
  transactions:     many(transactions),
  currentInventory: many(currentInventory),
}));

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category:         one(productCategories, {
    fields:     [products.categoryId],
    references: [productCategories.id],
  }),
  lineItems:        many(transactionLineItems),
  currentInventory: many(currentInventory),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  team:                  one(teams, { fields: [users.teamId], references: [teams.id] }),
  region:                one(regions, { fields: [users.regionId], references: [regions.id] }),
  performedTransactions: many(transactions, { relationName: 'performedBy' }),
  recordedTransactions:  many(transactions, { relationName: 'recordedBy' }),
  reconciledCounts:      many(inventoryCounts),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  office:      one(offices, { fields: [transactions.officeId], references: [offices.id] }),
  performedBy: one(users, {
    fields:       [transactions.performedByUserId],
    references:   [users.id],
    relationName: 'performedBy',
  }),
  recordedBy:  one(users, {
    fields:       [transactions.recordedByUserId],
    references:   [users.id],
    relationName: 'recordedBy',
  }),
  lineItems:            many(transactionLineItems),
  redistributionDetail: one(redistributionDetails),
  inventoryCount:       one(inventoryCounts),
}));

export const transactionLineItemsRelations = relations(transactionLineItems, ({ one }) => ({
  transaction: one(transactions, {
    fields:     [transactionLineItems.transactionId],
    references: [transactions.id],
  }),
  product:     one(products, {
    fields:     [transactionLineItems.productId],
    references: [products.id],
  }),
}));

export const redistributionDetailsRelations = relations(redistributionDetails, ({ one }) => ({
  transaction:       one(transactions, {
    fields:     [redistributionDetails.transactionId],
    references: [transactions.id],
  }),
  destinationOffice: one(offices, {
    fields:     [redistributionDetails.destinationOfficeId],
    references: [offices.id],
  }),
}));

export const inventoryCountsRelations = relations(inventoryCounts, ({ one }) => ({
  transaction:  one(transactions, {
    fields:     [inventoryCounts.transactionId],
    references: [transactions.id],
  }),
  reconciledBy: one(users, {
    fields:     [inventoryCounts.reconciledByUserId],
    references: [users.id],
  }),
}));

export const currentInventoryRelations = relations(currentInventory, ({ one }) => ({
  office:  one(offices, {
    fields:     [currentInventory.officeId],
    references: [offices.id],
  }),
  product: one(products, {
    fields:     [currentInventory.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  office:        one(offices,  { fields: [orders.officeId],          references: [offices.id] }),
  createdByUser: one(users,    { fields: [orders.createdByUserId],   references: [users.id] }),
  lineItems:     many(orderLineItems),
  receiveEvents: many(orderReceiveEvents),
}));

export const orderLineItemsRelations = relations(orderLineItems, ({ one }) => ({
  order:   one(orders,   { fields: [orderLineItems.orderId],   references: [orders.id] }),
  product: one(products, { fields: [orderLineItems.productId], references: [products.id] }),
}));

export const orderReceiveEventsRelations = relations(orderReceiveEvents, ({ one }) => ({
  order:       one(orders,       { fields: [orderReceiveEvents.orderId],       references: [orders.id] }),
  transaction: one(transactions, { fields: [orderReceiveEvents.transactionId], references: [transactions.id] }),
}));

export const officeEmailRecipientsRelations = relations(officeEmailRecipients, ({ one }) => ({
  office: one(offices, { fields: [officeEmailRecipients.officeId], references: [offices.id] }),
}));
