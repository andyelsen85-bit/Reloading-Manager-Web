# Threat Model

## Project Overview

Reloading Manager is a self-hosted full-stack web application for sport shooting reloaders. It uses a pnpm TypeScript monorepo with an Express 5 API, PostgreSQL via Drizzle ORM, express-session backed by PostgreSQL, bcryptjs password hashing, nodemailer SMTP email, and a React/Vite frontend served by the API server in production.

Production scope is the Docker/self-hosted API server in `artifacts/api-server`, the shared database/schema packages in `lib/db`, the generated API/client contracts in `lib/api-*`, and the built `artifacts/reloading-manager` frontend. The mockup sandbox is development-only and should normally be ignored unless production reachability is demonstrated. In production, `NODE_ENV` is expected to be `production`; deployed platform traffic is terminated with TLS by the platform.

## Assets

- **User accounts and sessions** -- usernames, emails, password hashes, roles, activation state, notification preferences, and session cookies. Compromise allows impersonation or administrative access.
- **Inventory and reloading data** -- cartridge, bullet, powder, primer, load workflow, charge ladder, weapon, magazine, license/permit, and history records. This can include sensitive firearm ownership, serial number, licensing, purchase/sale, and activity information.
- **Uploaded images and branding data** -- base64 photos for loads, inventory, weapons, licenses, logos, and backgrounds. These may contain sensitive personal or regulated information and can consume large storage/memory if abused.
- **Administrative data and configuration** -- settings, reference lists, backup/restore contents, SMTP host/user/password/from fields, email history, and audit logs.
- **Application secrets** -- `DATABASE_URL`, `SESSION_SECRET`, SMTP credentials, and database session rows.

## Trust Boundaries

- **Browser to API** -- all `/api/*` requests cross from an untrusted browser into the Express API. The API must authenticate, authorize, validate, and bound resource usage for every request.
- **Unauthenticated to authenticated/admin** -- public routes are limited to health, setup status/setup, login, logout, and auth-me behavior. Inventory, weapon, license, dashboard, and reference routes require a valid active session. User management, settings, backup, and restore require admin role server-side.
- **API to PostgreSQL** -- route handlers and migrations access PostgreSQL with application privileges. SQL injection or unsafe restore behavior would expose or corrupt all application data.
- **API to SMTP server** -- admin-configured SMTP settings drive outbound email via nodemailer. The app must not leak SMTP credentials and should prevent attacker-controlled mail settings from being abused.
- **Backup/restore boundary** -- uploaded backup JSON crosses directly into destructive admin-only restore logic that truncates and repopulates application tables. Only trusted admins should reach it, and payload size/shape must be bounded.
- **Client rendering boundary** -- API data, base64 images, captions, email history, settings, and other user-provided text are rendered by React. Client code must avoid converting stored data into executable HTML/script.

## Scan Anchors

- Production API entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/routes/index.ts`.
- Auth/session: `artifacts/api-server/src/middlewares/auth.ts`, `artifacts/api-server/src/routes/auth.ts`, `lib/db/src/schema/users.ts`.
- Admin/destructive/config routes: `artifacts/api-server/src/routes/users.ts`, `artifacts/api-server/src/routes/settings.ts`, `artifacts/api-server/src/routes/backup.ts`.
- High-volume photo/base64 and inventory surfaces: `artifacts/api-server/src/routes/weapons.ts`, `artifacts/api-server/src/routes/loads.ts`, inventory routes, `artifacts/api-server/src/app.ts` body parser limits.
- Database and migrations: `lib/db/src/index.ts`, `lib/db/src/schema/*`, `artifacts/api-server/src/lib/runMigrations.ts`.
- Frontend production rendering: `artifacts/reloading-manager/src/pages/*`, especially settings, licenses, weapons, load detail, and any `window.open`/`document.write`/HTML injection patterns.
- Dev-only: `artifacts/mockup-sandbox`, screenshots, attached assets, and legacy Drizzle SQL files under `lib/db/drizzle` unless shown to be runtime-loaded in production.

## Threat Categories

### Spoofing

Users authenticate with local username/password and server-side sessions. Login and setup routes must only establish sessions for real active users, password hashes must use bcrypt with adequate cost, sessions must use unpredictable IDs and a production-only secret, and every protected route must check the active user from the database. Administrative operations must verify the admin role on the server, not only through frontend routing.

### Tampering

The client is untrusted for all inventory, workflow, weapon/license, settings, and backup/restore data. Server routes must validate request bodies, enforce business rules and role boundaries server-side, and use parameterized Drizzle queries. Admin restore is intentionally destructive, so it must remain admin-only and should not accept unbounded or malformed data that can corrupt tables or exhaust resources.

### Repudiation

Authentication events are written to audit logs, and admin-visible audit trails matter for account security. Sensitive actions such as password resets, user role changes, backup/restore, SMTP changes, and destructive deletes should be attributable to an authenticated user where practical.

### Information Disclosure

Weapon, license, serial number, photo, email, SMTP, and audit data are sensitive. API responses must not expose password hashes or SMTP secrets to non-admin users, backups must remain admin-only, logs and error responses must not disclose secrets or database internals, and frontend rendering must not allow stored text or base64 data to execute script.

### Denial of Service

The app accepts JSON/base64 payloads and performs database-heavy reads and writes. Public and authenticated routes must bound request body sizes, image sizes, restore sizes, and expensive operations; authentication endpoints should resist brute force and unauthenticated large-body abuse.

### Elevation of Privilege

Admin-only routes must stay behind `requireAdmin`, and normal authenticated users must not be able to manage users, settings, backups, or restore data. SQL injection, unsafe dynamic SQL, prototype/property injection, stored XSS, and session misconfiguration could turn ordinary access into administrative control and should be treated as high-risk where exploitable in production.
