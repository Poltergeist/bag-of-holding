# 🎒 Bag of Holding

Bag of Holding is a web app for Magic: The Gathering collectors. Import your Helvault export to browse collections, compare decklists, see owned vs missing cards, track from which binder to pull, and discover alternate printings. Runs fully client-side — your data stays private.

## Workspace Layout

This is a pnpm monorepo with the following structure:

```
bag-of-holding/
├── apps/
│   ├── web/          # React app (Vite + TypeScript + Tailwind + TanStack Router)
│   └── api/          # Placeholder for future sync API
├── packages/
│   ├── core/         # Shared types, deck parsers, matching logic
│   ├── ui/           # UI components (Button, Input, Table, CardGrid, etc.)
│   └── workers/      # Web Workers for SQLite import (sql.js) and RPC
└── ...
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 10.15.0+

### Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start the web app:**
   ```bash
   pnpm dev -C apps/web
   ```
   Opens at http://localhost:3000

### Available Scripts

- `pnpm build` - Build all packages and apps
- `pnpm dev` - Start all packages in development mode
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm typecheck` - Check TypeScript types across all packages
- `pnpm lint` - Lint all packages
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm clean` - Clean all build artifacts

### Package-Specific Commands

Run commands in specific packages:

```bash
# Start web app dev server
pnpm dev -C apps/web

# Build the core package
pnpm build -C packages/core

# Test the core package
pnpm test -C packages/core
```

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + TanStack Router
- **Data:** sql.js (WASM SQLite) in Web Workers + IndexedDB cache
- **Monorepo:** pnpm workspaces with TypeScript project references
- **Testing:** Vitest + React Testing Library
- **Linting:** ESLint 9 + Prettier
- **CI:** GitHub Actions (typecheck + test + lint on PR)

## Project Structure

### Core Concepts

- **InventoryAggregate:** Cards grouped by (scryfall_id, set, collector_number, lang, finishes, collection) with copy counts
- **DeckListEntry:** Deck list entries with name, quantity, optional set/collector_number/scryfall_id
- **computeMatches:** Allocation algorithm using user-defined collection priority; "bling" detection by oracle_id matching

### Security & Privacy

- `.helvault` files are processed **locally only** - never uploaded or logged
- No analytics or third-party calls except Scryfall image URLs (read-only)
- All data processing happens client-side in Web Workers

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with tests
4. Ensure all checks pass: `pnpm typecheck && pnpm test && pnpm lint`
5. Commit using conventional commits: `feat: add new feature`
6. Push and create a Pull Request
