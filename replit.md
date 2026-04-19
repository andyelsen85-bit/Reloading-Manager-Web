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
- **Inventory management**: Cartridges, Bullets, Powders, Primers (CRUD with low-stock warnings + photo upload)
- **Multi-step load workflow**: Washing → Calibration → Trim → **Annealing** → Second Washing → Priming → Powder → Bullet Seating → Complete
  - Any step can be **skipped** (stored as JSON array in `loads.skippedSteps`)
  - **Annealing** step (new) with duration tracking
- **Load numbering**: Auto-assigned sequential numbers (#00001 format) from settings
- **Mark loads as Fired**: optional H₂O weight recorded; increments cartridge reload cycle
- **Dashboard**: Clickable stat cards (navigate to inventory), recent loads table, low-stock warnings (configurable thresholds)
- **History**: Per-cartridge reload summary
- **JSON export**: Full data export from dashboard
- **Settings page**: Configurable thresholds, next load number, logo + background image (stored as base64)
- **Photo upload**: Loads, Bullets, Cartridges all support photo upload (base64, stored in DB)
- **Dymo print**: Print Label button on LoadDetail generates a Dymo Large Address Label (3.5"×1.4") via browser print

### Frontend Pages
- `Dashboard.tsx` — clickable stats + recent loads + low-stock warnings + export
- `Cartridges.tsx` — batch inventory with photo thumbnails
- `Bullets.tsx`, `Powders.tsx`, `Primers.tsx` — component inventory (bullets/cartridges have photo upload)
- `Loads.tsx` — load record list with #XXXXX load numbers (auto-assigned, no manual ID)
- `LoadDetail.tsx` — 9-step workflow, skip buttons, annealing, photo upload, fire dialog with H₂O, print label
- `History.tsx` — reload history summary table
- `Settings.tsx` — thresholds, load numbering, logo & background branding

### API Routes (api-server)
- `/api/cartridges`, `/api/bullets`, `/api/powders`, `/api/primers` — CRUD (with photoBase64)
- `/api/loads` — CRUD + `/api/loads/:id/complete` (deducts inventory, handles skipped steps) + `/api/loads/:id/fire` (h2oWeightGr, increments cycle)
- `/api/settings` — GET / PATCH (single-row settings pattern)
- `/api/dashboard/overview` — stats + recentLoads + thresholds from settings
- `/api/dashboard/history`, `/api/dashboard/export`

### DB Schema
- `cartridges`, `bullets`, `powders`, `primers` — inventory tables (bullets/cartridges have photoBase64)
- `loads` — load records with loadNumber, annealingMinutes, skippedSteps (JSON text), h2oWeightGr, photoBase64
- `settings` — single-row: bulletLowStockThreshold, powderLowStockThreshold, primerLowStockThreshold, nextLoadNumber, logoBase64, backgroundBase64

### Migrations Applied
- `0000_initial.sql` — baseline schema
- `0001_features.sql` — new columns (loadNumber, annealing, skippedSteps, h2oWeight, photoBase64, settings table)

### Theme
Dark gunmetal/steel theme (HSL 220 16% 10% bg, amber 38 90% 52% primary)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm run codegen` (in `lib/api-spec`) — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server (port 8080)
- `pnpm --filter @workspace/reloading-manager run dev` — run frontend (Vite)

## Packages

- `artifacts/api-server` — Express 5 API, built with esbuild, runs on PORT env var (default 8080)
- `artifacts/reloading-manager` — Vite + React + Tailwind frontend
- `lib/db` — Drizzle schema + migrations
- `lib/api-spec` — OpenAPI YAML + orval config
- `lib/api-client-react` — generated React Query hooks (from orval)
- `lib/api-zod` — generated Zod schemas (from orval)
