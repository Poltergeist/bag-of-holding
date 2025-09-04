// Import sql.js dynamically in worker context
let SQL = null;
async function initSqlJs() {
    if (!SQL) {
        // Import sql.js - in a web worker context, this would need the WASM file
        const sqlJsModule = await import('sql.js');
        SQL = await sqlJsModule.default({
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
let database = null;
let helvaultData = null;
// Listen for messages from main thread
self.onmessage = function (event) {
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
            sendError(message.id, `Unknown message type: ${message.type}`);
    }
};
async function handleLoadHelvault(message) {
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
        const collections = [];
        while (collectionsStmt.step()) {
            const row = collectionsStmt.getAsObject();
            collections.push({
                id: Buffer.from(row.ZBINDERID).toString('base64'),
                name: row.ZNAME,
                priority: row.ZPRIORITY
            });
        }
        collectionsStmt.free();
        // Query cards from ZPERSISTEDCARD
        const cardsStmt = database.prepare(`
      SELECT ZSCRYFALLID, ZORACLEID, ZNAME, ZSET, ZCOLLECTORNUMBER, 
             ZLANG, ZRARITY, ZMANACOST, ZCMC, ZTYPELINE
      FROM ZPERSISTEDCARD
    `);
        const cards = [];
        while (cardsStmt.step()) {
            const row = cardsStmt.getAsObject();
            cards.push({
                scryfall_id: row.ZSCRYFALLID,
                oracle_id: row.ZORACLEID,
                name: row.ZNAME,
                set: row.ZSET,
                collector_number: row.ZCOLLECTORNUMBER,
                lang: row.ZLANG,
                finishes: [row.ZFINISH || 'nonfoil'], // Will be properly handled in inventory query
                rarity: row.ZRARITY,
                mana_cost: row.ZMANACOST,
                cmc: row.ZCMC,
                colors: [], // TODO: Parse from mana cost or add color columns
                type_line: row.ZTYPELINE
            });
        }
        cardsStmt.free();
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
                collection_id: Buffer.from(row.ZBINDERID).toString('base64'),
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
        // Store the parsed data
        helvaultData = {
            collections,
            cards,
            inventory: inventoryRows
        };
        const response = {
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
    }
    catch (error) {
        sendError(message.id, `Failed to load Helvault: ${error}`);
    }
}
async function handleQueryCards(message) {
    try {
        if (!helvaultData) {
            throw new Error('No Helvault data loaded');
        }
        // In real implementation, would execute SQL query with filters
        const response = {
            id: message.id,
            type: 'cards-query-result',
            payload: {
                cards: helvaultData.cards,
                total: helvaultData.cards.length
            }
        };
        self.postMessage(response);
    }
    catch (error) {
        sendError(message.id, `Failed to query cards: ${error}`);
    }
}
async function handleQueryInventory(message) {
    try {
        if (!helvaultData) {
            throw new Error('No Helvault data loaded');
        }
        // In real implementation, would execute SQL query with collection filter
        const response = {
            id: message.id,
            type: 'inventory-query-result',
            payload: {
                inventory: helvaultData.inventory
            }
        };
        self.postMessage(response);
    }
    catch (error) {
        sendError(message.id, `Failed to query inventory: ${error}`);
    }
}
function sendError(id, error) {
    const response = {
        id,
        type: 'error',
        error
    };
    self.postMessage(response);
}
export {};
