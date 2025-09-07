# @bag-of-holding/workers

Web Workers for handling heavy operations in the Bag of Holding application.

## Features

### Helvault SQLite Importer

Import and parse Helvault `.helvault` SQLite files using sql.js in a Web Worker, keeping the main thread responsive.

```typescript
import { createHelvaultClient } from '@bag-of-holding/workers';

// Create a client (this spawns a Web Worker)
const client = createHelvaultClient('/path/to/sqlite-worker.js');

// Load a .helvault file (runs off main thread)
const fileBuffer = ...; // ArrayBuffer from file input
const result = await client.openHelvault(fileBuffer);

console.log('Inventory rows:', result.inventoryRows.length);
console.log('Aggregates:', result.aggregates.length);

// Clean up when done
client.terminate();
```

### API

#### `openHelvault(buffer: ArrayBuffer)`

Loads and parses a Helvault SQLite database, returning both raw inventory rows and aggregated data.

**Parameters:**
- `buffer` - ArrayBuffer containing the .helvault SQLite file

**Returns:**
```typescript
{
  inventoryRows: InventoryItem[];  // Raw per-copy rows
  aggregates: InventoryAggregate[];  // Grouped by (scryfall_id, set, collector_number, lang, finishes, collection)
}
```

**Features:**
- Joins `ZPERSISTEDCARD` + `ZPERSISTEDCOPY` + `ZPERSISTEDBINDER` tables
- Converts binary `ZBINDERID` to base64 collection IDs
- All rows contain `scryfall_id` (or `oracle_id` as fallback) and collection info
- Runs in Web Worker to avoid blocking the main thread

### Database Schema

The importer expects Core Data-style tables from Helvault exports:

- `ZPERSISTEDBINDER` - Collections/binders with priorities
- `ZPERSISTEDCARD` - Card metadata (scryfall_id, name, set, etc.)
- `ZPERSISTEDCOPY` - Individual inventory entries linking cards to collections

### Example Data

See `examples/helvault-example.js` for a complete usage example and `test/fixtures/test.helvault` for a sample database structure.