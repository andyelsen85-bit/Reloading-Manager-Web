# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Project: Reloading Manager

A full-stack web app for sport shooting reloaders.

### Features
- **Inventory management**: Cartridges, Bullets, Powders, Primers (CRUD with low-stock warnings)
- **Multi-step load workflow**: Washing → Calibration → Trim → Second Washing → Priming → Powder → Bullet Seating → Complete
- **Mark loads as Fired** (increments cartridge reload cycle counter)
- **Dashboard**: Overview stats + low-stock warnings (bullets <100, powders <500gr, primers <100)
- **History**: Per-cartridge reload summary
- **JSON export**: Full data export from dashboard

### Frontend Pages
- `Dashboard.tsx` — stats + low-stock warnings + export
- `Cartridges.tsx` — batch inventory management
- `Bullets.tsx`, `Powders.tsx`, `Primers.tsx` — component inventory
- `Loads.tsx` — load record list with step badges
- `LoadDetail.tsx` — full 8-step workflow with collapsible step cards
- `History.tsx` — reload history summary table

### API Routes (api-server)
- `/api/cartridges`, `/api/bullets`, `/api/powders`, `/api/primers` — CRUD
- `/api/loads` — CRUD + `/api/loads/:id/complete` (deducts inventory) + `/api/loads/:id/fire` (increments cycle)
- `/api/dashboard/overview`, `/api/dashboard/history`, `/api/dashboard/export`

### Theme
Dark gunmetal/steel theme (HSL 220 16% 10% bg, amber 38 90% 52% primary)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
