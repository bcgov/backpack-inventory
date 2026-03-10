import { s as sqliteTable, t as text, i as integer } from './table-CL0lhLuY.js';
import { d as entityKind } from './index2-BRX5Berz.js';
import { B as relations } from './relations-RUcwMH1L.js';
import './shared-server-DaWdgxVh.js';
import './select-C0cBrsvG.js';

class IndexBuilderOn {
  constructor(name, unique) {
    this.name = name;
    this.unique = unique;
  }
  static [entityKind] = "SQLiteIndexBuilderOn";
  on(...columns) {
    return new IndexBuilder(this.name, columns, this.unique);
  }
}
class IndexBuilder {
  static [entityKind] = "SQLiteIndexBuilder";
  /** @internal */
  config;
  constructor(name, columns, unique) {
    this.config = {
      name,
      columns,
      unique,
      where: void 0
    };
  }
  /**
   * Condition for partial index.
   */
  where(condition) {
    this.config.where = condition;
    return this;
  }
  /** @internal */
  build(table) {
    return new Index(this.config, table);
  }
}
class Index {
  static [entityKind] = "SQLiteIndex";
  config;
  constructor(config, table) {
    this.config = { ...config, table };
  }
}
function uniqueIndex(name) {
  return new IndexBuilderOn(name, true);
}

const regions = sqliteTable("regions", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString())
});
const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  regionId: text("region_id").notNull().references(() => regions.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString())
});
const offices = sqliteTable("offices", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => teams.id),
  officeNumber: text("office_number").notNull(),
  name: text("name").notNull(),
  officeType: text("office_type"),
  // SQLite has no BOOLEAN; Drizzle maps integer 0/1 ↔ false/true automatically
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString())
}, (t) => ({
  uniqOfficeNumberName: uniqueIndex("offices_number_name_idx").on(
    t.officeNumber,
    t.name
  )
}));
const productCategories = sqliteTable("product_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString())
});
const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull().references(() => productCategories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  isOther: integer("is_other", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString())
}, (t) => ({
  uniqProductSlugCategory: uniqueIndex("products_slug_category_idx").on(
    t.slug,
    t.categoryId
  )
}));
const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Role stored as TEXT; validated against USER_ROLES union in service layer
  role: text("role").notNull(),
  teamId: text("team_id").references(() => teams.id),
  regionId: text("region_id").references(() => regions.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString())
});
const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  confirmationId: text("confirmation_id").notNull().unique(),
  // Action stored as TEXT; validated against INVENTORY_ACTIONS in service layer
  action: text("action").notNull(),
  officeId: text("office_id").notNull().references(() => offices.id),
  performedByUserId: text("performed_by_user_id").notNull().references(() => users.id),
  recordedByUserId: text("recorded_by_user_id").notNull().references(() => users.id),
  shippingReceiptPath: text("shipping_receipt_path"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString())
});
const transactionLineItems = sqliteTable("transaction_line_items", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  otherDescription: text("other_description")
});
const redistributionDetails = sqliteTable("redistribution_details", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique().references(() => transactions.id, { onDelete: "cascade" }),
  destinationOfficeId: text("destination_office_id").notNull().references(() => offices.id)
});
const inventoryCounts = sqliteTable("inventory_counts", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique().references(() => transactions.id, { onDelete: "cascade" }),
  // Status stored as TEXT; validated in service layer
  status: text("status").notNull().default("pending"),
  reasonCode: text("reason_code"),
  reconciledByUserId: text("reconciled_by_user_id").references(() => users.id),
  reconciledAt: text("reconciled_at"),
  reconcilerNotes: text("reconciler_notes")
});
const currentInventory = sqliteTable("current_inventory", {
  id: text("id").primaryKey(),
  officeId: text("office_id").notNull().references(() => offices.id),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: text("updated_at").notNull().$defaultFn(() => (/* @__PURE__ */ new Date()).toISOString())
}, (t) => ({
  uniqOfficeProduct: uniqueIndex("current_inventory_office_product_idx").on(
    t.officeId,
    t.productId
  )
}));
const regionsRelations = relations(regions, ({ many }) => ({
  teams: many(teams),
  users: many(users)
}));
const teamsRelations = relations(teams, ({ one, many }) => ({
  region: one(regions, { fields: [teams.regionId], references: [regions.id] }),
  offices: many(offices),
  users: many(users)
}));
const officesRelations = relations(offices, ({ one, many }) => ({
  team: one(teams, { fields: [offices.teamId], references: [teams.id] }),
  transactions: many(transactions),
  currentInventory: many(currentInventory)
}));
const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products)
}));
const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id]
  }),
  lineItems: many(transactionLineItems),
  currentInventory: many(currentInventory)
}));
const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  region: one(regions, { fields: [users.regionId], references: [regions.id] }),
  performedTransactions: many(transactions, { relationName: "performedBy" }),
  recordedTransactions: many(transactions, { relationName: "recordedBy" }),
  reconciledCounts: many(inventoryCounts)
}));
const transactionsRelations = relations(transactions, ({ one, many }) => ({
  office: one(offices, { fields: [transactions.officeId], references: [offices.id] }),
  performedBy: one(users, {
    fields: [transactions.performedByUserId],
    references: [users.id],
    relationName: "performedBy"
  }),
  recordedBy: one(users, {
    fields: [transactions.recordedByUserId],
    references: [users.id],
    relationName: "recordedBy"
  }),
  lineItems: many(transactionLineItems),
  redistributionDetail: one(redistributionDetails),
  inventoryCount: one(inventoryCounts)
}));
const transactionLineItemsRelations = relations(transactionLineItems, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionLineItems.transactionId],
    references: [transactions.id]
  }),
  product: one(products, {
    fields: [transactionLineItems.productId],
    references: [products.id]
  })
}));
const redistributionDetailsRelations = relations(redistributionDetails, ({ one }) => ({
  transaction: one(transactions, {
    fields: [redistributionDetails.transactionId],
    references: [transactions.id]
  }),
  destinationOffice: one(offices, {
    fields: [redistributionDetails.destinationOfficeId],
    references: [offices.id]
  })
}));
const inventoryCountsRelations = relations(inventoryCounts, ({ one }) => ({
  transaction: one(transactions, {
    fields: [inventoryCounts.transactionId],
    references: [transactions.id]
  }),
  reconciledBy: one(users, {
    fields: [inventoryCounts.reconciledByUserId],
    references: [users.id]
  })
}));
const currentInventoryRelations = relations(currentInventory, ({ one }) => ({
  office: one(offices, {
    fields: [currentInventory.officeId],
    references: [offices.id]
  }),
  product: one(products, {
    fields: [currentInventory.productId],
    references: [products.id]
  })
}));

export { currentInventory, currentInventoryRelations, inventoryCounts, inventoryCountsRelations, offices, officesRelations, productCategories, productCategoriesRelations, products, productsRelations, redistributionDetails, redistributionDetailsRelations, regions, regionsRelations, teams, teamsRelations, transactionLineItems, transactionLineItemsRelations, transactions, transactionsRelations, users, usersRelations };
//# sourceMappingURL=sqlite-DBnaDcgf.js.map
