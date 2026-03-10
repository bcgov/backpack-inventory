import { U as USER_ROLES, I as INVENTORY_ACTIONS, b as INVENTORY_COUNT_STATUSES } from './types-Dpk4TN7N.js';
import { x as pgTable, y as timestamp, z as integer, A as varchar, B as relations, C as text, D as boolean } from './relations-RUcwMH1L.js';
import { d as entityKind, f as is, S as SQL, I as IndexedColumn, r as pgEnum } from './index2-BRX5Berz.js';
import './select-C0cBrsvG.js';
import './shared-server-DaWdgxVh.js';

class IndexBuilderOn {
  constructor(unique, name) {
    this.unique = unique;
    this.name = name;
  }
  static [entityKind] = "PgIndexBuilderOn";
  on(...columns) {
    return new IndexBuilder(
      columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
        return clonedIndexedColumn;
      }),
      this.unique,
      false,
      this.name
    );
  }
  onOnly(...columns) {
    return new IndexBuilder(
      columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = it.defaultConfig;
        return clonedIndexedColumn;
      }),
      this.unique,
      true,
      this.name
    );
  }
  /**
   * Specify what index method to use. Choices are `btree`, `hash`, `gist`, `spgist`, `gin`, `brin`, or user-installed access methods like `bloom`. The default method is `btree.
   *
   * If you have the `pg_vector` extension installed in your database, you can use the `hnsw` and `ivfflat` options, which are predefined types.
   *
   * **You can always specify any string you want in the method, in case Drizzle doesn't have it natively in its types**
   *
   * @param method The name of the index method to be used
   * @param columns
   * @returns
   */
  using(method, ...columns) {
    return new IndexBuilder(
      columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
        return clonedIndexedColumn;
      }),
      this.unique,
      true,
      this.name,
      method
    );
  }
}
class IndexBuilder {
  static [entityKind] = "PgIndexBuilder";
  /** @internal */
  config;
  constructor(columns, unique, only, name, method = "btree") {
    this.config = {
      name,
      columns,
      unique,
      only,
      method
    };
  }
  concurrently() {
    this.config.concurrently = true;
    return this;
  }
  with(obj) {
    this.config.with = obj;
    return this;
  }
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
  static [entityKind] = "PgIndex";
  config;
  constructor(config, table) {
    this.config = { ...config, table };
  }
}
function uniqueIndex(name) {
  return new IndexBuilderOn(true, name);
}

const userRoleEnum = pgEnum("user_role", USER_ROLES);
const inventoryActionEnum = pgEnum("inventory_action", INVENTORY_ACTIONS);
const inventoryCountStatusEnum = pgEnum(
  "inventory_count_status",
  INVENTORY_COUNT_STATUSES
);
const regions = pgTable("regions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
const teams = pgTable("teams", {
  id: varchar("id", { length: 36 }).primaryKey(),
  regionId: varchar("region_id", { length: 36 }).notNull().references(() => regions.id),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
const offices = pgTable("offices", {
  id: varchar("id", { length: 36 }).primaryKey(),
  teamId: varchar("team_id", { length: 36 }).notNull().references(() => teams.id),
  officeNumber: varchar("office_number", { length: 20 }).notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  officeType: varchar("office_type", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (t) => ({
  // An office number can appear in multiple teams (e.g. office 106 has two
  // locations), so uniqueness is enforced on number + name.
  uniqOfficeNumberName: uniqueIndex("offices_number_name_idx").on(
    t.officeNumber,
    t.name
  )
}));
const productCategories = pgTable("product_categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
const products = pgTable("products", {
  id: varchar("id", { length: 36 }).primaryKey(),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => productCategories.id),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  /**
   * isOther flags the catch-all "Other …" product per category.
   * When selected, `transaction_line_items.other_description` is required.
   */
  isOther: boolean("is_other").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (t) => ({
  uniqProductSlugCategory: uniqueIndex("products_slug_category_idx").on(
    t.slug,
    t.categoryId
  )
}));
const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: userRoleEnum("role").notNull(),
  /**
   * Location scope columns.
   * Exactly one of (teamId, regionId) will be non-null for scoped roles;
   * both are null for director_3p (province-wide read-only access).
   */
  teamId: varchar("team_id", { length: 36 }).references(() => teams.id),
  regionId: varchar("region_id", { length: 36 }).references(() => regions.id),
  isActive: boolean("is_active").notNull().default(true),
  /** Copied from the OIDC token on first login; used for audit display. */
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
const transactions = pgTable("transactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  /**
   * Human-readable 8-character uppercase hex ID shown in the UI,
   * e.g. "2FDA77A8". Generated via crypto.randomBytes(4).toString('hex').
   */
  confirmationId: varchar("confirmation_id", { length: 8 }).notNull().unique(),
  action: inventoryActionEnum("action").notNull(),
  officeId: varchar("office_id", { length: 36 }).notNull().references(() => offices.id),
  /**
   * The staff member who physically performed the action.
   * Usually equals recordedByUserId; differs when recording on behalf of someone.
   */
  performedByUserId: varchar("performed_by_user_id", { length: 36 }).notNull().references(() => users.id),
  /**
   * The logged-in user who entered the record into the system.
   */
  recordedByUserId: varchar("recorded_by_user_id", { length: 36 }).notNull().references(() => users.id),
  /** Path to uploaded shipping receipt file (receive actions from OSB only). */
  shippingReceiptPath: text("shipping_receipt_path"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
const transactionLineItems = pgTable("transaction_line_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  transactionId: varchar("transaction_id", { length: 36 }).notNull().references(() => transactions.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  /**
   * Free-text description required when product.isOther is true.
   * e.g. "Strawberry bar (local brand)"
   */
  otherDescription: varchar("other_description", { length: 255 })
});
const redistributionDetails = pgTable("redistribution_details", {
  id: varchar("id", { length: 36 }).primaryKey(),
  transactionId: varchar("transaction_id", { length: 36 }).notNull().unique().references(() => transactions.id, { onDelete: "cascade" }),
  destinationOfficeId: varchar("destination_office_id", { length: 36 }).notNull().references(() => offices.id)
});
const inventoryCounts = pgTable("inventory_counts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  transactionId: varchar("transaction_id", { length: 36 }).notNull().unique().references(() => transactions.id, { onDelete: "cascade" }),
  status: inventoryCountStatusEnum("status").notNull().default("pending"),
  reasonCode: varchar("reason_code", { length: 100 }),
  reconciledByUserId: varchar("reconciled_by_user_id", { length: 36 }).references(() => users.id),
  reconciledAt: timestamp("reconciled_at"),
  /** Optional notes added by the reconciler when accepting/rejecting. */
  reconcilerNotes: text("reconciler_notes")
});
const currentInventory = pgTable("current_inventory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  officeId: varchar("office_id", { length: 36 }).notNull().references(() => offices.id),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
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

export { currentInventory, currentInventoryRelations, inventoryActionEnum, inventoryCountStatusEnum, inventoryCounts, inventoryCountsRelations, offices, officesRelations, productCategories, productCategoriesRelations, products, productsRelations, redistributionDetails, redistributionDetailsRelations, regions, regionsRelations, teams, teamsRelations, transactionLineItems, transactionLineItemsRelations, transactions, transactionsRelations, userRoleEnum, users, usersRelations };
//# sourceMappingURL=pg-P_w1M7KN.js.map
