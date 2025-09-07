import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    TanStackRouterVite(),
    // Plugin to copy worker file and sql.js assets during build
    {
      name: 'copy-workers-and-sql',
      writeBundle() {
        // Copy worker file
        const workerSrc = '../../packages/workers/dist/src/sqlite-worker.js';
        const workerDest = 'dist/workers/sqlite-worker.js';
        
        mkdirSync(dirname(workerDest), { recursive: true });
        copyFileSync(workerSrc, workerDest);
        console.log('Copied sqlite-worker.js to dist/workers/');
        
        // Copy sql.js WASM files
        const sqlJsDir = 'node_modules/sql.js/dist';
        const wasmDest = 'dist/sql';
        mkdirSync(wasmDest, { recursive: true });
        
        // Copy required sql.js files
        const sqlJsFiles = [
          'sql-wasm.js',
          'sql-wasm.wasm'
        ];
        
        sqlJsFiles.forEach(file => {
          copyFileSync(join(sqlJsDir, file), join(wasmDest, file));
          console.log(`Copied ${file} to dist/sql/`);
        });
      }
    }
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  worker: {
    format: 'iife' // Use IIFE format instead of ES modules for workers
  },
});