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
- **Validation**: Zod (v3 via `"zod"` import), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Session management**: express-session + connect-pg-simple (PostgreSQL session store, 30-day cookie)
- **Email**: nodemailer (SMTP)
- **Auth**: bcryptjs password hashing

## Project: Reloading Manager

A full-stack web app for sport shooting reloaders. Self-hosted via Docker.

### Features
- **Inventory management**: Cartridges, Bullets, Powders, Primers (CRUD + photo upload + low-stock warnings)
- **Multi-step load workflow**: Washing → Calibration → Trim → Annealing → Second Washing → Priming → Powder → Bullet Seating → Complete
  - Any step can be **skipped** (JSON array in `loads.skippedSteps`)
  - Annealing step with duration tracking
- **Load numbering**: Auto-assigned sequential numbers (#00001 format) from settings
- **Mark loads as Fired**: optional H₂O weight recorded; increments cartridge reload cycle
- **Delete load with restock**: Soft-delete loads, optionally returning primers/powder/bullets to inventory with a note
- **Cartridge quantity on creation**: `quantityLoaded` incremented when a load is created (not completed); reversed on delete
- **Cartridge batch collapse view**: Expand a cartridge row to see all loads that reference it, with status badges; completed loads hidden by default with toggle
- **Reference data autocomplete**: Manufacturer and caliber fields in all inventory forms show suggestions from the pre-seeded reference lists
- **Dashboard**: Clickable stat cards, recent loads table, low-stock warnings
- **History**: Per-cartridge reload summary with deleted loads count
- **Charge Ladders (Load Dev)**: Multi-powder-charge sessions; record OAL/COAL/group size/velocity per level; select best charge
- **User Management**: Multi-user system with roles (admin/user), activation toggle, password reset
- **Email notifications**: SMTP config in Settings → Mail tab; notifications sent on load created/completed/fired; per-user granular prefs (loadCreated, loadCompleted, loadFired, lowStock)
- **Test email + mail history**: Send test email from Settings → Mail; view last 100 sent emails with status
- **Backup/Restore**: Full JSON backup (v4) download and restore (admin); covers all 16 app tables (excludes users and audit_log for security)
- **Admin undo**: Admins can undo any workflow step AND undo the "Completed" and "Fired" statuses on LoadDetail
- **Searchable combobox dropdowns**: All inventory forms use command+popover searchable dropdowns (RefCombobox.tsx) instead of datalists
- **Strict step-order enforcement**: Steps blocked until all previous steps are done; skipped steps count as done
- **Login Enter key**: Login form submits on Enter keypress
- **Reference Lists**: Pre-populated calibers (46) and manufacturer lists (bullets, powders, primers, cartridges) — editable in Settings → Lists tab
- **Settings**: 6-tab UI (General / Mail / Backup / Users / Lists / Audit) — thresholds, load numbering, branding, SMTP, test mail, notification prefs, mail history, backup/restore, user management, reference data, login audit trail
- **JSON export**: Full data export from dashboard
- **Photo upload**: Loads, Bullets, Cartridges, Powders, Primers support photo upload (base64 in DB)
- **Weapons Inventory**: Full weapon registry with multi-photo gallery, type/action classification, serial number, purchase details (date/price/from), sale tracking (sold toggle, sell date/price/buyer), hover photo previews, type-color badges, owned/sold filter; magazine/charger tracker (label, capacity, quantity, notes) shown as total count in table column, managed in edit dialog
- **Licenses & Permits**: Standalone page (between Weapons and Users in sidebar) — name, license number, license type (National/European/International, configurable in Settings → Lists), issue/expiry dates, notes, multi-photo gallery, linked weapon associations; expiry status badges (Valid / Expiring Soon <60 days / Expired); search and filter by type
- **Dymo print**: Print Label on LoadDetail generates a Dymo label via browser print

### Frontend Pages
- `Dashboard.tsx` — stats + recent loads + low-stock warnings + export
- `Cartridges.tsx` — batch inventory with photo thumbnails + collapse to show related loads
- `Bullets.tsx`, `Powders.tsx`, `Primers.tsx` — component inventory
- `Loads.tsx` — loads grouped by cartridge batch with collapsible sections; completed loads hidden by default per group; delete-with-restock dialog
- `LoadDetail.tsx` — 9-step workflow, skip, annealing, photo, fire dialog, print label
- `ChargeLadders.tsx` — load development session list
- `ChargeLadderDetail.tsx` — charge level management, result recording, best selection
- `History.tsx` — reload history with deleted loads count column
- `Weapons.tsx` — weapon inventory with multi-photo gallery, type/status filters, sale tracking
- `Licenses.tsx` — standalone license/permit registry; card grid with expiry status, license type badge, weapon associations, photo gallery; search + type filter; Add/Edit/Delete with photo upload
- `Settings.tsx` — 6-tab layout: General / Mail (SMTP, test, notification prefs, history) / Backup (download + restore) / Users / Lists / Audit

### API Routes (api-server)
- `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/audit-log` — session auth and admin audit trail
- `/api/users` — CRUD + `/api/users/:id/reset-password`
- `/api/reference/:category` — CRUD for calibers/manufacturers reference lists
- `/api/charge-ladders` — CRUD + `/api/charge-ladders/:id/levels` + `/api/charge-ladders/:id/best`
- `/api/cartridges`, `/api/bullets`, `/api/powders`, `/api/primers` — CRUD with photoBase64
- `/api/weapons` — CRUD + `/api/weapons/:id/photos` (add/delete photos) + `/api/weapons/:id/magazines` (CRUD magazines)
- `/api/weapon-licenses` — CRUD; supports `weaponIds[]` to link weapons; backup v4 includes all weapon/license tables
- `/api/weapon-licenses/:id/photos` — add/delete license photos
- `/api/loads` — CRUD + complete + fire; DELETE sends restock body; create adjusts cartridge.quantityLoaded
- `/api/settings` — GET / PATCH (single-row, supports SMTP fields)
- `/api/dashboard/overview`, `/api/dashboard/history` (includes deletedLoadsCount), `/api/dashboard/export`

### DB Schema
- `cartridges`, `bullets`, `powders`, `primers` — inventory tables
- `loads` — with `deletedAt`, `deletedNote` for soft delete; `loadNumber`, `skippedSteps`, `annealingMinutes`, `h2oWeightGr`, `photoBase64`
- `settings` — thresholds, loadNumber, logoBase64, backgroundBase64, smtpHost/Port/User/Pass/From/Enabled
- `users` — id, username, email, passwordHash, role, active, notificationsEnabled
- `reference_data` — id, category, value, sortOrder (pre-populated with 46 calibers + 16 manufacturers)
- `charge_ladders` — id, name, caliber, cartridgeId, bulletId, primerId, status, bestLevelId, cartridgesPerLevel
- `charge_levels` — id, ladderId, chargeGr, cartridgeCount, sortOrder, status, oalIn, coalIn, groupSizeMm, velocityFps
- `weapons` — id, name, manufacturer, model, type, caliber, serialNumber, actionType, barrelLengthIn, weightKg, color, countryOfOrigin, buyDate, buyPrice, buyFrom, sold, sellDate, sellPrice, soldTo, soldNotes, notes
- `weapon_photos` — id, weaponId, photoBase64, caption, sortOrder
- `weapon_licenses` — id, name, licenseNumber, licenseType, issueDate, expiryDate, notes, createdAt
- `weapon_license_photos` — id, licenseId, photoBase64, caption, sortOrder, createdAt
- `weapon_license_weapons` — id, licenseId, weaponId (join table linking licenses to weapons)
- `weapon_magazines` — id, weaponId, label, capacity, quantity, notes, createdAt
- `email_log` — id, toAddress, subject, body, status, error, sentAt (mail history; included in backup v4)

### Backup System
- **Backup route**: `GET /api/backup` (admin only) — returns versioned JSON with all 16 app tables
- **Restore route**: `POST /api/restore` (admin only) — transaction truncates all tables (CASCADE, RESTART IDENTITY), re-inserts in FK order, advances sequences
- **Current version**: v5 (added weaponMagazines)
- **Excluded intentionally**: `users`, `audit_log` (security — not overwritten by restore)
- **Backward compatibility**: each table insert uses `Array.isArray` guard so older backups (v1/v2/v3) restore cleanly without the newer tables

### Migrations Applied
- `0000_initial.sql` — baseline schema
- `0001_features.sql` — loadNumber, annealing, skippedSteps, h2oWeight, photoBase64, settings table
- Actual migrations are inline in `artifacts/api-server/src/lib/runMigrations.ts` and tracked by `__app_migrations`; Drizzle SQL files under `lib/db/drizzle` are legacy/dead for runtime.
- `0008_bullet_schema_repair` — ensures Docker/upgraded databases have `bullets.diameter_in` and `bullets.photo_base64`, and relaxes the legacy `bullets.caliber` column if present.
- `0009_backup_schema_repair` — repairs legacy Docker databases so broad reads used by backup/export/dashboard have every current schema column.
- `0012_weapons` / `0012_weapons_real` — creates `weapons` and `weapon_photos` tables.
- `0013_weapon_licenses` — creates `weapon_licenses`, `weapon_license_photos`, `weapon_license_weapons` tables.
- `0014_license_type` — adds `license_type` column to `weapon_licenses`.
- `0015_weapon_magazines` — creates `weapon_magazines` table.

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

## Important Notes
- `zod` must be a direct dependency of `api-server` (esbuild bundling requirement). Added in addition to transitive via `@workspace/api-zod`.
- New routes directly import `z` from `"zod"` (not `"zod/v4"` — v4 path is not supported).
- express-session uses MemoryStore (fine for self-hosted). SESSION_SECRET env var is used.
- Nodemailer is marked external in `build.mjs` (does dynamic requires).
