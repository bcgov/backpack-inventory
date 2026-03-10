/**
 * Seed script — populates all reference data.
 *
 * Run with:
 *   npx tsx src/lib/server/db/seed.ts
 *
 * Safe to re-run: uses upsert semantics (INSERT OR IGNORE / ON CONFLICT DO NOTHING).
 *
 * Data sourced from:
 *   - OfficeTeams sheet  → regions, teams, offices
 *   - All Inventory Movement sheet → product categories, products
 */

import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from './schema/sqlite.js';

// ─── Connection ───────────────────────────────────────────────────────────────

const dbPath = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function upsertRegion(name: string) {
  const slug = slugify(name);
  // Look up by slug so re-runs return the same UUID
  const existing = db.get<{ id: string }>(sql`SELECT id FROM regions WHERE slug = ${slug}`);
  if (existing) return existing.id;
  const id = randomUUID();
  db.run(sql`
    INSERT INTO regions (id, name, slug, created_at)
    VALUES (${id}, ${name}, ${slug}, ${new Date().toISOString()})
  `);
  return id;
}

function upsertTeam(regionId: string, name: string) {
  const slug = slugify(name);
  // Look up by slug so re-runs return the same UUID
  const existing = db.get<{ id: string }>(sql`SELECT id FROM teams WHERE slug = ${slug}`);
  if (existing) return existing.id;
  const id = randomUUID();
  db.run(sql`
    INSERT INTO teams (id, region_id, name, slug, created_at)
    VALUES (${id}, ${regionId}, ${name}, ${slug}, ${new Date().toISOString()})
  `);
  return id;
}

function upsertOffice(
  teamId: string,
  regionId: string,
  officeNumber: string,
  name: string,
  officeType: string | null,
) {
  const id = randomUUID();
  // Use INSERT OR IGNORE with a unique constraint on (office_number, name)
  db.run(sql`
    INSERT OR IGNORE INTO offices
      (id, team_id, region_id, office_number, name, office_type, is_active, created_at)
    VALUES
      (${id}, ${teamId}, ${regionId}, ${officeNumber}, ${name}, ${officeType}, 1, ${new Date().toISOString()})
  `);
  // Return the id that was actually inserted (may differ if row already existed)
  const row = db.get<{ id: string }>(sql`
    SELECT id FROM offices WHERE office_number = ${officeNumber} AND name = ${name}
  `);
  return row!.id;
}

function upsertCategory(name: string, sortOrder: number) {
  const id = slugify(name);
  db.run(sql`
    INSERT OR IGNORE INTO product_categories (id, name, slug, sort_order, created_at)
    VALUES (${id}, ${name}, ${id}, ${sortOrder}, ${new Date().toISOString()})
  `);
  return id;
}

function upsertProduct(
  categoryId: string,
  name: string,
  isOther: boolean = false,
) {
  const slug = slugify(name);
  db.run(sql`
    INSERT OR IGNORE INTO products (id, category_id, name, slug, is_other, is_active, created_at)
    VALUES (${randomUUID()}, ${categoryId}, ${name}, ${slug}, ${isOther ? 1 : 0}, 1, ${new Date().toISOString()})
  `);
  const row = db.get<{ id: string }>(sql`
    SELECT id FROM products WHERE slug = ${slug} AND category_id = ${categoryId}
  `);
  return row!.id;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
//
// Sourced directly from the OfficeTeams and All Inventory Movement sheets.
//
// Structure: region → [teams → [offices]]
// ─────────────────────────────────────────────────────────────────────────────

const OFFICE_DATA: Array<{
  region: string;
  team: string;
  officeNumber: string;
  name: string;
  officeType: string | null;
}> = [
  // ── Island ──────────────────────────────────────────────────────────────
  { region: 'Island',   team: 'VI South',        officeNumber: '106', name: 'ACEH',               officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI South',        officeNumber: '106', name: 'Victoria',            officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North',officeNumber: '129', name: 'Duncan',              officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North',officeNumber: '132', name: 'Nanaimo',             officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North',officeNumber: '138', name: 'Port Alberni',        officeType: 'SBC'   },
  { region: 'Island',   team: 'VI Central North',officeNumber: '139', name: 'Courtenay/Comox',     officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North',officeNumber: '143', name: 'Campbell River',      officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North',officeNumber: '144', name: 'Port Hardy',          officeType: 'SBC'   },
  // ── Vancouver ───────────────────────────────────────────────────────────
  { region: 'Vancouver',team: 'Van North',       officeNumber: '141', name: 'Power River',         officeType: 'SBC'   },
  { region: 'Vancouver',team: 'Van DTES',        officeNumber: '251', name: 'Vancouver Dockside',  officeType: null    },
  { region: 'Vancouver',team: 'Van DTES',        officeNumber: '253', name: 'Vancouver Strathcona',officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van DTES',        officeNumber: '254', name: 'Vancouver Kiwassa',   officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van DTES',        officeNumber: '256', name: 'Vancouver Grandview', officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van DTES',        officeNumber: '265', name: 'Vancouver Mountainview',officeType: null  },
  { region: 'Vancouver',team: 'Van North',       officeNumber: '262', name: 'Vancouver West End',  officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van North',       officeNumber: '270', name: 'North Vancouver',     officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van North',       officeNumber: '272', name: 'Sechelt',             officeType: 'SBC'   },
  { region: 'Vancouver',team: 'Van North',       officeNumber: '281', name: 'Squamish',            officeType: 'SBC'   },
  { region: 'Vancouver',team: 'Van South',       officeNumber: '280', name: 'Richmond',            officeType: 'MSDPR' },
  // ── Fraser ──────────────────────────────────────────────────────────────
  { region: 'Fraser',   team: 'Fraser North',    officeNumber: '313', name: 'Burnaby',                      officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser North',    officeNumber: '315', name: 'New Westminster',              officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser North',    officeNumber: '328', name: 'Langley',                      officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser North',    officeNumber: '335', name: 'Maple Ridge',                  officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser North',    officeNumber: '337', name: 'Port Coquitlam/Tri-Cities',    officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser Surrey',   officeNumber: '322', name: 'Surrey North',                 officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser Surrey',   officeNumber: '326', name: 'Surrey Park Place',            officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser Surrey',   officeNumber: '350', name: 'Surrey Lower Mainland',        officeType: 'Contact Centre' },
  { region: 'Fraser',   team: 'Fraser South',    officeNumber: '330', name: 'Abbotsford',                   officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser South',    officeNumber: '331', name: 'Chilliwack',                   officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser South',    officeNumber: '333', name: 'Hope',                         officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser South',    officeNumber: '334', name: 'Mission',                      officeType: 'MSDPR'          },
  // ── Interior ────────────────────────────────────────────────────────────
  { region: 'Interior', team: 'Interior South',  officeNumber: '403', name: 'Kelowna Landmark',   officeType: 'Regional Office' },
  { region: 'Interior', team: 'Interior South',  officeNumber: '411', name: 'Cranbrook',           officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior South',  officeNumber: '420', name: 'Grand Forks',         officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior South',  officeNumber: '421', name: 'Trail',               officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior South',  officeNumber: '422', name: 'Nelson',              officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior South',  officeNumber: '431', name: 'Oliver',              officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior South',  officeNumber: '432', name: 'Penticton',           officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior South',  officeNumber: '433', name: 'West Kelowna',        officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior North',  officeNumber: '460', name: 'Vernon',              officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior North',  officeNumber: '463', name: 'Salmon Arm',          officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior North',  officeNumber: '471', name: 'Kamloops South',      officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior North',  officeNumber: '472', name: 'Kamloops North',      officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior North',  officeNumber: '474', name: 'Merrit',              officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior North',  officeNumber: '480', name: '100 Mile House',      officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior North',  officeNumber: '481', name: 'Williams Lake',       officeType: 'MSDPR' },
  // ── Northern ────────────────────────────────────────────────────────────
  { region: 'Northern', team: 'North',           officeNumber: '482', name: 'Quesnel',             officeType: 'SBC'            },
  { region: 'Northern', team: 'North',           officeNumber: '509', name: 'Houston',             officeType: 'SBC'            },
  { region: 'Northern', team: 'North',           officeNumber: '511', name: 'Dawson Creek',        officeType: 'SBC'            },
  { region: 'Northern', team: 'North',           officeNumber: '583', name: 'Prince George',       officeType: 'Contact Centre' },
  { region: 'Northern', team: 'North',           officeNumber: '585', name: 'Prince George',       officeType: 'MSDPR'          },
  { region: 'Northern', team: 'North',           officeNumber: '589', name: 'Smithers',            officeType: 'SBC'            },
  { region: 'Northern', team: 'North',           officeNumber: '594', name: 'Terrace',             officeType: 'SBC'            },
];

// Products structured as category → [regular items]
// "Other <Category>" entries are seeded with isOther = true
const PRODUCT_DATA: Array<{
  category: string;
  sortOrder: number;
  items: string[];
}> = [
  {
    category: 'Cereal Bar/Snack',
    sortOrder: 1,
    items: ['Apple', 'Blueberry', 'TeaCookies'],
  },
  {
    category: 'Clothing Item',
    sortOrder: 2,
    items: [
      'Socks',
      'UnderwearMenS', 'UnderwearMenM', 'UnderwearMenL', 'UnderwearMenXL',
      'UnderwearWomenS', 'UnderwearWomenM', 'UnderwearWomenL', 'UnderwearWomenXl',
      'WinterGloves',
      'RainPoncho',
    ],
  },
  {
    category: 'Ensure',
    sortOrder: 3,
    items: ['Chocolate', 'Strawberry', 'Vanilla'],
  },
  {
    category: 'Fire Safety Item',
    sortOrder: 4,
    items: ['Co2Monitors', 'FireBlanket', 'FireExtinguisher', 'FireRetardantTarp', 'PortableLantern'],
  },
  {
    category: 'Fruit Cup',
    sortOrder: 5,
    items: ['FruitSalad', 'MandarinOranges', 'Peaches', 'Pears'],
  },
  {
    category: 'Hygiene Item',
    sortOrder: 6,
    items: ['Deoderant', 'Toothbrush', 'Toothpaste'],
  },
  {
    category: 'Juice',
    sortOrder: 7,
    items: ['Apple', 'BerryFusion', 'OrangePeach'],
  },
  {
    category: 'Menstrual Product',
    sortOrder: 8,
    items: ['OvernightPads', 'TamponRegular', 'TamponSuper', 'UltraThin'],
  },
  {
    category: 'Misc. Item',
    sortOrder: 9,
    items: ['FirstAidKit', 'HandWarmers', 'LiceTreatment', 'ScabiesTreatment', 'Spoons', 'ZiplocBag'],
  },
];

// ─── Run seed ─────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding reference data...\n');

  // ── Regions & Teams ────────────────────────────────────────────────────
  const regionIds: Record<string, string> = {};
  const teamIds: Record<string, string>   = {};

  const uniqueRegions = [...new Set(OFFICE_DATA.map((o) => o.region))];
  for (const region of uniqueRegions) {
    regionIds[region] = upsertRegion(region);
  }
  console.log(`  ✓ ${uniqueRegions.length} regions`);

  const uniqueTeams = [
    ...new Map(OFFICE_DATA.map((o) => [o.team, o])).values(),
  ];
  for (const { region, team } of uniqueTeams) {
    teamIds[team] = upsertTeam(regionIds[region], team);
  }
  console.log(`  ✓ ${uniqueTeams.length} teams`);

  // ── Offices ────────────────────────────────────────────────────────────
  for (const office of OFFICE_DATA) {
    upsertOffice(
      teamIds[office.team],
      regionIds[office.region],
      office.officeNumber,
      office.name,
      office.officeType,
    );
  }
  console.log(`  ✓ ${OFFICE_DATA.length} offices`);

  // ── Product categories & products ──────────────────────────────────────
  let totalProducts = 0;
  for (const { category, sortOrder, items } of PRODUCT_DATA) {
    const catId = upsertCategory(category, sortOrder);
    // Regular items
    for (const item of items) {
      upsertProduct(catId, item, false);
    }
    // "Other" catch-all per category
    upsertProduct(catId, `Other ${category}`, true);
    totalProducts += items.length + 1;
  }
  console.log(`  ✓ ${PRODUCT_DATA.length} categories, ${totalProducts} products`);

  console.log('\n✅ Seed complete.');
  sqlite.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
