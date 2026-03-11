/**
 * Database initialisation script — run once when no DB file exists.
 *
 * Uses better-sqlite3 directly (no drizzle-kit, no tsx) so it works in the
 * production image with only `npm ci --omit=dev` dependencies installed.
 *
 * Steps:
 *   1. Apply all SQL migration files in order (split on drizzle's statement-breakpoint marker)
 *   2. Seed reference data (regions, teams, offices, product categories, products)
 */

import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Resolve DB path from DATABASE_URL ─────────────────────────────────────────

const dbPath = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');
console.log(`Initialising database at: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Run migrations ────────────────────────────────────────────────────────────

const migrationsDir = join(__dirname, '..', 'migrations');

const sqlFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort(); // lexicographic order matches drizzle's 0000_, 0001_ naming

console.log(`\nApplying ${sqlFiles.length} migration(s)...`);

for (const file of sqlFiles) {
  const sql = readFileSync(join(migrationsDir, file), 'utf-8');
  // Drizzle separates statements with --> statement-breakpoint
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  db.transaction(() => {
    for (const statement of statements) {
      db.prepare(statement).run();
    }
  })();

  console.log(`  ✓ ${file}`);
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

const now = new Date().toISOString();

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function upsertRegion(name) {
  const slug = slugify(name);
  const existing = db.prepare('SELECT id FROM regions WHERE slug = ?').get(slug);
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare('INSERT INTO regions (id, name, slug, created_at) VALUES (?, ?, ?, ?)').run(id, name, slug, now);
  return id;
}

function upsertTeam(regionId, name) {
  const slug = slugify(name);
  const existing = db.prepare('SELECT id FROM teams WHERE slug = ?').get(slug);
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare('INSERT INTO teams (id, region_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)').run(id, regionId, name, slug, now);
  return id;
}

function upsertOffice(teamId, regionId, officeNumber, name, officeType) {
  const id = randomUUID();
  db.prepare(`
    INSERT OR IGNORE INTO offices (id, team_id, region_id, office_number, name, office_type, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, teamId, regionId, officeNumber, name, officeType, now);
  return db.prepare('SELECT id FROM offices WHERE office_number = ? AND name = ?').get(officeNumber, name).id;
}

function upsertCategory(name, sortOrder) {
  const id = slugify(name);
  db.prepare(`
    INSERT OR IGNORE INTO product_categories (id, name, slug, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, id, sortOrder, now);
  return id;
}

function upsertProduct(categoryId, name, isOther = false) {
  const slug = slugify(name);
  db.prepare(`
    INSERT OR IGNORE INTO products (id, category_id, name, slug, is_other, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(randomUUID(), categoryId, name, slug, isOther ? 1 : 0, now);
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const OFFICE_DATA = [
  // Island
  { region: 'Island',   team: 'VI South',         officeNumber: '106', name: 'ACEH',                officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI South',         officeNumber: '106', name: 'Victoria',             officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North', officeNumber: '129', name: 'Duncan',               officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North', officeNumber: '132', name: 'Nanaimo',              officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North', officeNumber: '138', name: 'Port Alberni',         officeType: 'SBC'   },
  { region: 'Island',   team: 'VI Central North', officeNumber: '139', name: 'Courtenay/Comox',      officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North', officeNumber: '143', name: 'Campbell River',       officeType: 'MSDPR' },
  { region: 'Island',   team: 'VI Central North', officeNumber: '144', name: 'Port Hardy',           officeType: 'SBC'   },
  // Vancouver
  { region: 'Vancouver',team: 'Van North',        officeNumber: '141', name: 'Power River',          officeType: 'SBC'   },
  { region: 'Vancouver',team: 'Van DTES',         officeNumber: '251', name: 'Vancouver Dockside',   officeType: null    },
  { region: 'Vancouver',team: 'Van DTES',         officeNumber: '253', name: 'Vancouver Strathcona', officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van DTES',         officeNumber: '254', name: 'Vancouver Kiwassa',    officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van DTES',         officeNumber: '256', name: 'Vancouver Grandview',  officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van DTES',         officeNumber: '265', name: 'Vancouver Mountainview',officeType: null   },
  { region: 'Vancouver',team: 'Van North',        officeNumber: '262', name: 'Vancouver West End',   officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van North',        officeNumber: '270', name: 'North Vancouver',      officeType: 'MSDPR' },
  { region: 'Vancouver',team: 'Van North',        officeNumber: '272', name: 'Sechelt',              officeType: 'SBC'   },
  { region: 'Vancouver',team: 'Van North',        officeNumber: '281', name: 'Squamish',             officeType: 'SBC'   },
  { region: 'Vancouver',team: 'Van South',        officeNumber: '280', name: 'Richmond',             officeType: 'MSDPR' },
  // Fraser
  { region: 'Fraser',   team: 'Fraser North',     officeNumber: '313', name: 'Burnaby',                      officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser North',     officeNumber: '315', name: 'New Westminster',              officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser North',     officeNumber: '328', name: 'Langley',                      officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser North',     officeNumber: '335', name: 'Maple Ridge',                  officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser North',     officeNumber: '337', name: 'Port Coquitlam/Tri-Cities',    officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser Surrey',    officeNumber: '322', name: 'Surrey North',                 officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser Surrey',    officeNumber: '326', name: 'Surrey Park Place',            officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser Surrey',    officeNumber: '350', name: 'Surrey Lower Mainland',        officeType: 'Contact Centre' },
  { region: 'Fraser',   team: 'Fraser South',     officeNumber: '330', name: 'Abbotsford',                   officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser South',     officeNumber: '331', name: 'Chilliwack',                   officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser South',     officeNumber: '333', name: 'Hope',                         officeType: 'MSDPR'          },
  { region: 'Fraser',   team: 'Fraser South',     officeNumber: '334', name: 'Mission',                      officeType: 'MSDPR'          },
  // Interior
  { region: 'Interior', team: 'Interior South',   officeNumber: '403', name: 'Kelowna Landmark',   officeType: 'Regional Office' },
  { region: 'Interior', team: 'Interior South',   officeNumber: '411', name: 'Cranbrook',           officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior South',   officeNumber: '420', name: 'Grand Forks',         officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior South',   officeNumber: '421', name: 'Trail',               officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior South',   officeNumber: '422', name: 'Nelson',              officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior South',   officeNumber: '431', name: 'Oliver',              officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior South',   officeNumber: '432', name: 'Penticton',           officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior South',   officeNumber: '433', name: 'West Kelowna',        officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior North',   officeNumber: '460', name: 'Vernon',              officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior North',   officeNumber: '463', name: 'Salmon Arm',          officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior North',   officeNumber: '471', name: 'Kamloops South',      officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior North',   officeNumber: '472', name: 'Kamloops North',      officeType: 'MSDPR' },
  { region: 'Interior', team: 'Interior North',   officeNumber: '474', name: 'Merrit',              officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior North',   officeNumber: '480', name: '100 Mile House',      officeType: 'SBC'   },
  { region: 'Interior', team: 'Interior North',   officeNumber: '481', name: 'Williams Lake',       officeType: 'MSDPR' },
  // Northern
  { region: 'Northern', team: 'North',            officeNumber: '482', name: 'Quesnel',             officeType: 'SBC'            },
  { region: 'Northern', team: 'North',            officeNumber: '509', name: 'Houston',             officeType: 'SBC'            },
  { region: 'Northern', team: 'North',            officeNumber: '511', name: 'Dawson Creek',        officeType: 'SBC'            },
  { region: 'Northern', team: 'North',            officeNumber: '583', name: 'Prince George',       officeType: 'Contact Centre' },
  { region: 'Northern', team: 'North',            officeNumber: '585', name: 'Prince George',       officeType: 'MSDPR'          },
  { region: 'Northern', team: 'North',            officeNumber: '589', name: 'Smithers',            officeType: 'SBC'            },
  { region: 'Northern', team: 'North',            officeNumber: '594', name: 'Terrace',             officeType: 'SBC'            },
];

const PRODUCT_DATA = [
  { category: 'Cereal Bar/Snack', sortOrder: 1, items: ['Apple', 'Blueberry', 'TeaCookies'] },
  { category: 'Clothing Item',    sortOrder: 2, items: ['Socks', 'UnderwearMenS', 'UnderwearMenM', 'UnderwearMenL', 'UnderwearMenXL', 'UnderwearWomenS', 'UnderwearWomenM', 'UnderwearWomenL', 'UnderwearWomenXl', 'WinterGloves', 'RainPoncho'] },
  { category: 'Ensure',           sortOrder: 3, items: ['Chocolate', 'Strawberry', 'Vanilla'] },
  { category: 'Fire Safety Item', sortOrder: 4, items: ['Co2Monitors', 'FireBlanket', 'FireExtinguisher', 'FireRetardantTarp', 'PortableLantern'] },
  { category: 'Fruit Cup',        sortOrder: 5, items: ['FruitSalad', 'MandarinOranges', 'Peaches', 'Pears'] },
  { category: 'Hygiene Item',     sortOrder: 6, items: ['Deoderant', 'Toothbrush', 'Toothpaste'] },
  { category: 'Juice',            sortOrder: 7, items: ['Apple', 'BerryFusion', 'OrangePeach'] },
  { category: 'Menstrual Product',sortOrder: 8, items: ['OvernightPads', 'TamponRegular', 'TamponSuper', 'UltraThin'] },
  { category: 'Misc. Item',       sortOrder: 9, items: ['FirstAidKit', 'HandWarmers', 'LiceTreatment', 'ScabiesTreatment', 'Spoons', 'ZiplocBag'] },
];

// ── Run seed ──────────────────────────────────────────────────────────────────

console.log('\nSeeding reference data...');

const regionIds = {};
const teamIds = {};

const uniqueRegions = [...new Set(OFFICE_DATA.map((o) => o.region))];
for (const region of uniqueRegions) regionIds[region] = upsertRegion(region);
console.log(`  ✓ ${uniqueRegions.length} regions`);

const uniqueTeams = [...new Map(OFFICE_DATA.map((o) => [o.team, o])).values()];
for (const { region, team } of uniqueTeams) teamIds[team] = upsertTeam(regionIds[region], team);
console.log(`  ✓ ${uniqueTeams.length} teams`);

for (const o of OFFICE_DATA) upsertOffice(teamIds[o.team], regionIds[o.region], o.officeNumber, o.name, o.officeType);
console.log(`  ✓ ${OFFICE_DATA.length} offices`);

let totalProducts = 0;
for (const { category, sortOrder, items } of PRODUCT_DATA) {
  const catId = upsertCategory(category, sortOrder);
  for (const item of items) upsertProduct(catId, item, false);
  upsertProduct(catId, `Other ${category}`, true);
  totalProducts += items.length + 1;
}
console.log(`  ✓ ${PRODUCT_DATA.length} categories, ${totalProducts} products`);

db.close();
console.log('\nDatabase initialised successfully.');
