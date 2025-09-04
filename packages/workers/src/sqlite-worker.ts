import type { 
  AnyWorkerMessage, 
  WorkerMessage,
  WorkerResponse,
  HelvaultLoadedResponse,
  CardsQueryResponse,
  InventoryQueryResponse,
  LoadHelvaultMessage
} from './types.js';
import type { HelvaultExport, InventoryItem, InventoryAggregate, Collection, Card } from '@bag-of-holding/core';

// Import sql.js dynamically in worker context
let SQL: any = null;

async function initSqlJs() {
  if (!SQL) {
    // Import sql.js - in a web worker context, this would need the WASM file
    const sqlJsModule = await import('sql.js');
    SQL = await (sqlJsModule.default as any)({
      // In browser, would need: locateFile: (file) => `/path/to/${file}`
    });
  }
  return SQL;
}

/**
 * SQLite Worker implementation for Helvault .helvault files
 * 
 * This worker loads and parses Helvault SQLite exports using sql.js,
 * extracts inventory data with proper joins, and returns both raw rows
 * and aggregated data.
 */

// Global state - the loaded SQLite database
let database: any = null;
let helvaultData: HelvaultExport | null = null;

// Listen for messages from main thread
self.onmessage = function(event: MessageEvent<AnyWorkerMessage>) {
  const message = event.data;
  
  switch (message.type) {
    case 'load-helvault':
      handleLoadHelvault(message);
      break;
      
    case 'query-cards':
      handleQueryCards(message);
      break;
      
    case 'query-inventory':
      handleQueryInventory(message);
      break;
      
    default:
      sendError((message as WorkerMessage).id, `Unknown message type: ${(message as WorkerMessage).type}`);
  }
};

async function handleLoadHelvault(message: LoadHelvaultMessage) {
  try {
    // Initialize sql.js
    const sqlJs = await initSqlJs();
    
    // Load the .helvault file from ArrayBuffer
    const fileBuffer = new Uint8Array(message.payload.file);
    database = new sqlJs.Database(fileBuffer);
    
    // Query collections from ZPERSISTEDBINDER
    const collectionsStmt = database.prepare(`
      SELECT Z_PK, ZBINDERID, ZNAME, ZPRIORITY
      FROM ZPERSISTEDBINDER
      ORDER BY ZPRIORITY
    `);
    
    const collections: Collection[] = [];
    while (collectionsStmt.step()) {
      const row = collectionsStmt.getAsObject();
      collections.push({
        id: Buffer.from(row.ZBINDERID as Uint8Array).toString('base64'),
        name: row.ZNAME as string,
        priority: row.ZPRIORITY as number
      });
    }
    collectionsStmt.free();
    
    // Query cards from ZPERSISTEDCARD
    const cardsStmt = database.prepare(`
      SELECT ZSCRYFALLID, ZORACLEID, ZNAME, ZSET, ZCOLLECTORNUMBER, 
             ZLANG, ZRARITY, ZMANACOST, ZCMC, ZTYPELINE
      FROM ZPERSISTEDCARD
    `);
    
    const cards: Card[] = [];
    while (cardsStmt.step()) {
      const row = cardsStmt.getAsObject();
      cards.push({
        scryfall_id: row.ZSCRYFALLID as string,
        oracle_id: row.ZORACLEID as string,
        name: row.ZNAME as string,
        set: row.ZSET as string,
        collector_number: row.ZCOLLECTORNUMBER as string,
        lang: row.ZLANG as string,
        finishes: [row.ZFINISH as string || 'nonfoil'], // Will be properly handled in inventory query
        rarity: row.ZRARITY as string,
        mana_cost: row.ZMANACOST as string,
        cmc: row.ZCMC as number,
        colors: [], // TODO: Parse from mana cost or add color columns
        type_line: row.ZTYPELINE as string
      });
    }
    cardsStmt.free();
    
    // Query inventory with joins - raw per-copy rows
    const inventoryStmt = database.prepare(`
      SELECT 
        c.ZSCRYFALLID,
        c.ZSET, 
        c.ZCOLLECTORNUMBER,
        c.ZLANG,
        copy.ZFINISH,
        b.ZBINDERID,
        copy.ZCOPIES
      FROM ZPERSISTEDCOPY copy
      JOIN ZPERSISTEDCARD c ON copy.ZCARD = c.Z_PK
      JOIN ZPERSISTEDBINDER b ON copy.ZBINDER = b.Z_PK
    `);
    
    const inventoryRows: InventoryItem[] = [];
    while (inventoryStmt.step()) {
      const row = inventoryStmt.getAsObject();
      inventoryRows.push({
        scryfall_id: row.ZSCRYFALLID as string,
        set: row.ZSET as string,
        collector_number: row.ZCOLLECTORNUMBER as string,
        lang: row.ZLANG as string,
        finishes: [row.ZFINISH as string],
        collection_id: Buffer.from(row.ZBINDERID as Uint8Array).toString('base64'),
        copies: row.ZCOPIES as number
      });
    }
    inventoryStmt.free();
    
    // Create aggregates - grouped by (scryfall_id, set, collector_number, lang, finishes, collection)
    const aggregatesStmt = database.prepare(`
      SELECT 
        c.ZSCRYFALLID,
        c.ZSET,
        c.ZCOLLECTORNUMBER,
        c.ZLANG,
        copy.ZFINISH,
        b.ZNAME as collection_name,
        SUM(copy.ZCOPIES) as total_copies
      FROM ZPERSISTEDCOPY copy
      JOIN ZPERSISTEDCARD c ON copy.ZCARD = c.Z_PK
      JOIN ZPERSISTEDBINDER b ON copy.ZBINDER = b.Z_PK
      GROUP BY c.ZSCRYFALLID, c.ZSET, c.ZCOLLECTORNUMBER, c.ZLANG, copy.ZFINISH, b.ZNAME
    `);
    
    const aggregates: InventoryAggregate[] = [];
    while (aggregatesStmt.step()) {
      const row = aggregatesStmt.getAsObject();
      aggregates.push({
        scryfall_id: row.ZSCRYFALLID as string,
        set: row.ZSET as string,
        collector_number: row.ZCOLLECTORNUMBER as string,
        lang: row.ZLANG as string,
        finishes: [row.ZFINISH as string],
        collection: row.collection_name as string,
        copies: row.total_copies as number
      });
    }
    aggregatesStmt.free();
    
    // Store the parsed data
    helvaultData = {
      collections,
      cards,
      inventory: inventoryRows
    };

    const response: HelvaultLoadedResponse = {
      id: message.id,
      type: 'helvault-loaded',
      payload: {
        inventoryRows,
        aggregates,
        collections: collections.length,
        cards: cards.length
      }
    };

    self.postMessage(response);
    
  } catch (error) {
    sendError(message.id, `Failed to load Helvault: ${error}`);
  }
}

async function handleQueryCards(message: AnyWorkerMessage) {
  try {
    if (!helvaultData) {
      throw new Error('No Helvault data loaded');
    }

    // In real implementation, would execute SQL query with filters
    const response: CardsQueryResponse = {
      id: message.id,
      type: 'cards-query-result',
      payload: {
        cards: helvaultData.cards,
        total: helvaultData.cards.length
      }
    };

    self.postMessage(response);
    
  } catch (error) {
    sendError(message.id, `Failed to query cards: ${error}`);
  }
}

async function handleQueryInventory(message: AnyWorkerMessage) {
  try {
    if (!helvaultData) {
      throw new Error('No Helvault data loaded');
    }

    // In real implementation, would execute SQL query with collection filter
    const response: InventoryQueryResponse = {
      id: message.id,
      type: 'inventory-query-result',
      payload: {
        inventory: helvaultData.inventory
      }
    };

    self.postMessage(response);
    
  } catch (error) {
    sendError(message.id, `Failed to query inventory: ${error}`);
  }
}

function sendError(id: string, error: string) {
  const response: WorkerResponse = {
    id,
    type: 'error',
    error
  };
  self.postMessage(response);
}