If you like the app, a small donation is always appreciated.

https://www.paypal.com/donate/?hosted_button_id=N7YDAW3QX45GQ

<img width="128" height="128" alt="Donate" src="https://github.com/user-attachments/assets/1ebcf0d2-f502-4dd5-95f6-7b56ec19b739" />

---

**Live Demo:**
https://reloadingtest.hostzone.lu
Username: `demo` / Password: `demoapp`

---

![Login Screen](screenshots/login.jpg)

<img width="1305" height="917" alt="Dashboard" src="https://github.com/user-attachments/assets/6d07275a-8578-4bb4-88dc-5685ab53955b" />

---

# Reloading Manager

A full-stack web application for sport shooters to manage the complete lifecycle of handloaded ammunition and their entire firearms collection — from raw components to fired rounds, charge ladder development, factory ammo tracking, weapons inventory with full purchase and sale history, and legal licenses and permits.

---

## Table of Contents

- [Features Overview](#features-overview)
- [Tech Stack](#tech-stack)
- [Quick Start with Docker](#quick-start-with-docker)
- [Kubernetes / Multi-Instance Deployment](#kubernetes--multi-instance-deployment)
- [Environment Variables](#environment-variables)
- [First Login & Admin Setup](#first-login--admin-setup)
- [User Management](#user-management)
- [Application Guide](#application-guide)
  - [Dashboard](#dashboard)
  - [Cartridges — Brass Inventory](#cartridges--brass-inventory)
  - [Bullets](#bullets)
  - [Powders](#powders)
  - [Primers](#primers)
  - [Load Records](#load-records)
  - [The Reloading Workflow](#the-reloading-workflow)
  - [Charge Ladders — Load Development](#charge-ladders--load-development)
  - [Buy-In — Factory Ammo Inventory](#buy-in--factory-ammo-inventory)
  - [Weapons Inventory](#weapons-inventory)
  - [Licenses & Permits](#licenses--permits)
  - [History](#history)
- [Settings](#settings)
  - [General](#general)
  - [Mail / SMTP](#mail--smtp)
  - [Backup & Restore](#backup--restore)
  - [Users (Admin)](#users-admin)
  - [Reference Lists](#reference-lists)
  - [Audit Log](#audit-log)
- [Photo Support](#photo-support)
- [Form Validation](#form-validation)
- [Batch ID Format](#batch-id-format)
- [Building from Source](#building-from-source)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)

---

## Features Overview

### Reloading & Ammunition

- **Brass inventory** — track cartridge batches by manufacturer, caliber, and production charge with per-batch reload history and cycle counting
- **Component inventory** — bullets, powders (grams), and primers each with quantity tracking, low-stock warnings, and photo support
- **9-step load workflow** — guide each reload batch through washing → calibration → trim → annealing → second washing → priming → powder → bullet seating → complete
- **Any step can be skipped** — skipped steps count as done for workflow progression; permanently stored in the load record
- **Cycle tracking** — the same brass batch can be reloaded multiple times; each cycle gets its own record under the same batch number
- **Charge ladder load development** — test multiple powder charges in a single range session, record group size and velocity per level, mark the best result
- **Smart inventory deduction** — primers, powder, and bullets are automatically deducted from stock when a load is marked as completed
- **Soft delete with restock** — deleting a load prompts you to optionally return components to inventory with a reason note
- **Factory ammo tracking (Buy-In)** — log factory ammunition purchases with caliber, model, brand, round count, price, and photo; record fired counts separately
- **Auto-numbered loads** — sequential batch IDs (`#00001-001` format) assigned automatically from a configurable starting number
- **Cartridge quantity tracking** — quantity loaded adjusts on load creation and reverses on deletion

### Weapons & Legal

- **Full firearms inventory** — register every weapon with detailed specifications, classification, purchase and sale history
- **Multiple photos per weapon** — unlimited photos per weapon with full-screen lightbox; first photo used as table thumbnail
- **Type and action classification** — Pistol, Revolver, Rifle, Shotgun, Silencer, Air Gun, Crossbow; Semi-Auto, Bolt, Lever, Pump, Single Shot, Break Action, Full Auto
- **Sale tracking** — mark a weapon as sold with sell date, sell price, buyer name, and sale notes; Owned/Sold filter
- **Magazine & charger tracker** — log each magazine/charger per weapon with label, capacity, and quantity; total count shown in the weapons table
- **Licenses & Permits** — dedicated registry for firearms licences with name, number, type, issue/expiry dates, notes, multi-photo gallery, and linked weapon associations; expiry status badges (Valid / Expiring Soon / Expired)
- **Hover photo previews** — hover any thumbnail in any list to see a floating enlarged preview

### Platform

- **Multi-user** — admin and regular-user roles with per-user notification preferences
- **Email notifications** — alerts for new loads, completions, firing events, and low-stock warnings via SMTP
- **Mail history** — last 100 sent or failed email attempts with full details
- **Backup and restore** — full JSON export (v5) covering all 17 application tables; import to fully restore
- **Custom branding** — uploadable logo and background image stored in the database
- **Configurable reference lists** — manage all dropdown options from Settings (calibers, manufacturers, licence types, etc.)
- **Admin undo** — admins can reverse any completed workflow step and undo Completed or Fired load status
- **Dymo label printing** — generates a formatted Dymo label via the browser print dialog from any load detail page
- **Audit log** — every significant admin action recorded with timestamp and username
- **Form validation** — all required fields highlight red on attempted save; errors clear field-by-field as you fill them in
- **European date format** (dd/mm/yyyy) throughout
- **Searchable combobox dropdowns** — all manufacturer/caliber fields use a searchable command palette instead of a plain select

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Backend | Express 5, TypeScript |
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM + inline migration runner |
| Auth | express-session + connect-pg-simple + bcryptjs |
| API contract | OpenAPI 3 (YAML) + Orval codegen |
| UI components | shadcn/ui + Radix UI primitives |
| Data fetching | TanStack React Query v5 |
| Animations | Framer Motion |
| Package manager | pnpm 10 (workspace monorepo) |
| Build | esbuild (ESM bundle, server) |

---

## Quick Start with Docker

### Prerequisites

- Docker Engine 24+
- Docker Compose v2

### 1. Clone the repository

```bash
git clone https://github.com/andyelsen85-bit/Reloading-Manager-Web.git
cd Reloading-Manager-Web
```

### 2. Create a `.env` file

```env
POSTGRES_PASSWORD=your_secure_db_password
SESSION_SECRET=your_long_random_session_secret
PORT=3000
```

> **Security:** Always change `POSTGRES_PASSWORD` and `SESSION_SECRET` before running in production. Use a random string of at least 32 characters for `SESSION_SECRET`.

### 3. Build and start

```bash
docker compose up -d --build
```

The application will be available at **http://localhost:3000** (or the port you configured).

On first startup the container automatically runs all database migrations before the server starts. No manual database setup is required.

### 4. Stopping and updating

```bash
# Stop the application
docker compose down

# Update to the latest version and restart
git pull
docker compose up -d --build
```

### 5. Persistent data

All PostgreSQL data is stored in the named Docker volume `postgres_data`. It survives container restarts and image rebuilds.

```bash
# WARNING: destroys all data permanently
docker compose down -v
```

---

## Kubernetes / Multi-Instance Deployment

The application uses PostgreSQL-backed sessions (`connect-pg-simple`), so multiple API pod replicas can share the same database without session affinity requirements.

**Important notes for Kubernetes:**

- Set `SESSION_SECRET` to the same value across all pods (via a Secret).
- Set `DATABASE_URL` to point to your PostgreSQL service.
- The app runs database migrations on startup — use a `initContainer` or ensure only one pod starts at a time during upgrades to avoid migration races.
- The `PORT` env var controls the port the server listens on (default `3000`).

### Backup & Restore on Kubernetes

The restore endpoint accepts a JSON body. If you are restoring a large backup (many photos stored as base64), the default body size limit is **10 MB**. If your backup file is larger, temporarily patch the `express.json` limit in `artifacts/api-server/src/app.ts` and rebuild your image:

```typescript
// artifacts/api-server/src/app.ts
app.use(express.json({ limit: "200mb" }));
```

Then restore normally via **Settings → Backup → Restore Backup** and rebuild with the original limit after.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Yes | `changeme` | Password for the PostgreSQL `reloading` user |
| `SESSION_SECRET` | Yes | `change-this-secret-in-production` | Secret used to sign session cookies |
| `PORT` | No | `3000` | Port the application listens on |
| `DATABASE_URL` | Auto | set by compose | Full PostgreSQL connection string (set automatically by docker-compose) |
| `NODE_ENV` | Auto | `production` | Set automatically by docker-compose |

SMTP credentials are **not** environment variables — they are configured inside the app under **Settings → Mail**.

---

## First Login & Admin Setup

On first launch, the application detects that no admin password has been set and shows a **Setup** screen.

1. Open `http://localhost:3000` in your browser
2. You are automatically redirected to the setup page
3. Enter a password for the built-in `admin` account and confirm it
4. Click **Set Password** — you are logged in immediately as admin

The setup page is permanently locked after this first use.

---

## User Management

User management is available to admin users only, accessible from **Settings → Users** or directly from the **sidebar** (Users link).

### Roles

| Role | Capabilities |
|---|---|
| **Admin** | Full access: all inventory, all loads, weapons, licenses, user management, settings, backup/restore, undo any workflow step, undo Completed/Fired status |
| **User** | Read and write access to loads and all inventory; cannot manage users or change application settings; cannot undo final load states |

### Creating a user

1. Click **Users** in the sidebar (or Settings → Users)
2. Click **Add User**
3. Enter username, email address, password, and select a role
4. Click **Create** — the user can log in immediately

### Managing existing users

- **Reset password** — set a new password for any user
- **Deactivate / Reactivate** — blocks login without deleting the account or its data
- **Delete** — permanently removes the account

### Personal account settings

Each logged-in user can click their name at the bottom of the sidebar to:

- Change their email address
- Toggle email notifications on or off
- Set granular notification preferences (load created / completed / fired / low stock)
- Change their password

---

## Application Guide

### Dashboard

At-a-glance overview of the entire operation.

**Inventory cards** (clickable, navigate to the relevant page):
- Cartridge batches in stock
- Bullets in stock
- Powder in stock (grams)
- Primers in stock

**Load status cards:**
- Active loads (in progress)
- Completed loads
- Fired loads

**Low stock warnings** — any component below your configured threshold appears as an amber alert with a link to the inventory page.

**Recent loads** — latest 10 load records with batch ID, caliber, quantity, date, and current step.

**Export button** — downloads a full JSON backup of all data instantly.

---

### Cartridges — Brass Inventory

Tracks your brass by batch. Each row represents one batch from one manufacturer in one caliber.

**Fields:**

| Field | Description |
|---|---|
| Manufacturer | Brass maker (e.g. Lapua, Winchester, Hornady) |
| Caliber | Cartridge caliber |
| Production Charge | Headstamp batch identifier |
| Quantity Total | Total cases in this batch |
| Quantity Loaded | How many are currently loaded |
| Times Fired | Reload cycle counter (auto-incremented on fire) |
| L6 (in) | Case length in inches |
| Avg H₂O Volume (gr) | Internal case volume in water grains |
| Shoulder Diameter (in) | Measured shoulder diameter |
| Base Diameter (in) | Measured base diameter |
| Neck Wall Thickness (in) | Measured neck wall |
| AMP Aztec Code | For AMP annealing machine users |
| AMP Pilot Number | For AMP annealing machine users |
| Notes | Free-text notes |
| Photo | Optional photo; thumbnail with hover preview |

**Expanded batch view:** Click the expand arrow on any batch row to see every load ever created from it, with batch ID, date, quantity, step, and status badge. Completed loads are hidden by default with a toggle to reveal them.

---

### Bullets

Inventory of projectiles.

| Field | Description |
|---|---|
| Manufacturer | Bullet manufacturer |
| Model | Product name or model |
| Weight (gr) | Bullet weight in grains |
| Diameter (in) | Bullet diameter in inches |
| Qty Available | Current stock count |
| Notes | Free-text notes |
| Photo | Optional photo; thumbnail with hover preview |

**Automatic deduction:** Quantity is deducted when a load using that bullet is marked **Completed**.

**Low-stock warning:** An amber triangle appears when quantity drops below your configured threshold.

---

### Powders

Inventory of propellant powders. Stock tracked in **grams**.

| Field | Description |
|---|---|
| Manufacturer | Powder manufacturer |
| Name | Product name (e.g. Varget, H4350, N150) |
| Type | Powder type classification |
| Grams Available | Current stock in grams |
| Notes | Free-text notes |
| Photo | Optional photo; thumbnail with hover preview |

**Automatic deduction:** Powder is deducted in grams on load completion, calculated as `charge weight (gr) × number of rounds`.

---

### Primers

Inventory of primers. Stock tracked in units.

| Field | Description |
|---|---|
| Manufacturer | Primer manufacturer |
| Type | e.g. Small Rifle, Large Pistol, Small Pistol Magnum |
| Qty Available | Current stock count |
| Notes | Free-text notes |
| Photo | Optional photo; thumbnail with hover preview |

**Automatic deduction:** Quantity is deducted when a load using that primer is marked **Completed**.

---

### Load Records

The Load Records page groups all loads by cartridge batch. Within each batch group:

- **Active loads** are shown by default
- **Show fired loads** toggle — reveals loads marked as fired within that batch
- **Show deleted loads** toggle — reveals soft-deleted loads with strikethrough and the deletion note

Each load row shows:
- **Batch ID** — e.g. `#00003-002` (see [Batch ID Format](#batch-id-format))
- **Quantity** — number of rounds in this load
- **Cycle** — which reload cycle this is for the brass batch
- **Date** — load creation date (dd/mm/yyyy)
- **Step** — current workflow step
- **Status** — Active, Completed, or Fired badge

Click **Workflow →** to open the full step-by-step detail view for any load.

#### Deleting a load

Click the trash icon on any load row. A dialog lets you optionally restock components before deletion:

| Option | Effect |
|---|---|
| Restock primers | Returns primer quantity to inventory |
| Restock powder | Returns total powder weight (grams) to inventory |
| Restock bullets | Returns bullet quantity to inventory |
| Note | Optional deletion reason, stored and visible in deleted loads view |

The cartridge's `quantityLoaded` count is always decremented on deletion regardless of restock choices.

---

### The Reloading Workflow

Each load follows a 9-step workflow. Open a load to access its detail page.

| # | Step | What you record |
|---|---|---|
| 1 | **Washing** | Cleaning duration (minutes) and date |
| 2 | **Calibration** | Sizing method (e.g. Full Length Resize, Neck Sizing) and date |
| 3 | **Trim** | Final case length (L6 in inches) and date |
| 4 | **Annealing** | Mark cases as annealed; record duration in minutes and date |
| 5 | **Second Washing** | Post-prep cleaning duration and date |
| 6 | **Priming** | Select primer from inventory and date |
| 7 | **Powder** | Select powder + charge weight (or link a Charge Ladder) and date |
| 8 | **Bullet Seating** | Select bullet, COAL and OAL in inches and date |
| 9 | **Complete** | Final review before marking as completed |

**Steps can be individually skipped** where not applicable. Skipped steps count as done for progression. The skipped list is stored permanently on the load record.

**Strict order enforcement** — each step is blocked until all prior steps are done or skipped.

All step dates are recorded and displayed in European format (dd/mm/yyyy).

#### Completing a load

Once all steps are done (or skipped), click **Mark as Completed**. This:
- Sets the load status to Completed
- Automatically deducts bullets, primers, and powder from inventory in a single atomic database transaction (prevents double-deduction from concurrent requests)

#### Marking as fired

After your range session, open the load and click **Mark as Fired**. Optionally record:
- **H₂O weight (gr)** of the fired brass (tracks case expansion over reload cycles)
- **Best charge level** if the load used a Charge Ladder

Firing increments the cartridge batch's `timesFired` counter.

#### Starting a new cycle

After a load is fired, click **Start New Cycle**. A new load record is created for the same brass:
- Inherits the same batch number
- Cycle number auto-increments (`#00003-002` → `#00003-003`)
- No additional brass inventory consumed — the same cases are being reused

#### Undoing states (admin only)

Admins can reverse any completed workflow step if a mistake was made, and can also undo the final Completed and Fired statuses on the load detail page:

- **Undo any step** — resets that step's data so it can be re-recorded
- **Undo Completion** — returns a Completed load to In Progress (inventory is not re-credited; use with care)
- **Undo Fired** — clears the fired flag and H₂O weight

#### Load photo

A photo can be attached to any load on the detail page — useful for a group target photo, a headstamp close-up, or any documentation. Once uploaded:
- A **128×128 thumbnail** is shown on the load detail page
- **Hover** over it for a floating 288×288 preview panel (fixed position, bypasses overflow clipping)
- **Click** to open the full-resolution image in a new browser tab

#### Print label

Click **Print Label** on any load detail page to generate a Dymo-compatible label via the browser print dialog. The label includes batch ID, caliber, primer, powder charge, bullet, COAL, and date.

---

### Charge Ladders — Load Development

Charge ladders let you systematically test multiple powder charges in a single range session.

#### Creating a ladder

1. Navigate to **Charge Ladders** in the sidebar
2. Click **New Ladder**
3. Name the session; select caliber, cartridge batch, bullet, powder, and primer
4. Set **Cartridges per Level** — how many rounds you'll load at each charge weight
5. Add charge levels — each level specifies a charge weight in grains

#### Linking a ladder to a load

In **Step 7 (Powder)** of the load workflow, choose **Use Charge Ladder** instead of a single charge weight, then select your ladder.

#### Recording results after firing

1. Open the load and click **Mark as Fired**
2. In the fired dialog, select the **Best Level** — the charge that produced the best result
3. That level is permanently marked with ★ in the ladder view

#### Ladder detail view

| Column | Description |
|---|---|
| Charge (gr) | Powder charge weight |
| Rounds | Number of cartridges loaded at this level |
| OAL (in) | Overall length |
| COAL (in) | Cartridge overall length to ogive |
| Group Size (mm) | Measured group size at target |
| Velocity (fps) | Measured muzzle velocity |
| Status | Loaded / Fired / Best (★) |

---

### Buy-In — Factory Ammo Inventory

Track factory ammunition purchases alongside your own reloads.

| Field | Description |
|---|---|
| Manufacturer | Ammunition brand (e.g. Federal, Winchester, Fiocchi) |
| Caliber | Cartridge caliber |
| Model | Product line or model name |
| Bullet Weight (gr) | Projectile weight in grains |
| Count Total | Total rounds purchased |
| Count Fired | Rounds fired from this purchase (updated separately) |
| Notes | Free-text notes |
| Photo | Optional product photo with hover preview |

Each row shows remaining rounds (`Total − Fired`). The photo column shows a thumbnail that expands to a floating preview on hover.

---

### Weapons Inventory

A complete registry for every firearm and accessory you own or have owned.

#### List view

| Column | Description |
|---|---|
| Photo | Thumbnail of first photo; hover for enlarged preview; `+N` if multiple |
| Type | Color-coded badge (Pistol, Rifle, Revolver, etc.) |
| Name / Model | Weapon name and model |
| Manufacturer | Brand |
| Caliber | In monospace font |
| Serial Number | Legal serial |
| Purchased | Buy date and price on separate lines |
| Magazines | Total magazine/charger count across all registered magazines |
| Status | Green "Owned" or red "Sold" badge |

**Filters:**
- Free-text search across name, manufacturer, model, caliber, and serial number
- Filter by weapon type (All / Pistol / Rifle / Revolver / Shotgun / Silencer / Air Gun / Crossbow)
- Filter by status (All / Owned / Sold)

#### Weapon fields

**Identification:**

| Field | Description |
|---|---|
| Name | Your descriptive name |
| Manufacturer | Brand / maker |
| Model | Specific model designation |
| Type | Pistol / Revolver / Rifle / Shotgun / Silencer / Air Gun / Crossbow / Other |
| Action Type | Semi-Automatic / Bolt / Lever / Pump / Single Shot / Break / Revolver / Full Auto / Other |
| Caliber | Cartridge caliber |
| Serial Number | Legal serial number |
| Barrel Length (in) | In inches |
| Weight (kg) | In kilograms |
| Color / Finish | Color and surface treatment |
| Country of Origin | Country of manufacture |

**Purchase:**

| Field | Description |
|---|---|
| Buy Date | Date of purchase (dd/mm/yyyy) |
| Buy Price | Purchase price |
| Purchased From | Dealer or private seller |

**Sale** (revealed when **Mark as Sold** is toggled):

| Field | Description |
|---|---|
| Sell Date | Date of sale |
| Sell Price | Price achieved |
| Sold To | Buyer name or reference |
| Sale Notes | Transaction notes |

**Notes:** Free-text for modifications, accessories, service history, etc.

#### Managing photos

After saving a weapon, open the **Edit** dialog to manage its photo gallery:
- Click **+Add** to upload one or more photos (multi-select supported)
- Click any thumbnail to open a **full-screen lightbox**
- Hover any photo to reveal its **×** delete button
- The first photo in the gallery is used as the table thumbnail

#### Magazine & Charger Tracker

Within the weapon's edit dialog, a **Magazines** section lets you register every magazine or charger for that weapon:

| Field | Description |
|---|---|
| Label | Description (e.g. "Factory 17rd", "Extended 33rd") |
| Capacity | Rounds per magazine |
| Quantity | How many of this type you own |
| Notes | Optional notes |

The total magazine count across all registered types is shown in the weapons table column.

---

### Licenses & Permits

A standalone registry for firearms licences and permits, accessible from the sidebar between Weapons and Users.

#### Card grid view

Each licence appears as a card showing:
- **Name** and **Licence Number**
- **Licence Type** badge (National / European / International — configurable in Settings → Lists)
- **Issue Date** and **Expiry Date**
- **Expiry status badge:**
  - Green **Valid** — expiry is more than 60 days away
  - Amber **Expiring Soon** — expiry within 60 days
  - Red **Expired** — past the expiry date
- **Linked weapons** — icons for each weapon associated with the licence
- **Photo thumbnails** — click to open the photo at native resolution in a new tab

**Search** — free-text across name, licence number, type, and linked weapon names.
**Filter by type** — dropdown filter by licence type.

#### Licence fields

| Field | Description |
|---|---|
| Name | Descriptive name (e.g. "Firearms Licence A", "European Firearms Pass") |
| Licence Number | Official licence or permit number |
| Licence Type | National / European / International (configurable) |
| Issue Date | Date of issue (dd/mm/yyyy) |
| Expiry Date | Expiry date (dd/mm/yyyy); drives status badge |
| Notes | Free-text notes |
| Linked Weapons | Associate one or more weapons from your inventory |
| Photos | Multi-photo gallery; click thumbnail to open at full resolution |

---

### History

A consolidated table showing the cumulative reloading history for each cartridge batch:
- Total rounds reloaded
- Number of cycles completed
- Number of deleted loads (with their deletion notes)
- Times fired

---

## Settings

Accessible from the sidebar. Most tabs are admin-only.

### General

- **Low Stock Thresholds** — quantities at which each component type triggers a dashboard warning and email alert:
  - Bullets (units)
  - Powder (grams)
  - Primers (units)
- **Next Load Number** — the auto-incrementing counter used for batch IDs; adjustable if needed
- **Branding** — upload a custom logo (shown in the sidebar) and a custom background image (applied app-wide); stored in the database

### Mail / SMTP

Configure outgoing email for all notification types.

| Field | Description |
|---|---|
| Host | SMTP server hostname (e.g. `smtp.gmail.com`) |
| Port | Usually `587` (STARTTLS) or `465` (SSL) |
| Username | SMTP authentication username |
| Password | SMTP password (stored encrypted; never returned in API responses or backup files) |
| From address | The `From:` address on all sent emails |
| Enabled | Master on/off toggle for all outgoing notifications |

**Send Test Email** — sends a test message immediately to verify your SMTP configuration.

**Per-user notification preferences** — each user individually controls which events send them an email:

| Event | When it fires |
|---|---|
| Load Created | A new reloading load is started |
| Load Completed | All workflow steps are done |
| Load Fired | A completed load is marked as fired |
| Low Stock | A component drops below its threshold |

Notifications only send if SMTP is enabled **and** the receiving user has an email address in their profile.

**Mail History** — last 100 sent or failed email attempts with timestamp, recipient, subject, and error message (if any).

### Backup & Restore

- **Download Backup** — exports all 17 application tables as a single versioned JSON file (`v5`). The SMTP password is intentionally excluded from backup files for security.
- **Restore Backup** — upload a previously downloaded JSON file to fully restore the database.

**What is included in a backup (v5):**
cartridges, bullets, powders, primers, loads, settings, referenceData, chargeLadders, chargeLevels, ammoInventory, weapons, weaponPhotos, weaponLicenses, weaponLicensePhotos, weaponLicenseWeapons, emailLog, weaponMagazines

**What is intentionally excluded:**
- `users` — user accounts are not overwritten by restore (security)
- `audit_log` — audit trail is not overwritten
- SMTP password — must be re-entered after restore

> **Warning:** Restore replaces **all** existing application data in a single atomic database transaction. Always download a fresh backup before performing a restore.

**Older backup versions (v1–v4)** restore cleanly — missing tables are simply skipped.

**Body size limit:** The server accepts restore payloads up to **10 MB** by default. If your backup is larger (e.g. many weapon/licence photos), see [Kubernetes / Multi-Instance Deployment](#kubernetes--multi-instance-deployment) for instructions on temporarily raising the limit.

### Users (Admin)

Same user management as described in [User Management](#user-management), accessible from Settings → Users.

### Reference Lists

Manage the autocomplete dropdown options used throughout all forms. Changes take effect immediately.

Available lists:
- **Calibers** (46 pre-populated)
- **Cartridge manufacturers**
- **Bullet manufacturers**
- **Powder manufacturers**
- **Primer manufacturers**
- **Licence types** (National, European, International — used in Licenses & Permits)

You can add, rename, reorder, or remove any entry.

### Audit Log

A timestamped, read-only record of every significant admin action — user creation, deletions, password resets, role changes, setting changes, and backup/restore operations.

---

## Photo Support

Photos are stored as base64 strings in the PostgreSQL database — no external storage service or object store required.

| Feature | Thumbnail | Hover Preview | Click to Open | Lightbox |
|---|---|---|---|---|
| Cartridges | ✓ | ✓ | — | — |
| Bullets | ✓ | ✓ | — | — |
| Powders | ✓ | ✓ | — | — |
| Primers | ✓ | ✓ | — | — |
| Buy-In (factory ammo) | ✓ | ✓ | — | — |
| Load Detail | ✓ | ✓ (fixed position) | ✓ (new tab) | — |
| Weapons | ✓ (first photo) | ✓ | — | ✓ (per-photo) |
| Licenses & Permits | ✓ | — | ✓ (new tab) | — |

**Hover preview:** Move your mouse over any thumbnail to see a floating enlarged preview. The preview uses fixed viewport positioning so it is never clipped by scroll containers or overflow regions.

**Click to open (Load Detail / Licenses):** Clicking a photo thumbnail opens the full-resolution image in a new browser tab. Internally, the base64 data is converted to a temporary Blob URL (revoked after 30 seconds) to bypass browser restrictions on opening `data:` URIs directly.

**Lightbox (Weapons):** Click any photo thumbnail in the weapon edit dialog to open a full-screen black overlay with the full-size image. Click outside the image or the × button to close.

**Multi-photo (Weapons and Licenses):** Both weapons and licences support unlimited photos. The edit dialogs show a photo gallery where you can upload multiple files at once and delete individual photos independently.

---

## Form Validation

All forms across the application validate required fields before saving. If you click **Add** or **Save** while required fields are empty:

- The empty required fields highlight with a **red border**
- A red **\*** asterisk appears on the corresponding label
- The error clears **field by field** as you fill in each one — you do not need to attempt a save again to see which fields are still missing

Required fields by form:

| Form | Required Fields |
|---|---|
| Cartridges | Manufacturer, Caliber, Production Charge, Total Quantity |
| Bullets | Manufacturer, Weight (gr), Diameter (in), Qty Available |
| Powders | Manufacturer, Name, Grams Available |
| Primers | Manufacturer, Type, Qty Available |
| Loads | Cartridge Batch, Quantity |
| Weapons | Name, Manufacturer |
| Licenses | License Name |

---

## Batch ID Format

Every load gets a batch ID in the format **`#LLLLL-CCC`**:

- `LLLLL` — five-digit zero-padded global load number (increments globally for each new load ever created)
- `CCC` — three-digit zero-padded cycle number (starts at `001`; increments each time the same brass is reloaded via **Start New Cycle**)

| Scenario | Batch ID |
|---|---|
| First load from a new batch of brass | `#00001-001` |
| Same brass, reloaded a second time | `#00001-002` |
| Same brass, reloaded a third time | `#00001-003` |
| A completely different cartridge batch | `#00002-001` |
| Two independent loads from the same batch | `#00003-001` and `#00004-001` |

The load number (`LLLLL`) is always globally unique. The cycle number (`CCC`) only increments within the same cartridge batch via **Start New Cycle**.

---

## Building from Source

For local development without Docker.

### Prerequisites

- Node.js 24
- pnpm 10 (`npm install -g pnpm@10`)
- PostgreSQL 16 running locally

### Setup

```bash
# Clone the repo
git clone https://github.com/andyelsen85-bit/Reloading-Manager-Web.git
cd Reloading-Manager-Web

# Install all workspace dependencies
pnpm install

# Set required environment variables
export DATABASE_URL="postgres://user:password@localhost:5432/reloading"
export SESSION_SECRET="dev-secret-change-me"

# Start the API server (auto-runs all database migrations on startup)
pnpm --filter @workspace/api-server run dev

# In a second terminal — start the React + Vite frontend
pnpm --filter @workspace/reloading-manager run dev
```

The frontend is served at `http://localhost:5173` in development and proxies all `/api` calls to the backend automatically via the shared reverse proxy.

### Monorepo structure

```
.
├── artifacts/
│   ├── api-server/          # Express 5 API (TypeScript, esbuild ESM bundle)
│   └── reloading-manager/   # React 19 + Vite 7 + Tailwind CSS 4 frontend
├── lib/
│   ├── db/                  # Drizzle ORM schema + inline migration runner
│   ├── api-spec/            # OpenAPI 3 YAML specification + orval config
│   ├── api-client-react/    # Generated TanStack React Query v5 hooks
│   └── api-zod/             # Generated Zod v3 input validation schemas
├── scripts/                 # Shared utility scripts
├── pnpm-workspace.yaml      # Workspace catalog + dependency overrides
└── docker-compose.yml
```

### Useful commands

```bash
# Full type-check across all packages
pnpm run typecheck

# Build all packages (requires PORT and BASE_PATH env vars)
pnpm run build

# Regenerate API client and Zod schemas from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Type-check only the frontend
pnpm --filter @workspace/reloading-manager run typecheck

# Type-check only the API server
pnpm --filter @workspace/api-server run typecheck
```

---

## API Reference

All endpoints require an active session cookie (login first via `POST /api/auth/login`) except where noted.

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Login with username + password |
| `POST` | `/api/auth/logout` | Session | Destroy current session |
| `GET` | `/api/auth/me` | Session | Get current authenticated user |
| `GET` | `/api/auth/setup-status` | Public | Check if initial admin setup is needed |
| `POST` | `/api/auth/setup` | Public (once) | Set the initial admin password |
| `GET` | `/api/auth/audit-log` | Admin | Fetch admin audit log entries |

### Inventory

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cartridges` | Session | List all cartridge batches |
| `POST` | `/api/cartridges` | Session | Create a cartridge batch |
| `PATCH` | `/api/cartridges/:id` | Session | Update a cartridge batch |
| `DELETE` | `/api/cartridges/:id` | Session | Delete a cartridge batch |
| `GET` | `/api/bullets` | Session | List all bullets |
| `POST` | `/api/bullets` | Session | Create a bullet |
| `PATCH` | `/api/bullets/:id` | Session | Update a bullet |
| `DELETE` | `/api/bullets/:id` | Session | Delete a bullet |
| `GET` | `/api/powders` | Session | List all powders |
| `POST` | `/api/powders` | Session | Create a powder |
| `PATCH` | `/api/powders/:id` | Session | Update a powder |
| `DELETE` | `/api/powders/:id` | Session | Delete a powder |
| `GET` | `/api/primers` | Session | List all primers |
| `POST` | `/api/primers` | Session | Create a primer |
| `PATCH` | `/api/primers/:id` | Session | Update a primer |
| `DELETE` | `/api/primers/:id` | Session | Delete a primer |

### Loads

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/loads` | Session | List all loads |
| `POST` | `/api/loads` | Session | Create a load (adjusts cartridge quantityLoaded) |
| `GET` | `/api/loads/:id` | Session | Get single load detail |
| `PATCH` | `/api/loads/:id` | Session | Update load data / step progress |
| `DELETE` | `/api/loads/:id` | Session | Soft-delete with optional component restock |
| `POST` | `/api/loads/:id/complete` | Session | Mark load as completed; deduct inventory (atomic) |
| `POST` | `/api/loads/:id/fire` | Session | Mark load as fired; optionally set H₂O weight |

### Charge Ladders

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/charge-ladders` | Session | List all charge ladders |
| `POST` | `/api/charge-ladders` | Session | Create a charge ladder |
| `GET` | `/api/charge-ladders/:id` | Session | Get ladder with all levels |
| `PATCH` | `/api/charge-ladders/:id` | Session | Update ladder metadata |
| `DELETE` | `/api/charge-ladders/:id` | Session | Delete ladder |
| `POST` | `/api/charge-ladders/:id/levels` | Session | Add a charge level |
| `PATCH` | `/api/charge-ladders/:id/levels/:levelId` | Session | Update a charge level |
| `DELETE` | `/api/charge-ladders/:id/levels/:levelId` | Session | Delete a charge level |
| `PATCH` | `/api/charge-ladders/:id/best` | Session | Set the best charge level |

### Weapons

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/weapons` | Session | List all weapons (with photos and magazines) |
| `POST` | `/api/weapons` | Session | Create a weapon |
| `PATCH` | `/api/weapons/:id` | Session | Update a weapon |
| `DELETE` | `/api/weapons/:id` | Session | Delete a weapon |
| `POST` | `/api/weapons/:id/photos` | Session | Add a photo to a weapon |
| `DELETE` | `/api/weapons/:id/photos/:photoId` | Session | Delete a weapon photo |
| `GET` | `/api/weapons/:id/magazines` | Session | List magazines for a weapon |
| `POST` | `/api/weapons/:id/magazines` | Session | Add a magazine entry |
| `PATCH` | `/api/weapons/:id/magazines/:magId` | Session | Update a magazine entry |
| `DELETE` | `/api/weapons/:id/magazines/:magId` | Session | Delete a magazine entry |

### Licenses & Permits

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/weapon-licenses` | Session | List all licences (with photos and linked weapons) |
| `POST` | `/api/weapon-licenses` | Session | Create a licence |
| `PATCH` | `/api/weapon-licenses/:id` | Session | Update a licence |
| `DELETE` | `/api/weapon-licenses/:id` | Session | Delete a licence |
| `POST` | `/api/weapon-licenses/:id/photos` | Session | Add a photo to a licence |
| `DELETE` | `/api/weapon-licenses/:id/photos/:photoId` | Session | Delete a licence photo |

### Factory Ammo (Buy-In)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ammo-inventory` | Session | List all factory ammo entries |
| `POST` | `/api/ammo-inventory` | Session | Create an entry |
| `PATCH` | `/api/ammo-inventory/:id` | Session | Update an entry |
| `DELETE` | `/api/ammo-inventory/:id` | Session | Delete an entry |
| `POST` | `/api/ammo-inventory/:id/fire` | Session | Record fired rounds (atomic bounds check) |

### Reference Data

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reference/:category` | Session | List reference items for a category |
| `POST` | `/api/reference/:category` | Admin | Add a reference item |
| `PATCH` | `/api/reference/:category/:id` | Admin | Update a reference item |
| `DELETE` | `/api/reference/:category/:id` | Admin | Delete a reference item |

Categories: `caliber`, `cartridge_manufacturer`, `bullet_manufacturer`, `powder_manufacturer`, `primer_manufacturer`, `license_type`

### Dashboard & Export

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/overview` | Session | Counts and low-stock summary |
| `GET` | `/api/dashboard/history` | Session | Per-cartridge reload history |
| `GET` | `/api/dashboard/export` | Session | Full JSON data export |

### Settings, Users, Backup

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settings` | Session | Get application settings (SMTP password excluded) |
| `PATCH` | `/api/settings` | Admin | Update settings |
| `GET` | `/api/users` | Admin | List all users |
| `POST` | `/api/users` | Admin | Create a user |
| `PATCH` | `/api/users/:id` | Admin | Update a user |
| `DELETE` | `/api/users/:id` | Admin | Delete a user |
| `POST` | `/api/users/:id/reset-password` | Admin | Reset a user's password |
| `GET` | `/api/backup` | Admin | Download full JSON backup (v5) |
| `POST` | `/api/restore` | Admin | Restore from a JSON backup file |

---

## Database Schema

All tables use PostgreSQL with auto-incrementing integer primary keys.

| Table | Description |
|---|---|
| `cartridges` | Brass batch inventory |
| `bullets` | Bullet inventory |
| `powders` | Powder inventory |
| `primers` | Primer inventory |
| `loads` | Load records with workflow state, soft-delete fields, skipped steps, and photo |
| `settings` | Single-row application configuration (thresholds, SMTP, branding, load numbering) |
| `users` | User accounts with hashed passwords, roles, and notification preferences |
| `reference_data` | Configurable dropdown values (calibers, manufacturers, licence types) |
| `charge_ladders` | Charge ladder sessions |
| `charge_levels` | Individual charge levels within a ladder |
| `ammo_inventory` | Factory ammunition purchase records |
| `weapons` | Weapon registry |
| `weapon_photos` | Per-weapon photo gallery (base64) |
| `weapon_licenses` | Firearms licence and permit registry |
| `weapon_license_photos` | Per-licence photo gallery (base64) |
| `weapon_license_weapons` | Join table linking licences to weapons |
| `weapon_magazines` | Per-weapon magazine/charger inventory |
| `email_log` | Last 100 sent or failed outgoing email records |
| `audit_log` | Admin action audit trail (excluded from backup/restore) |
| `__app_migrations` | Internal migration tracking table |

### Migrations

Migrations are defined inline in `artifacts/api-server/src/lib/runMigrations.ts` and tracked in the `__app_migrations` table. They run automatically on every server startup — no manual `migrate` command is needed. The server will not start if any migration fails.
