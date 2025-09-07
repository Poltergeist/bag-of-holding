import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useRef } from 'react';

export const Route = createFileRoute('/test')({
  component: TestPage,
});

interface TestResult {
  inventoryRows: Array<{
    scryfall_id: string;
    set: string;
    collector_number: string;
    lang: string;
    copies: number;
    collection_id: string;
    finishes: string[];
  }>;
  aggregates: Array<{
    scryfall_id: string;
    set: string;
    collector_number: string;
    collection: string;
    copies: number;
    finishes: string[];
    lang: string;
  }>;
  loadTime: number;
}

function TestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.helvault')) {
      setError('Please select a .helvault file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const start = performance.now();
      
      // Load sql.js in the main thread for now - we can move to worker later once it's working
      // Dynamic import sql.js
      const sqlJsModule = await import('sql.js');
      
      // Initialize with WASM file location
      const SQL = await sqlJsModule.default({
        locateFile: (file: string) => `/sql/${file}`
      });
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);
      const database = new SQL.Database(fileBuffer);
      
      // Query inventory with joins - get all rows, not just 100
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
      
      const inventoryRows: TestResult['inventoryRows'] = [];
      while (inventoryStmt.step()) {
        const row = inventoryStmt.getAsObject();
        
        // Ensure we have either scryfall_id or oracle_id
        const scryfallId = row.ZSCRYFALLID as string;
        const oracleId = row.ZORACLEID as string;
        if (!scryfallId && !oracleId) {
          console.warn('Skipping inventory row without scryfall_id or oracle_id');
          continue;
        }
        
        // Convert binary ZBINDERID to base64 string safely
        let collectionId = '';
        try {
          const binderIdBuffer = row.ZBINDERID;
          if (binderIdBuffer && binderIdBuffer instanceof ArrayBuffer) {
            collectionId = btoa(String.fromCharCode(...new Uint8Array(binderIdBuffer)));
          } else if (typeof binderIdBuffer === 'string') {
            collectionId = btoa(binderIdBuffer);
          } else {
            collectionId = String(binderIdBuffer || '');
          }
        } catch (e) {
          console.warn('Failed to convert collection ID:', e);
          collectionId = String(row.ZBINDERID || '');
        }
        
        inventoryRows.push({
          scryfall_id: scryfallId || oracleId,
          set: row.ZSET as string,
          collector_number: row.ZCOLLECTORNUMBER as string,
          lang: row.ZLANG as string,
          finishes: [row.ZFINISH as string],
          collection_id: collectionId,
          copies: row.ZCOPIES as number
        });
      }
      inventoryStmt.free();
      
      // Create aggregates grouped by (scryfall_id, set, collector_number, lang, finishes, collection)
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
      
      const aggregates: TestResult['aggregates'] = [];
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
          scryfall_id: scryfallId || oracleId,
          set: row.ZSET as string,
          collector_number: row.ZCOLLECTORNUMBER as string,
          lang: row.ZLANG as string,
          finishes: [row.ZFINISH as string],
          collection: row.collection_name as string,
          copies: row.total_copies as number
        });
      }
      aggregatesStmt.free();
      
      const loadTime = performance.now() - start;
      
      setResult({
        inventoryRows,
        aggregates,
        loadTime,
      });
      
      // Clean up database
      database.close();
      
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const helvaultFile = files.find(f => f.name.endsWith('.helvault'));
    
    if (helvaultFile) {
      processFile(helvaultFile);
    } else {
      setError('No .helvault file found in dropped files');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Helvault Importer Test
          </h1>
          <p className="text-gray-600">
            Test the Helvault SQLite importer by dropping a .helvault file below
          </p>
        </div>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-8 ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
        >
          <div className="space-y-4">
            <div className="text-4xl">📁</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your .helvault file here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to select a file
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Choose File
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".helvault"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Processing .helvault file...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <div className="text-red-400 text-xl mr-3">❌</div>
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-green-400 text-xl mr-3">✅</div>
                <h3 className="text-green-800 font-medium text-lg">
                  Import Successful
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-green-600 font-medium">Load Time</div>
                  <div className="text-green-800">{result.loadTime.toFixed(2)}ms</div>
                </div>
                <div>
                  <div className="text-green-600 font-medium">Inventory Rows</div>
                  <div className="text-green-800">{result.inventoryRows.length.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-green-600 font-medium">Aggregates</div>
                  <div className="text-green-800">{result.aggregates.length.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-green-600 font-medium">Total Copies</div>
                  <div className="text-green-800">
                    {result.inventoryRows.reduce((sum, row) => sum + row.copies, 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Inventory Rows */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Sample Inventory Rows (First 10)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scryfall ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Set
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Copies
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Collection
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Finishes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.inventoryRows.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {row.scryfall_id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.set}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.collector_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.copies}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                          {row.collection_id.substring(0, 12)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.finishes.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sample Aggregates */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Sample Aggregates (First 10)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scryfall ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Set
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Collection
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Copies
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lang
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.aggregates.slice(0, 10).map((agg, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {agg.scryfall_id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agg.set}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agg.collector_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agg.collection}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agg.copies}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agg.lang}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Validation Results */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Validation Results
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>All inventory rows have scryfall_id:</span>
                  <span className={`font-medium ${
                    result.inventoryRows.every(row => row.scryfall_id) 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {result.inventoryRows.every(row => row.scryfall_id) ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>All aggregates have collection names:</span>
                  <span className={`font-medium ${
                    result.aggregates.every(agg => agg.collection) 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {result.aggregates.every(agg => agg.collection) ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Raw vs aggregate copy totals match:</span>
                  <span className={`font-medium ${
                    result.inventoryRows.reduce((sum, row) => sum + row.copies, 0) === 
                    result.aggregates.reduce((sum, agg) => sum + agg.copies, 0)
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {result.inventoryRows.reduce((sum, row) => sum + row.copies, 0) === 
                     result.aggregates.reduce((sum, agg) => sum + agg.copies, 0) ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}