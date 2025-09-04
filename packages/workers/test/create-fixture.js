// Script to create a test .helvault fixture SQLite database
// This mimics the Core Data schema that Helvault would export

import Database from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize sql.js
const SQL = await Database({
  // In a real worker, we'd need the WASM binary path
  // For now, this script runs in Node.js
});

const db = new SQL.Database();

// Create Core Data-style tables that would be in a Helvault export
// Note: Core Data uses Z-prefixed table names and specific column patterns

// ZPERSISTEDBINDER represents collections/binders
db.run(`
  CREATE TABLE ZPERSISTEDBINDER (
    Z_PK INTEGER PRIMARY KEY,
    ZBINDERID BLOB,
    ZNAME TEXT,
    ZPRIORITY INTEGER
  )
`);

// ZPERSISTEDCARD represents card data
db.run(`
  CREATE TABLE ZPERSISTEDCARD (
    Z_PK INTEGER PRIMARY KEY,
    ZSCRYFALLID TEXT,
    ZORACLEID TEXT,
    ZNAME TEXT,
    ZSET TEXT,
    ZCOLLECTORNUMBER TEXT,
    ZLANG TEXT,
    ZRARITY TEXT,
    ZMANACOST TEXT,
    ZCMC INTEGER,
    ZTYPELINE TEXT
  )
`);

// ZPERSISTEDCARDFACE for split/transform cards (simplified)
db.run(`
  CREATE TABLE ZPERSISTEDCARDFACE (
    Z_PK INTEGER PRIMARY KEY,
    ZCARD INTEGER,
    ZNAME TEXT,
    ZMANACOST TEXT,
    ZTYPELINE TEXT,
    FOREIGN KEY (ZCARD) REFERENCES ZPERSISTEDCARD(Z_PK)
  )
`);

// ZPERSISTEDCOPY represents individual copies/inventory items
db.run(`
  CREATE TABLE ZPERSISTEDCOPY (
    Z_PK INTEGER PRIMARY KEY,
    ZCARD INTEGER,
    ZBINDER INTEGER,
    ZFINISH TEXT,
    ZCOPIES INTEGER,
    FOREIGN KEY (ZCARD) REFERENCES ZPERSISTEDCARD(Z_PK),
    FOREIGN KEY (ZBINDER) REFERENCES ZPERSISTEDBINDER(Z_PK)
  )
`);

// Insert test data
// Collections
const binder1Id = Buffer.from('collection-1', 'utf8');
const binder2Id = Buffer.from('collection-2', 'utf8');

db.run(`INSERT INTO ZPERSISTEDBINDER (Z_PK, ZBINDERID, ZNAME, ZPRIORITY) VALUES (1, ?, 'Main Collection', 1)`, [binder1Id]);
db.run(`INSERT INTO ZPERSISTEDBINDER (Z_PK, ZBINDERID, ZNAME, ZPRIORITY) VALUES (2, ?, 'Foils', 2)`, [binder2Id]);

// Cards
db.run(`
  INSERT INTO ZPERSISTEDCARD (Z_PK, ZSCRYFALLID, ZORACLEID, ZNAME, ZSET, ZCOLLECTORNUMBER, ZLANG, ZRARITY, ZMANACOST, ZCMC, ZTYPELINE)
  VALUES (1, 'scryfall-lightning-bolt', 'oracle-lightning-bolt', 'Lightning Bolt', 'lea', '161', 'en', 'common', '{R}', 1, 'Instant')
`);

db.run(`
  INSERT INTO ZPERSISTEDCARD (Z_PK, ZSCRYFALLID, ZORACLEID, ZNAME, ZSET, ZCOLLECTORNUMBER, ZLANG, ZRARITY, ZMANACOST, ZCMC, ZTYPELINE)
  VALUES (2, 'scryfall-black-lotus', 'oracle-black-lotus', 'Black Lotus', 'lea', '232', 'en', 'rare', '{0}', 0, 'Artifact')
`);

// Inventory copies
db.run(`INSERT INTO ZPERSISTEDCOPY (Z_PK, ZCARD, ZBINDER, ZFINISH, ZCOPIES) VALUES (1, 1, 1, 'nonfoil', 4)`);
db.run(`INSERT INTO ZPERSISTEDCOPY (Z_PK, ZCARD, ZBINDER, ZFINISH, ZCOPIES) VALUES (2, 2, 1, 'nonfoil', 1)`);
db.run(`INSERT INTO ZPERSISTEDCOPY (Z_PK, ZCARD, ZBINDER, ZFINISH, ZCOPIES) VALUES (3, 1, 2, 'foil', 2)`);

// Export the database
const data = db.export();
const fixtureDir = join(__dirname, 'fixtures');
const dbPath = join(fixtureDir, 'test.helvault');

fs.writeFileSync(dbPath, Buffer.from(data));

console.log(`Created fixture database at: ${dbPath}`);
console.log(`Database size: ${data.length} bytes`);

db.close();