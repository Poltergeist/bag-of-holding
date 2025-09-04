import { defineConfig } from '@tanstack/router-vite-plugin'

export default defineConfig({
  routesDirectory: './src/routes',
  generatedRouteTree: './src/routeTree.gen.ts',
})