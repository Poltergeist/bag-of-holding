import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'sql.js';

// Helper function to convert Uint8Array to base64 in browser environment
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Helvault SQLite Schema', () => {
  let db: Database.Database;

  beforeEach(async () => {
    // Load test fixture
    const fixturePath = join(__dirname, '../test/fixtures', 'test.helvault');
    const fileBuffer = readFileSync(fixturePath);
    
    const SQL = await Database({});
    db = new SQL.Database(fileBuffer);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('should have fixture database with test data', () => {
    // Verify the database has the expected tables
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables[0]?.values.flat() || [];
    
    expect(tableNames).toContain('ZPERSISTEDBINDER');
    expect(tableNames).toContain('ZPERSISTEDCARD');
    expect(tableNames).toContain('ZPERSISTEDCOPY');
  });

  it('should return >0 collections from ZPERSISTEDBINDER', () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM ZPERSISTEDBINDER');
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    
    expect(result.count).toBeGreaterThan(0);
  });

  it('should return >0 cards from ZPERSISTEDCARD', () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM ZPERSISTEDCARD');
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    
    expect(result.count).toBeGreaterThan(0);
  });

  it('should return >0 inventory from ZPERSISTEDCOPY', () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM ZPERSISTEDCOPY');
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    
    expect(result.count).toBeGreaterThan(0);
  });

  it('should join inventory with cards and collections', () => {
    const stmt = db.prepare(`
      SELECT 
        c.ZSCRYFALLID,
        c.ZSET, 
        c.ZCOLLECTORNUMBER,
        c.ZLANG,
        copy.ZFINISH,
        b.ZNAME as collection_name,
        copy.ZCOPIES
      FROM ZPERSISTEDCOPY copy
      JOIN ZPERSISTEDCARD c ON copy.ZCARD = c.Z_PK
      JOIN ZPERSISTEDBINDER b ON copy.ZBINDER = b.Z_PK
      LIMIT 5
    `);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    expect(results.length).toBeGreaterThan(0);
    
    for (const row of results) {
      expect(row.ZSCRYFALLID).toBeTruthy();
      expect(row.collection_name).toBeTruthy();
      expect(row.ZCOPIES).toBeGreaterThan(0);
    }
  });

  it('should create aggregates grouped by card and collection', () => {
    const stmt = db.prepare(`
      SELECT 
        c.ZSCRYFALLID,
        c.ZSET,
        c.ZCOLLECTORNUMBER,
        c.ZLANG,
        copy.ZFINISH,
        b.ZNAME as collection_name,
        SUM(copy.ZCOPIES) as total_copies,
        COUNT(*) as row_count
      FROM ZPERSISTEDCOPY copy
      JOIN ZPERSISTEDCARD c ON copy.ZCARD = c.Z_PK
      JOIN ZPERSISTEDBINDER b ON copy.ZBINDER = b.Z_PK
      GROUP BY c.ZSCRYFALLID, c.ZSET, c.ZCOLLECTORNUMBER, c.ZLANG, copy.ZFINISH, b.ZNAME
    `);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    expect(results.length).toBeGreaterThan(0);
    
    for (const row of results) {
      expect(row.ZSCRYFALLID).toBeTruthy();
      expect(row.collection_name).toBeTruthy();
      expect(row.total_copies).toBeGreaterThan(0);
    }
  });

  it('should convert ZBINDERID blob to base64', () => {
    const stmt = db.prepare('SELECT ZBINDERID FROM ZPERSISTEDBINDER LIMIT 1');
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();

    const binderIdBuffer = result.ZBINDERID as Uint8Array;
    const base64Id = uint8ArrayToBase64(binderIdBuffer);
    
    expect(base64Id).toBeTruthy();
    expect(typeof base64Id).toBe('string');
  });

  it('should ensure all inventory rows have scryfall_id and collection info', () => {
    const stmt = db.prepare(`
      SELECT 
        c.ZSCRYFALLID,
        c.ZORACLEID,
        b.ZNAME as collection_name,
        b.ZBINDERID
      FROM ZPERSISTEDCOPY copy
      JOIN ZPERSISTEDCARD c ON copy.ZCARD = c.Z_PK
      JOIN ZPERSISTEDBINDER b ON copy.ZBINDER = b.Z_PK
    `);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    expect(results.length).toBeGreaterThan(0);
    
    for (const row of results) {
      // Every row should have scryfall_id OR oracle_id
      expect(row.ZSCRYFALLID || row.ZORACLEID).toBeTruthy();
      // Every row should have collection info
      expect(row.collection_name).toBeTruthy();
      expect(row.ZBINDERID).toBeTruthy();
    }
  });
});