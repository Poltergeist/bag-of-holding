/**
 * Example usage of the Helvault importer
 * Demonstrates how to use the openHelvault API and verify it runs off the main thread
 */
import { createHelvaultClient } from '@bag-of-holding/workers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function example() {
  console.log('🎒 Helvault Importer Example');
  console.log('============================');

  try {
    // In a real application, this would be a URL to the worker script in the web app
    const workerUrl = new URL('../dist/src/sqlite-worker.js', import.meta.url).href;
    
    // Create the Helvault client (this creates a Web Worker)
    const client = createHelvaultClient(workerUrl);
    
    // Load a test .helvault file
    const fixturePath = join(__dirname, '../test/fixtures/test.helvault');
    const fileBuffer = readFileSync(fixturePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
    
    console.log(`📁 Loading .helvault file (${arrayBuffer.byteLength} bytes)...`);
    
    // This runs off the main thread in a Web Worker
    const start = performance.now();
    const result = await client.openHelvault(arrayBuffer);
    const duration = performance.now() - start;
    
    console.log(`✅ Loaded in ${duration.toFixed(2)}ms`);
    console.log(`📊 Results:`);
    console.log(`   - Inventory rows: ${result.inventoryRows.length}`);
    console.log(`   - Aggregates: ${result.aggregates.length}`);
    
    console.log('\n📋 Sample inventory rows:');
    result.inventoryRows.slice(0, 3).forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.scryfall_id} - ${row.set} #${row.collector_number} (${row.copies} copies)`);
      console.log(`      Collection: ${row.collection_id}`);
      console.log(`      Finishes: ${row.finishes.join(', ')}`);
    });
    
    console.log('\n🎯 Sample aggregates:');
    result.aggregates.slice(0, 3).forEach((agg, i) => {
      console.log(`   ${i + 1}. ${agg.scryfall_id} - ${agg.set} #${agg.collector_number}`);
      console.log(`      Collection: ${agg.collection} (${agg.copies} total copies)`);
      console.log(`      Finishes: ${agg.finishes.join(', ')}`);
    });
    
    // Verify all rows have required fields
    const hasAllRequiredFields = result.inventoryRows.every(row => 
      row.scryfall_id && row.collection_id
    );
    const aggregatesHaveCollection = result.aggregates.every(agg => 
      agg.scryfall_id && agg.collection
    );
    
    console.log('\n✅ Validation:');
    console.log(`   - All inventory rows have scryfall_id: ${hasAllRequiredFields}`);
    console.log(`   - All aggregates have collection names: ${aggregatesHaveCollection}`);
    
    // Calculate aggregate verification
    const rawTotal = result.inventoryRows.reduce((sum, row) => sum + row.copies, 0);
    const aggTotal = result.aggregates.reduce((sum, agg) => sum + agg.copies, 0);
    console.log(`   - Raw total copies: ${rawTotal}`);
    console.log(`   - Aggregate total copies: ${aggTotal}`);
    console.log(`   - Totals match: ${rawTotal === aggTotal}`);
    
    // Clean up
    client.terminate();
    console.log('\n🎉 Example completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  example();
}