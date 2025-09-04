// SQLite Worker for Helvault files - using local sql.js module

let SQL = null;

async function initSqlJs() {
  if (!SQL) {
    try {
      // Use the sql.js that's available locally - since we added it to dependencies
      // For ES module workers, import sql.js directly from node_modules
      const sqlJsModule = await import('sql.js');
      
      // Initialize sql.js with WASM file configuration
      SQL = await sqlJsModule.default({
        locateFile: (file) => {
          // We need to provide the path to the WASM files
          // In development, they should be in the public directory
          return `/sql/${file}`;
        }
      });
      
    } catch (error) {
      console.error('Failed to initialize sql.js:', error);
      throw error;
    }
  }
  return SQL;
}

self.onmessage = async function(event) {
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
      
      const collections = [];
      while (collectionsStmt.step()) {
        const row = collectionsStmt.getAsObject();
        collections.push({
          id: btoa(String.fromCharCode(...new Uint8Array(row.ZBINDERID))),
          name: row.ZNAME,
          priority: row.ZPRIORITY
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
      
      const inventoryRows = [];
      while (inventoryStmt.step()) {
        const row = inventoryStmt.getAsObject();
        
        // Ensure we have either scryfall_id or oracle_id
        const scryfallId = row.ZSCRYFALLID;
        const oracleId = row.ZORACLEID;
        if (!scryfallId && !oracleId) {
          console.warn('Skipping inventory row without scryfall_id or oracle_id');
          continue;
        }
        
        inventoryRows.push({
          scryfall_id: scryfallId || oracleId, // Use oracle_id as fallback
          set: row.ZSET,
          collector_number: row.ZCOLLECTORNUMBER,
          lang: row.ZLANG,
          finishes: [row.ZFINISH],
          collection_id: btoa(String.fromCharCode(...new Uint8Array(row.ZBINDERID))),
          copies: row.ZCOPIES
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
      
      const aggregates = [];
      while (aggregatesStmt.step()) {
        const row = aggregatesStmt.getAsObject();
        
        // Ensure we have either scryfall_id or oracle_id
        const scryfallId = row.ZSCRYFALLID;
        const oracleId = row.ZORACLEID;
        if (!scryfallId && !oracleId) {
          console.warn('Skipping aggregate row without scryfall_id or oracle_id');
          continue;
        }
        
        aggregates.push({
          scryfall_id: scryfallId || oracleId, // Use oracle_id as fallback
          set: row.ZSET,
          collector_number: row.ZCOLLECTORNUMBER,
          lang: row.ZLANG,
          finishes: [row.ZFINISH],
          collection: row.collection_name,
          copies: row.total_copies
        });
      }
      aggregatesStmt.free();
      
      // Send response
      const response = {
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
    const response = {
      id: message.id,
      type: 'error',
      error: `Failed to load Helvault: ${error}`
    };
    self.postMessage(response);
  }
};