# AGENTS.md — Copilot Agent Rules

## Golden rules
1. Do NOT introduce servers or secrets for MVP. All import/matching runs **client-side**.
2. Keep SQLite work **off the main thread** (Web Worker). Never block the UI.
3. Prefer small, pure functions in `packages/core` with unit tests.
4. Use Tailwind utility classes; avoid global CSS except for base styles.
5. Use Scryfall **image URLs** only; do not scrape or bulk download.

## Scaffolding plan
- Create `pnpm` monorepo with `apps/web`, `packages/core`, `packages/ui`, `packages/workers`.
- Add ESLint 9 + Prettier + Vitest setup.
- Implement:
  - Helvault importer (sql.js in Worker) → `InventoryRow[]` + `InventoryAggregate[]`
  - Decklist parsers (plain + MTGO)
  - `computeMatches` (owned/missing/pick sources/bling)
  - `/import`, `/collections`, `/deck-diff`, `/pick-list` pages
  - IndexedDB cache & collection-priority settings

## Commands to rely on
- `pnpm install`
- `pnpm dev -C apps/web`
- `pnpm test -- --run`
- `pnpm typecheck`
- `pnpm build`

## PR expectations
- Title with Conventional Commit prefix (e.g., `feat(web): add deck diff page`)
- CI green: typecheck, tests, eslint
- Include screenshots for UI

## Non-goals for MVP
- Writing back to Helvault
- Online accounts or sync
- Server inference for image recognition (placeholder docs only)
