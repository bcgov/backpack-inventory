/**
 * PostgreSQL schema — used in production.
 *
 * Run migrations with:
 *   DB_DRIVER=postgres npx drizzle-kit migrate
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  USER_ROLES,
  INVENTORY_ACTIONS,
  INVENTORY_COUNT_STATUSES,
} from '$lib/types';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const inventoryActionEnum = pgEnum('inventory_action', INVENTORY_ACTIONS);
export const inventoryCountStatusEnum = pgEnum(
  'inventory_count_status',
  INVENTORY_COUNT_STATUSES,
);

// ─── Reference / lookup tables ───────────────────────────────────────────────

export const regions = pgTable('regions', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  name:      varchar('name', { length: 100 }).notNull().unique(),
  slug:      varchar('slug', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const teams = pgTable('teams', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  regionId:  varchar('region_id', { length: 36 })
               .notNull()
               .references(() => regions.id),
  name:      varchar('name', { length: 100 }).notNull(),
  slug:      varchar('slug', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const offices = pgTable('offices', {
  id:           varchar('id', { length: 36 }).primaryKey(),
  teamId:       varchar('team_id', { length: 36 })
                  .notNull()
                  .references(() => teams.id),
  regionId:     varchar('region_id', { length: 36 })
                  .notNull()
                  .references(() => regions.id),
  officeNumber: varchar('office_number', { length: 20 }).notNull(),
  name:         varchar('name', { length: 150 }).notNull(),
  officeType:   varchar('office_type', { length: 50 }),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  // An office number can appear in multiple teams (e.g. office 106 has two
  // locations), so uniqueness is enforced on number + name.
  uniqOfficeNumberName: uniqueIndex('offices_number_name_idx').on(
    t.officeNumber,
    t.name,
  ),
}));

export const productCategories = pgTable('product_categories', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  name:      varchar('name', { length: 100 }).notNull().unique(),
  slug:      varchar('slug', { length: 50 }).notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const products = pgTable('products', {
  id:          varchar('id', { length: 36 }).primaryKey(),
  categoryId:  varchar('category_id', { length: 36 })
                 .notNull()
                 .references(() => productCategories.id),
  name:        varchar('name', { length: 150 }).notNull(),
  slug:        varchar('slug', { length: 100 }).notNull(),
  /**
   * isOther flags the catch-all "Other …" product per category.
   * When selected, `transaction_line_items.other_description` is required.
   */
  isOther:     boolean('is_other').notNull().default(false),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  uniqProductSlugCategory: uniqueIndex('products_slug_category_idx').on(
    t.slug,
    t.categoryId,
  ),
}));

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  name:      varchar('name', { length: 200 }).notNull(),
  email:     varchar('email', { length: 255 }).notNull().unique(),
  role:      userRoleEnum('role').notNull(),
  /**
   * Location scope columns.
   * Exactly one of (teamId, regionId) will be non-null for scoped roles;
   * both are null for director_3p (province-wide read-only access).
   */
  teamId:    varchar('team_id', { length: 36 })
               .references(() => teams.id),
  regionId:  varchar('region_id', { length: 36 })
               .references(() => regions.id),
  isActive:  boolean('is_active').notNull().default(true),
  /** Copied from the OIDC token on first login; used for audit display. */
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactions = pgTable('transactions', {
  id:             varchar('id', { length: 36 }).primaryKey(),
  /**
   * Human-readable 8-character uppercase hex ID shown in the UI,
   * e.g. "2FDA77A8". Generated via crypto.randomBytes(4).toString('hex').
   */
  confirmationId: varchar('confirmation_id', { length: 8 })
                    .notNull()
                    .unique(),
  action:         inventoryActionEnum('action').notNull(),
  officeId:       varchar('office_id', { length: 36 })
                    .notNull()
                    .references(() => offices.id),
  /**
   * The staff member who physically performed the action.
   * Usually equals recordedByUserId; differs when recording on behalf of someone.
   */
  performedByUserId: varchar('performed_by_user_id', { length: 36 })
                       .notNull()
                       .references(() => users.id),
  /**
   * The logged-in user who entered the record into the system.
   */
  recordedByUserId: varchar('recorded_by_user_id', { length: 36 })
                      .notNull()
                      .references(() => users.id),
  /** Path to uploaded shipping receipt file (receive actions from OSB only). */
  shippingReceiptPath: text('shipping_receipt_path'),
  notes:          text('notes'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
});

export const transactionLineItems = pgTable('transaction_line_items', {
  id:               varchar('id', { length: 36 }).primaryKey(),
  transactionId:    varchar('transaction_id', { length: 36 })
                      .notNull()
                      .references(() => transactions.id, { onDelete: 'cascade' }),
  productId:        varchar('product_id', { length: 36 })
                      .notNull()
                      .references(() => products.id),
  quantity:         integer('quantity').notNull(),
  /**
   * Free-text description required when product.isOther is true.
   * e.g. "Strawberry bar (local brand)"
   */
  otherDescription: varchar('other_description', { length: 255 }),
});

export const redistributionDetails = pgTable('redistribution_details', {
  id:                  varchar('id', { length: 36 }).primaryKey(),
  transactionId:       varchar('transaction_id', { length: 36 })
                         .notNull()
                         .unique()
                         .references(() => transactions.id, { onDelete: 'cascade' }),
  destinationOfficeId: varchar('destination_office_id', { length: 36 })
                         .notNull()
                         .references(() => offices.id),
});

export const inventoryCounts = pgTable('inventory_counts', {
  id:                 varchar('id', { length: 36 }).primaryKey(),
  transactionId:      varchar('transaction_id', { length: 36 })
                        .notNull()
                        .unique()
                        .references(() => transactions.id, { onDelete: 'cascade' }),
  status:             inventoryCountStatusEnum('status')
                        .notNull()
                        .default('pending'),
  reasonCode:         varchar('reason_code', { length: 100 }),
  reconciledByUserId: varchar('reconciled_by_user_id', { length: 36 })
                        .references(() => users.id),
  reconciledAt:       timestamp('reconciled_at'),
  /** Optional notes added by the reconciler when accepting/rejecting. */
  reconcilerNotes:    text('reconciler_notes'),
});

// ─── Current inventory (derived / maintained state) ──────────────────────────

/**
 * current_inventory is the live quantity per office+product.
 *
 * It is updated transactionally alongside every transaction insertion:
 *  - receive / return → quantity += lineItem.quantity
 *  - remove          → quantity -= lineItem.quantity
 *  - redistribute    → source office -=, destination office +=
 *  - inventory_count → no change until reconciled (accepted)
 *
 * A quantity of 0 is a valid row (not deleted) to preserve history.
 * Rows are upserted (INSERT … ON CONFLICT DO UPDATE) on every write.
 */
export const currentInventory = pgTable('current_inventory', {
  id:        varchar('id', { length: 36 }).primaryKey(),
  officeId:  varchar('office_id', { length: 36 })
               .notNull()
               .references(() => offices.id),
  productId: varchar('product_id', { length: 36 })
               .notNull()
               .references(() => products.id),
  quantity:  integer('quantity').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqOfficeProduct: uniqueIndex('current_inventory_office_product_idx').on(
    t.officeId,
    t.productId,
  ),
}));

// ─── Relations (used by Drizzle's relational query API) ───────────────────────

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
  office:           one(offices, { fields: [transactions.officeId], references: [offices.id] }),
  performedBy:      one(users, {
    fields:       [transactions.performedByUserId],
    references:   [users.id],
    relationName: 'performedBy',
  }),
  recordedBy:       one(users, {
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
  transaction:         one(transactions, {
    fields:     [redistributionDetails.transactionId],
    references: [transactions.id],
  }),
  destinationOffice:   one(offices, {
    fields:     [redistributionDetails.destinationOfficeId],
    references: [offices.id],
  }),
}));

export const inventoryCountsRelations = relations(inventoryCounts, ({ one }) => ({
  transaction:    one(transactions, {
    fields:     [inventoryCounts.transactionId],
    references: [transactions.id],
  }),
  reconciledBy:   one(users, {
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
