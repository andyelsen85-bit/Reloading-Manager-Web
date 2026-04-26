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

A full-stack web application for sport shooters to manage the complete lifecycle of handloaded ammunition and their entire firearms collection — from raw components to fired rounds, charge ladder development, factory ammo tracking, and weapons inventory with full purchase and sale history.

---

## Table of Contents

- [Features Overview](#features-overview)
- [Tech Stack](#tech-stack)
- [Quick Start with Docker](#quick-start-with-docker)
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
  - [History](#history)
- [Settings](#settings)
  - [General](#general)
  - [Mail / SMTP](#mail--smtp)
  - [Backup & Restore](#backup--restore)
  - [Users (Admin)](#users-admin)
  - [Reference Lists](#reference-lists)
  - [Audit Log](#audit-log)
- [Photo Support](#photo-support)
- [Batch ID Format](#batch-id-format)
- [Building from Source](#building-from-source)

---

## Features Overview

### Reloading & Ammunition

- **Brass inventory** — track cartridge batches by manufacturer, caliber, and production charge with per-batch reload history
- **Component inventory** — bullets, powders (in grams), and primers each with quantity tracking, low-stock warnings, and photo support
- **Multi-step load workflow** — guide each reload batch through 8 stages from washing to bullet seating
- **Cycle tracking** — the same brass batch can be reloaded multiple times; each cycle gets its own record under the same batch number
- **Charge ladder load development** — test multiple powder charges in a single range session, record group size and velocity per level, mark the best result
- **Smart inventory deduction** — primers, powder, and bullets are automatically deducted from stock when a load is marked as completed
- **Soft delete with restock** — deleting a load prompts you to return components back to inventory with an optional reason note
- **Factory ammo tracking (Buy-In)** — log factory ammunition purchases with caliber, model, brand, round count, price, and a photo; record fired counts separately from your own loads

### Weapons

- **Full firearms inventory** — register every weapon you own with detailed specifications
- **Multiple photos per weapon** — upload as many photos as needed; click any thumbnail for a full-screen lightbox
- **Classification** — type (Pistol, Revolver, Rifle, Shotgun, Silencer, Air Gun, Crossbow) and action type (Semi-Auto, Bolt, Lever, Pump, etc.)
- **Purchase tracking** — buy date, price, and seller
- **Sale tracking** — mark a weapon as sold with sell date, sell price, buyer name, and sale notes
- **Hover photo previews** — hover any thumbnail in the list to see a floating enlarged preview

### Platform

- **Email notifications** — alerts for new loads, completions, firing events, and low-stock warnings
- **Multi-user support** — admin and regular-user roles with per-user notification preferences
- **Backup and restore** — full JSON export and import covering every table
- **Custom branding** — uploadable logo and background image stored in the database
- **Configurable reference lists** — manage all dropdown options (calibers, manufacturers, powder types, primer types) from Settings
- **Audit log** — every admin action is recorded with timestamp and user
- **European date format** (dd/mm/yyyy) throughout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Backend | Express 5, TypeScript |
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM + custom inline migration runner |
| Auth | express-session + connect-pg-simple + bcryptjs |
| UI components | shadcn/ui + Radix UI primitives |
| Animations | Framer Motion |
| Package manager | pnpm 10 (workspace monorepo) |

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

> **Security note:** Always change `POSTGRES_PASSWORD` and `SESSION_SECRET` before running in production. Never use the defaults.

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
# WARNING: this destroys all your data permanently
docker compose down -v
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Yes | `changeme` | Password for the PostgreSQL `reloading` user |
| `SESSION_SECRET` | Yes | `change-this-secret-in-production` | Secret used to sign session cookies |
| `PORT` | No | `3000` | Host port the application listens on |
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

The setup page is permanently locked out after this first use.

---

## User Management

User management is available to admin users only, accessible directly from **the sidebar** (Users link).

### Roles

| Role | Capabilities |
|---|---|
| **Admin** | Full access: all inventory, all loads, weapons, user management, settings, backup/restore, undo completed/fired states |
| **User** | Read and write access to loads and all inventory; cannot manage users or settings; cannot undo final load states |

### Creating a user

1. Click **Users** in the sidebar
2. Click **Add User**
3. Enter a username, email address, password, and select a role
4. Click **Create** — the user can log in immediately

### Managing existing users

From the user list you can:

- **Reset password** — set a new password for any user
- **Deactivate / Reactivate** — blocks login without deleting the account or any of its data
- **Delete** — permanently removes the user account

### Personal account settings

Each logged-in user can click their name at the bottom of the sidebar to:

- Change their email address
- Toggle email notifications on or off
- Change their password

---

## Application Guide

### Dashboard

The dashboard gives you an at-a-glance overview of the entire operation.

**Inventory cards** (clickable, takes you to the relevant page):
- Cartridge batches in stock
- Bullets in stock
- Powder in stock (grams)
- Primers in stock

**Load status cards:**
- Active loads (in progress)
- Completed loads
- Fired loads

**Low stock warnings** — any component below your configured threshold appears as an amber alert.

**Recent loads** — the latest 10 load records with batch ID, caliber, quantity, date, and current step.

**Export button** — downloads a full JSON backup of all data in one click.

---

### Cartridges — Brass Inventory

Tracks your brass by batch. Each row represents a specific batch from a specific manufacturer.

**Fields available:**
| Field | Description |
|---|---|
| Manufacturer | Brass manufacturer (e.g. Lapua, Winchester) |
| Caliber | Cartridge caliber (e.g. 6.5 Creedmoor, 9mm) |
| Production Charge | Headstamp batch identifier |
| Quantity Total | Total cases in this batch |
| Quantity Loaded | How many are currently loaded |
| Times Fired | Reload cycle counter |
| L6 (in) | Case length measurement |
| Avg H₂O Volume (gr) | Internal case volume in water grains |
| Shoulder Diameter (in) | Measured shoulder diameter |
| Base Diameter (in) | Measured base diameter |
| Neck Wall Thickness (in) | Measured neck wall |
| AMP Aztec Code | For AMP annealing machine integration |
| AMP Pilot Number | For AMP annealing machine |
| Notes | Free-text notes |
| Photo | Optional photo with hover preview |

**Expanded batch view:** Click the expand arrow on any batch row to see all reload loads ever created from it, with batch ID, date, quantity, step, and status. Fired loads are hidden by default with a toggle to reveal them.

---

### Bullets

Inventory of projectiles.

**Fields:**
| Field | Description |
|---|---|
| Manufacturer | Bullet manufacturer |
| Model | Product name or model |
| Weight (gr) | Bullet weight in grains |
| Diameter (in) | Bullet diameter in inches |
| Qty Available | Current stock count |
| Notes | Free-text notes |
| Photo | Optional photo with hover preview |

**Automatic deduction:** Quantity is deducted when a load using that bullet is marked as **Completed**.

**Low-stock warning:** An amber triangle appears in the list when quantity drops below your configured threshold (set in Settings → General).

---

### Powders

Inventory of propellant powders. Stock is tracked in **grams**.

**Fields:**
| Field | Description |
|---|---|
| Manufacturer | Powder manufacturer |
| Name | Powder product name (e.g. Varget, H4350) |
| Type | Powder type classification |
| Grains Available | Current stock in grams |
| Notes | Free-text notes |
| Photo | Optional photo with hover preview |

**Automatic deduction:** Powder is deducted in grams when a load is completed, calculated as `charge weight (gr) × number of rounds`.

---

### Primers

Inventory of primers. Stock is tracked in units.

**Fields:**
| Field | Description |
|---|---|
| Manufacturer | Primer manufacturer |
| Type | Primer type (e.g. Small Rifle, Large Pistol, Small Pistol Magnum) |
| Qty Available | Current stock count |
| Notes | Free-text notes |
| Photo | Optional photo with hover preview |

**Automatic deduction:** Quantity is deducted when a load using that primer is marked as **Completed**.

---

### Load Records

The Load Records page groups all loads by cartridge batch. Within each batch group:

- **Active loads** are shown by default
- **Show fired loads** toggle — reveals loads marked as fired within that batch
- **Show deleted loads** toggle — reveals soft-deleted loads (shown with strikethrough and the deletion reason)

Each load row shows:
- **Batch ID** — e.g. `#00003-002` (see [Batch ID Format](#batch-id-format))
- **Quantity** — number of rounds in this load
- **Cycle** — which reload cycle this is for the brass batch
- **Date** — load creation date (dd/mm/yyyy)
- **Step** — current workflow step
- **Status** — Active, Completed, or Fired

**Open a load:** Click **Workflow →** to open the full step-by-step detail view.

#### Deleting a load

Click the trash icon. A dialog lets you optionally restock components:

| Option | Effect |
|---|---|
| Restock primers | Returns the primer quantity to inventory |
| Restock powder | Returns the total powder weight (grams) to inventory |
| Restock bullets | Returns the bullet quantity to inventory |
| Note | Optional deletion reason, stored and visible in the deleted loads view |

---

### The Reloading Workflow

Each load follows an 8-step workflow. Open a load to access its detail page.

| Step | What you record |
|---|---|
| **1. Washing** | Cleaning duration (minutes) and date |
| **2. Calibration** | Sizing method (e.g. Full Length Resize, Neck Sizing) |
| **3. Trim** | Final case length (L6 in inches) |
| **4. Annealing** | Mark cases as annealed; record duration in minutes |
| **5. Second Washing** | Post-prep cleaning duration and date |
| **6. Priming** | Select primer from inventory; quantity deducted on completion |
| **7. Powder** | Select powder + charge weight, or link a Charge Ladder |
| **8. Bullet Seating** | Select bullet, record COAL and OAL in inches |

**Steps can be individually skipped** where not applicable to your process. Skipped steps count as complete for workflow progression purposes.

All step dates are recorded and displayed in European format (dd/mm/yyyy).

#### Completing a load

Once all steps are done (or skipped), click **Mark as Completed**. This:
- Changes the load status to Completed
- Automatically deducts bullets, primers, and powder from inventory

#### Marking as fired

After your range session, click **Mark as Fired**. You can optionally record:
- **H₂O weight** of the fired brass (tracks case expansion over reload cycles)
- **Best charge level** if the load used a charge ladder

#### Starting a new cycle

After a load is fired, click **Start New Cycle**. A new load record is created for the same batch of brass:
- Inherits the same batch number
- Cycle number increments automatically (`#00003-002` → `#00003-003`)
- No additional brass inventory is consumed — the same cases are being reused

#### Undoing states (admin only)

Admins can reverse the last final state if a mistake was made:
- **Undo Completion** — returns a Completed load to In Progress
- **Undo Fired** — clears the fired flag and H₂O weight

#### Photo on load

A photo can be attached to any completed load for documentation — e.g. a group target photo or a headstamp photo.

#### Print label

Click **Print Label** on any load to generate a Dymo-compatible label via the browser print dialog.

---

### Charge Ladders — Load Development

Charge ladders let you systematically test multiple powder charges in a single range session.

#### Creating a ladder

1. Navigate to **Loads → Charge Ladders** (or via the main nav)
2. Click **New Ladder**
3. Name your session and select the powder, caliber, cartridge batch, bullet, and primer
4. Set **Cartridges per Level** — how many rounds you'll load at each charge weight
5. Add levels — each level specifies a charge weight in grains

#### Linking a ladder to a load

In **Step 7 (Powder)** of the load workflow, choose **Use Charge Ladder** instead of a single charge weight, then select your ladder from the list.

#### Recording results after firing

1. Open the load and click **Mark as Fired**
2. In the fired dialog, select the **Best Level** — the charge weight that produced the best results
3. That level is permanently marked with a ★ in the ladder view

#### Ladder detail view

The ladder detail page shows all charge levels with:
- Charge weight (grains)
- Number of rounds loaded at that level
- OAL (in) and COAL (in)
- Group size (mm) and velocity (fps)
- Status (loaded, fired, best)

---

### Buy-In — Factory Ammo Inventory

Track factory ammunition purchases alongside your own reloads.

**Fields:**
| Field | Description |
|---|---|
| Manufacturer | Ammunition brand (e.g. Federal, Winchester, Fiocchi) |
| Caliber | Cartridge caliber |
| Model | Product line or model name |
| Bullet Weight (gr) | Projectile weight |
| Count Total | Total rounds purchased |
| Count Fired | Rounds already fired from this purchase |
| Notes | Free-text notes |
| Photo | Optional product photo with hover preview |

Each row shows remaining count (`Total − Fired`) and the total quantity. The photo column shows a thumbnail that expands on hover.

---

### Weapons Inventory

A complete registry for every firearm and accessory you own or have owned.

#### List view

The main table shows all weapons with:
- **Photo thumbnail** — hover to see an enlarged preview; `+N` indicator when there are multiple photos
- **Type badge** — color-coded by category (blue for Pistol, green for Rifle, purple for Revolver, orange for Shotgun, etc.)
- **Name / Model** — weapon name and model side by side
- **Manufacturer**
- **Caliber** — in monospace font
- **Serial Number**
- **Purchased** — buy date and buy price on separate lines
- **Status** — green "Owned" or red "Sold" badge

**Filters:**
- Free-text search across name, manufacturer, model, caliber, and serial number
- Filter by weapon type
- Toggle between All / Owned / Sold

#### Adding a weapon

Click **Add Weapon** and fill in as many fields as apply:

**Identification:**
| Field | Description |
|---|---|
| Name | Your descriptive name for the weapon |
| Manufacturer | Brand / maker |
| Model | Specific model designation |
| Type | Pistol / Revolver / Rifle / Shotgun / Silencer / Air Gun / Crossbow / Other |
| Action Type | Semi-Automatic / Bolt Action / Lever Action / Pump Action / Single Shot / Break Action / Revolver / Full Auto / Other |
| Caliber | Cartridge caliber |
| Serial Number | Legal serial number |
| Barrel Length (in) | Barrel length in inches |
| Weight (kg) | Weapon weight in kilograms |
| Color / Finish | Color and surface finish |
| Country of Origin | Country where manufactured |

**Purchase Details:**
| Field | Description |
|---|---|
| Buy Date | Date of purchase |
| Buy Price | Purchase price |
| Purchased From | Dealer or private seller name |

**Sale Details:**

Toggle **Mark as Sold** to reveal the sale fields:

| Field | Description |
|---|---|
| Sell Date | Date of sale |
| Sell Price | Sale price achieved |
| Sold To | Buyer name or reference |
| Sale Notes | Any notes about the transaction |

**Notes:** A free-text field for modifications, accessories, maintenance history, etc.

#### Managing photos

After a weapon is saved, open the **Edit** dialog to manage photos:
- Click the **+Add** tile to upload one or more photos at once (multi-select supported)
- Click any photo thumbnail to open a **full-screen lightbox**
- Hover over the **X** button that appears on hover to delete an individual photo
- The first photo in the gallery is used as the table thumbnail

---

### History

A consolidated table showing the reloading history for each cartridge batch:
- Total rounds ever reloaded
- Number of cycles completed
- Loads deleted (with delete notes)
- Times fired

---

## Settings

Accessible from the sidebar. Most tabs are admin-only.

### General

- **Low Stock Thresholds** — set the quantities at which each component type triggers a dashboard warning and email alert:
  - Bullets (units)
  - Powder (grams)
  - Primers (units)
- **Next Load Number** — the auto-incrementing counter used to generate batch IDs; can be manually adjusted if needed
- **Branding** — upload a custom logo (shown in the sidebar) and a background image (applied to the whole app)

### Mail / SMTP

Configure outgoing email for all notification types:

| Field | Description |
|---|---|
| Host | SMTP server hostname (e.g. `smtp.gmail.com`, `mail.yourdomain.com`) |
| Port | Usually `587` (STARTTLS) or `465` (SSL) |
| Username | SMTP authentication username |
| Password | SMTP authentication password |
| From address | The `From:` address on all sent emails |
| Enabled | Master on/off toggle for all outgoing notifications |

**Send Test Email** — sends a test message immediately to verify your configuration.

**Notification preferences** — each user individually controls which events trigger an email to them:

| Event | When it fires |
|---|---|
| Load Created | A new reloading load has been started |
| Load Completed | All workflow steps are done |
| Load Fired | A completed load is marked as fired |
| Low Stock | A component drops below the threshold |

Notifications only send if SMTP is enabled **and** the user has an email address set in their profile.

**Mail History** — shows the last 100 sent or failed email attempts with timestamps, recipient, subject, and any error message.

### Backup & Restore

- **Download Backup** — exports all data (loads, inventory, weapons, settings, users, reference lists) as a single JSON file. Use this for regular backups or before major changes.
- **Restore Backup** — upload a previously downloaded JSON backup to fully restore the database.

> **Warning:** Restore replaces all existing data. Always download a backup before performing a restore.

### Users (Admin)

The same user management described in [User Management](#user-management) is also accessible from Settings → Users.

### Reference Lists

Manage the autocomplete dropdown options used throughout the application. Changes take effect immediately across all forms.

Available lists:
- Calibers (46 pre-populated)
- Cartridge manufacturers
- Bullet manufacturers
- Powder manufacturers
- Primer manufacturers
- Powder types
- Primer types

You can add, rename, or remove any entry.

### Audit Log

A timestamped record of every significant admin action performed in the application — user creation, deletions, password resets, setting changes, and backup operations.

---

## Photo Support

Photos are stored as base64 strings in the PostgreSQL database — no external storage service required.

Photos are supported on:

| Feature | Thumbnail | Hover Preview | Lightbox |
|---|---|---|---|
| Cartridges | ✓ | ✓ | — |
| Bullets | ✓ | ✓ | — |
| Powders | ✓ | ✓ | — |
| Primers | ✓ | ✓ | — |
| Buy-In (factory ammo) | ✓ | ✓ | — |
| Weapons | ✓ (first photo) | ✓ | ✓ (per-photo) |
| Loads / LoadDetail | ✓ | — | — |

**Hover preview:** Move your mouse over any thumbnail to see a 280×280 px floating enlarged view that follows the cursor.

**Lightbox (weapons only):** Click any weapon photo thumbnail in the edit dialog to open a full-screen black overlay with the full-size image. Click outside the image or the × button to close.

**Multi-photo (weapons only):** Each weapon can have unlimited photos. The edit dialog shows a photo gallery where you can upload multiple files at once and delete individual photos independently.

---

## Batch ID Format

Every load gets a batch ID in the format **`#LLLLL-CCC`**:

- `LLLLL` — five-digit zero-padded global load number (increments by 1 for each new load ever created across all batches)
- `CCC` — three-digit zero-padded cycle number (starts at `001`, increments each time the same brass is reloaded via **Start New Cycle**)

**Examples:**

| Scenario | Batch ID |
|---|---|
| First load from a fresh batch of brass | `#00001-001` |
| Same brass, reloaded a second time | `#00001-002` |
| Same brass, reloaded a third time | `#00001-003` |
| A completely different cartridge batch | `#00002-001` |
| Two independent loads from the same batch | `#00003-001` and `#00004-001` |

The load number (`LLLLL`) is always unique globally. The cycle number (`CCC`) only increments within the same cartridge batch via **Start New Cycle**.

---

## Building from Source

For local development without Docker.

### Prerequisites

- Node.js 22
- pnpm 10 (`npm install -g pnpm@10`)
- PostgreSQL 16 running locally

### Setup

```bash
# Clone the repo
git clone https://github.com/andyelsen85-bit/Reloading-Manager-Web.git
cd Reloading-Manager-Web

# Install all dependencies across the monorepo
pnpm install

# Set required environment variables
export DATABASE_URL="postgres://user:password@localhost:5432/reloading"
export SESSION_SECRET="dev-secret-change-me"

# Start the API server in development mode
# (automatically runs all database migrations on startup)
pnpm --filter @workspace/api-server run dev

# In a second terminal — start the React + Vite dev server
pnpm --filter @workspace/reloading-manager run dev
```

The frontend is served at `http://localhost:5173` in development mode and proxies all `/api` calls to the backend automatically.

### Monorepo structure

```
.
├── artifacts/
│   ├── api-server/          # Express 5 API (TypeScript, esbuild output)
│   └── reloading-manager/   # React + Vite frontend
├── lib/
│   ├── db/                  # Drizzle ORM schema definitions
│   ├── api-spec/            # OpenAPI YAML specification
│   ├── api-client-react/    # Generated React Query hooks (orval)
│   └── api-zod/             # Generated Zod schemas (orval)
└── docker-compose.yml
```

### Useful commands

```bash
# Type-check the entire monorepo
pnpm run typecheck

# Build all packages
pnpm run build

# Regenerate API client from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

---

## License

MIT
