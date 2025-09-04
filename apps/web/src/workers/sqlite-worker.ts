// SQLite Worker for Helvault files - using Vite worker support

// Import sql.js via CDN to avoid bundling issues
declare const importScripts: (url: string) => void;

let SQL: any = null;

interface WorkerMessage {
  id: string;
  type: string;
  payload?: any;
}

interface WorkerResponse {
  id: string;
  type: string;
  payload?: any;
  error?: string;
}

async function initSqlJs() {
  if (!SQL) {
    // Use importScripts to load sql.js from CDN
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-asm.js');
    
    // @ts-ignore - sql.js creates a global initSqlJs function
    SQL = await initSqlJs();
  }
  return SQL;
}

self.onmessage = async function(event: MessageEvent<WorkerMessage>) {
  const message = event.data;
  
  try {
    if (message.type === 'load-helvault') {
      // Initialize sql.js
      const sqlJs = await initSqlJs();
      
      // Load the .helvault file from ArrayBuffer
      const fileBuffer = new Uint8Array(message.payload.file);
      const database = new sqlJs.Database(fileBuffer);
      
      // Query collections from ZPERSISTEDBINDER
      const collectionsStmt = database.prepare(`
        SELECT Z_PK, ZBINDERID, ZNAME, ZPRIORITY
        FROM ZPERSISTEDBINDER
        ORDER BY ZPRIORITY
      `);
      
      const collections: any[] = [];
      while (collectionsStmt.step()) {
        const row = collectionsStmt.getAsObject();
        collections.push({
          id: btoa(String.fromCharCode(...new Uint8Array(row.ZBINDERID as ArrayBuffer))),
          name: row.ZNAME as string,
          priority: row.ZPRIORITY as number
        });
      }
      collectionsStmt.free();
      
      // Query inventory with joins - raw per-copy rows
      const inventoryStmt = database.prepare(`
        SELECT 
          c.ZSCRYFALLID,
          c.ZORACLEID,
          c.ZSET, 
          c.ZCOLLECTORNUMBER,
          c.ZLANG,
          copy.ZFINISH,
          b.ZBINDERID,
          b.ZNAME as collection_name,
          copy.ZCOPIES
        FROM ZPERSISTEDCOPY copy
        JOIN ZPERSISTEDCARD c ON copy.ZCARD = c.Z_PK
        JOIN ZPERSISTEDBINDER b ON copy.ZBINDER = b.Z_PK
      `);
      
      const inventoryRows: any[] = [];
      while (inventoryStmt.step()) {
        const row = inventoryStmt.getAsObject();
        
        // Ensure we have either scryfall_id or oracle_id
        const scryfallId = row.ZSCRYFALLID as string;
        const oracleId = row.ZORACLEID as string;
        if (!scryfallId && !oracleId) {
          console.warn('Skipping inventory row without scryfall_id or oracle_id');
          continue;
        }
        
        inventoryRows.push({
          scryfall_id: scryfallId || oracleId, // Use oracle_id as fallback
          set: row.ZSET as string,
          collector_number: row.ZCOLLECTORNUMBER as string,
          lang: row.ZLANG as string,
          finishes: [row.ZFINISH as string],
          collection_id: btoa(String.fromCharCode(...new Uint8Array(row.ZBINDERID as ArrayBuffer))),
          copies: row.ZCOPIES as number
        });
      }
      inventoryStmt.free();
      
      // Create aggregates - grouped by (scryfall_id, set, collector_number, lang, finishes, collection)
      const aggregatesStmt = database.prepare(`
        SELECT 
          c.ZSCRYFALLID,
          c.ZORACLEID,
          c.ZSET,
          c.ZCOLLECTORNUMBER,
          c.ZLANG,
          copy.ZFINISH,
          b.ZNAME as collection_name,
          SUM(copy.ZCOPIES) as total_copies
        FROM ZPERSISTEDCOPY copy
        JOIN ZPERSISTEDCARD c ON copy.ZCARD = c.Z_PK
        JOIN ZPERSISTEDBINDER b ON copy.ZBINDER = b.Z_PK
        GROUP BY c.ZSCRYFALLID, c.ZORACLEID, c.ZSET, c.ZCOLLECTORNUMBER, c.ZLANG, copy.ZFINISH, b.ZNAME
      `);
      
      const aggregates: any[] = [];
      while (aggregatesStmt.step()) {
        const row = aggregatesStmt.getAsObject();
        
        // Ensure we have either scryfall_id or oracle_id
        const scryfallId = row.ZSCRYFALLID as string;
        const oracleId = row.ZORACLEID as string;
        if (!scryfallId && !oracleId) {
          console.warn('Skipping aggregate row without scryfall_id or oracle_id');
          continue;
        }
        
        aggregates.push({
          scryfall_id: scryfallId || oracleId, // Use oracle_id as fallback
          set: row.ZSET as string,
          collector_number: row.ZCOLLECTORNUMBER as string,
          lang: row.ZLANG as string,
          finishes: [row.ZFINISH as string],
          collection: row.collection_name as string,
          copies: row.total_copies as number
        });
      }
      aggregatesStmt.free();
      
      // Send response
      const response: WorkerResponse = {
        id: message.id,
        type: 'helvault-loaded',
        payload: {
          inventoryRows,
          aggregates,
          collections: collections.length,
          cards: 0 // Simplified for now
        }
      };

      self.postMessage(response);
      
      // Clean up database
      database.close();
    }
  } catch (error) {
    const response: WorkerResponse = {
      id: message.id,
      type: 'error',
      error: `Failed to load Helvault: ${error}`
    };
    self.postMessage(response);
  }
};