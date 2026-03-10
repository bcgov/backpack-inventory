import { b as private_env } from './shared-server-DaWdgxVh.js';
import { g as getDb, a as getSchema, e as eq, i as inArray, s as sql, c as and, b as gte } from './index2-BRX5Berz.js';
import { g as getOfficesForUser, a as getOfficeIdsForUser } from './scope-_J_qWR4v.js';
import './types-Dpk4TN7N.js';

function buildDataPoints(dailyRemovals, burnRateDays, today = /* @__PURE__ */ new Date()) {
  const points = [];
  for (let offset = -(burnRateDays - 1); offset <= 0; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const key = d.toISOString().slice(0, 10);
    points.push({
      dayOffset: offset,
      quantity: dailyRemovals.get(key) ?? 0,
      weight: offset >= -6 ? 3 : 1
    });
  }
  return points;
}
function weightedLinearRegression(points) {
  if (points.length === 0) return 0;
  let Sw = 0, Swx = 0, Swy = 0, Swxx = 0, Swxy = 0;
  for (const { dayOffset: x, quantity: y, weight: w } of points) {
    Sw += w;
    Swx += w * x;
    Swy += w * y;
    Swxx += w * x * x;
    Swxy += w * x * y;
  }
  if (Sw === 0) return 0;
  const denom = Sw * Swxx - Swx * Swx;
  let intercept;
  if (Math.abs(denom) < 1e-12) {
    intercept = Swy / Sw;
  } else {
    const slope = (Sw * Swxy - Swx * Swy) / denom;
    intercept = (Swy - slope * Swx) / Sw;
  }
  return Math.max(0, intercept);
}
function applySeasonality(baseRate, sameMonthLastYear, otherMonthsLastYear) {
  if (!sameMonthLastYear || !otherMonthsLastYear) return baseRate;
  const totalQty = sameMonthLastYear.totalQty + otherMonthsLastYear.totalQty;
  const totalDays = sameMonthLastYear.days + otherMonthsLastYear.days;
  if (totalDays === 0 || totalQty === 0) return baseRate;
  const annualDailyAvg = totalQty / totalDays;
  if (annualDailyAvg === 0) return baseRate;
  const sameMonthDailyAvg = sameMonthLastYear.days > 0 ? sameMonthLastYear.totalQty / sameMonthLastYear.days : 0;
  const rawFactor = sameMonthDailyAvg / annualDailyAvg;
  const factor = Math.min(10, Math.max(0.1, rawFactor));
  return baseRate * factor;
}
function computeDaysRemaining(currentQty, dailyBurnRate) {
  if (dailyBurnRate === null || dailyBurnRate <= 0) return null;
  if (currentQty <= 0) return 0;
  return Math.ceil(currentQty / dailyBurnRate);
}
function computeColor(daysRemaining, config) {
  if (daysRemaining === null) return "none";
  if (daysRemaining >= config.greenDays) return "green";
  if (daysRemaining >= config.yellowDays) return "yellow";
  return "red";
}
async function getInventoryWithForecast(db, schema, user, officeId, config) {
  const officeIds = officeId ? [officeId] : await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];
  const inventory = await db.select({
    officeId: schema.currentInventory.officeId,
    officeName: schema.offices.name,
    officeNumber: schema.offices.officeNumber,
    productId: schema.currentInventory.productId,
    productName: schema.products.name,
    categoryId: schema.products.categoryId,
    currentQty: schema.currentInventory.quantity,
    updatedAt: schema.currentInventory.updatedAt
  }).from(schema.currentInventory).innerJoin(schema.offices, eq(schema.currentInventory.officeId, schema.offices.id)).innerJoin(schema.products, eq(schema.currentInventory.productId, schema.products.id)).where(inArray(schema.currentInventory.officeId, officeIds)).orderBy(schema.offices.officeNumber, schema.products.name);
  if (!inventory.length) return [];
  const today = /* @__PURE__ */ new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - config.burnRateDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const removalRows = await db.select({
    officeId: schema.transactions.officeId,
    productId: schema.transactionLineItems.productId,
    day: sql`DATE(${schema.transactions.createdAt})`,
    qty: sql`SUM(${schema.transactionLineItems.quantity})`
  }).from(schema.transactions).innerJoin(
    schema.transactionLineItems,
    eq(schema.transactionLineItems.transactionId, schema.transactions.id)
  ).where(
    and(
      eq(schema.transactions.action, "remove"),
      inArray(schema.transactions.officeId, officeIds),
      gte(schema.transactions.createdAt, cutoffStr)
    )
  ).groupBy(
    schema.transactions.officeId,
    schema.transactionLineItems.productId,
    sql`DATE(${schema.transactions.createdAt})`
  );
  const removalIndex = /* @__PURE__ */ new Map();
  for (const row of removalRows) {
    const key = `${row.officeId}|${row.productId}`;
    if (!removalIndex.has(key)) removalIndex.set(key, /* @__PURE__ */ new Map());
    removalIndex.get(key).set(row.day, row.qty);
  }
  const globalRows = await db.select({
    productId: schema.transactionLineItems.productId,
    totalQty: sql`SUM(${schema.transactionLineItems.quantity})`,
    officeDays: sql`COUNT(DISTINCT ${schema.transactions.officeId} || '|' || DATE(${schema.transactions.createdAt}))`
  }).from(schema.transactions).innerJoin(
    schema.transactionLineItems,
    eq(schema.transactionLineItems.transactionId, schema.transactions.id)
  ).where(
    and(
      eq(schema.transactions.action, "remove"),
      gte(schema.transactions.createdAt, cutoffStr)
    )
  ).groupBy(schema.transactionLineItems.productId);
  const globalIndex = /* @__PURE__ */ new Map();
  for (const row of globalRows) {
    if (row.officeDays > 0) {
      globalIndex.set(row.productId, row.totalQty / row.officeDays);
    }
  }
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const lastYear = String(today.getFullYear() - 1);
  const seasonRows = await db.select({
    officeId: schema.transactions.officeId,
    productId: schema.transactionLineItems.productId,
    sameMonth: sql`CASE WHEN strftime('%m', ${schema.transactions.createdAt}) = ${currentMonth} THEN 1 ELSE 0 END`,
    totalQty: sql`SUM(${schema.transactionLineItems.quantity})`,
    days: sql`COUNT(DISTINCT DATE(${schema.transactions.createdAt}))`
  }).from(schema.transactions).innerJoin(
    schema.transactionLineItems,
    eq(schema.transactionLineItems.transactionId, schema.transactions.id)
  ).where(
    and(
      eq(schema.transactions.action, "remove"),
      inArray(schema.transactions.officeId, officeIds),
      sql`strftime('%Y', ${schema.transactions.createdAt}) = ${lastYear}`
    )
  ).groupBy(
    schema.transactions.officeId,
    schema.transactionLineItems.productId,
    sql`CASE WHEN strftime('%m', ${schema.transactions.createdAt}) = ${currentMonth} THEN 1 ELSE 0 END`
  );
  const seasonIndex = /* @__PURE__ */ new Map();
  for (const row of seasonRows) {
    const key = `${row.officeId}|${row.productId}`;
    if (!seasonIndex.has(key)) seasonIndex.set(key, { same: null, other: null });
    const entry = seasonIndex.get(key);
    if (row.sameMonth === 1) {
      entry.same = { totalQty: row.totalQty, days: row.days };
    } else {
      entry.other = { totalQty: row.totalQty, days: row.days };
    }
  }
  return inventory.map((inv) => {
    const key = `${inv.officeId}|${inv.productId}`;
    const dailyMap = removalIndex.get(key) ?? /* @__PURE__ */ new Map();
    const hasLocalData = dailyMap.size > 0;
    const points = buildDataPoints(dailyMap, config.burnRateDays, today);
    const baseRate = weightedLinearRegression(points);
    let dailyBurnRate;
    let burnRateSource;
    if (hasLocalData && baseRate > 0) {
      const season = seasonIndex.get(key);
      const adjusted = applySeasonality(baseRate, season?.same ?? null, season?.other ?? null);
      dailyBurnRate = adjusted;
      burnRateSource = "local";
    } else if (!hasLocalData && globalIndex.has(inv.productId)) {
      dailyBurnRate = globalIndex.get(inv.productId);
      burnRateSource = "global";
    } else {
      dailyBurnRate = null;
      burnRateSource = "none";
    }
    const daysRemaining = computeDaysRemaining(inv.currentQty, dailyBurnRate);
    const color = computeColor(daysRemaining, config);
    return {
      officeId: inv.officeId,
      officeName: inv.officeName,
      officeNumber: inv.officeNumber,
      productId: inv.productId,
      productName: inv.productName,
      categoryId: inv.categoryId,
      currentQty: inv.currentQty,
      updatedAt: inv.updatedAt,
      dailyBurnRate: dailyBurnRate !== null && dailyBurnRate > 0 ? dailyBurnRate : null,
      daysRemaining,
      color,
      burnRateSource
    };
  });
}
const load = async ({ locals, url }) => {
  const db = await getDb();
  const schema = await getSchema();
  const user = locals.user;
  const officeId = url.searchParams.get("office") || void 0;
  const config = {
    burnRateDays: parseInt(private_env.BURN_RATE_DAYS ?? "30", 10),
    greenDays: parseInt(private_env.DAYS_GREEN ?? "30", 10),
    yellowDays: parseInt(private_env.DAYS_YELLOW ?? "14", 10)
  };
  const [inventory, offices] = await Promise.all([
    getInventoryWithForecast(db, schema, user, officeId, config),
    getOfficesForUser(db, schema, user)
  ]);
  const byOffice = /* @__PURE__ */ new Map();
  for (const row of inventory) {
    if (!byOffice.has(row.officeId)) {
      byOffice.set(row.officeId, {
        officeId: row.officeId,
        officeName: row.officeName,
        officeNumber: row.officeNumber,
        items: []
      });
    }
    byOffice.get(row.officeId).items.push(row);
  }
  return {
    officeGroups: [...byOffice.values()].sort((a, b) => a.officeNumber.localeCompare(b.officeNumber)),
    offices,
    selectedOffice: officeId ?? "",
    config
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 10;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CBeumehF.js')).default;
const server_id = "src/routes/(app)/dashboard/+page.server.ts";
const imports = ["_app/immutable/nodes/10.CvXwmoXh.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/Dx78MLBa.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=10-CeIp5zbQ.js.map
