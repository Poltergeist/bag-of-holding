import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    TanStackRouterVite(),
    // Plugin to copy worker file during build
    {
      name: 'copy-workers',
      writeBundle() {
        const workerSrc = '../../packages/workers/dist/src/sqlite-worker.js';
        const workerDest = 'dist/workers/sqlite-worker.js';
        
        mkdirSync(dirname(workerDest), { recursive: true });
        copyFileSync(workerSrc, workerDest);
        console.log('Copied sqlite-worker.js to dist/workers/');
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
});