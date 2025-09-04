# Copilot Instructions for this Repository

## Project overview
- **Name:** Bag of Holding
- **Goal:** Load a Helvault `.helvault` (SQLite) export in the browser, browse collections, compare against a decklist, compute owned/missing, show pick sources by collection priority, and surface “bling” (other owned printings). Initial scope is **read-only**.

## Tech stack
- **Frontend:** React + Vite + TypeScript + Tailwind + TanStack Router
- **Client data:** sql.js (WASM SQLite) in a Web Worker + IndexedDB cache
- **Monorepo:** pnpm workspaces
- **Testing:** Vitest (+ React Testing Library in web)
- **CI:** GitHub Actions (typecheck + test + lint on PR)

## Repository layout
```
bag-of-holding/
  apps/
    web/          # React app (Vite)
    api/          # placeholder for future sync API
  packages/
    core/         # shared types, deck parsers, matching logic
    ui/           # UI components (Tailwind)
    workers/      # sql.js Web Worker + RPC helpers
```

## Build / test / run
- Install: `pnpm install`
- Dev web: `pnpm dev -C apps/web`
- Build all: `pnpm build`
- Typecheck: `pnpm typecheck`
- Tests (all): `pnpm test -- --run`

## Coding standards
- TypeScript strict mode on. Prefer explicit types at public boundaries.
- Functional core / imperative shell: keep pure logic in `packages/core`.
- No secrets in client code. Do not fetch private APIs from the browser.
- Accessibility: keyboard navigation, labeled controls, ARIA for modals/menus.

## Conventions
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:` …).
- **Branches:** `feat/<area>`, `fix/<area>`, `chore/<area>`.
- **PRs:** Include a short plan, test notes, and screenshots for UI changes.
- **Testing:** Unit tests for core logic; component tests for critical UI tables/forms.

## What Copilot should optimize for
- Clear, testable code with small modules.
- Deterministic matching logic with unit tests for edge cases.
- Non-blocking UX (use Web Workers for SQLite; lazy-load images/routes).

## Security & data
- Treat `.helvault` user files as **local only**; never upload or log contents.
- No analytics or third-party calls beyond Scryfall image URLs (read-only).

## Definitions
- **InventoryAggregate:** grouped by (scryfall_id, set, collector_number, lang, finishes, collection) with `copies`.
- **DeckListEntry:** `{ name, qty, set?, collector_number?, scryfall_id? }`.
- **computeMatches:** allocation by user-defined collection priority; “bling” by same `oracle_id` but different printing.

## Done criteria for new features
- Typecheck + tests pass locally and in CI.
- No eslint errors.
- Updated README/docs where relevant.
