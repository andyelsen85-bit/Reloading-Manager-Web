If you like the app, I would be very happy about a small donation.
https://www.paypal.com/donate/?hosted_button_id=N7YDAW3QX45GQ

TestURL:
https://reloading-manager-web--andyelsen85.replit.app/


<img width="1280" height="720" alt="image" src="https://github.com/user-attachments/assets/24f86ddb-6f6d-482b-a34f-b965844b602b" />




# Reloading Manager

A full-stack web application for sport shooters to manage the complete lifecycle of handloaded ammunition — from raw brass to fired rounds and back again. Tracks component inventory, guides you through an 8-step reloading workflow, supports charge ladder development, and sends email notifications for key events.

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
  - [Load Records](#load-records)
  - [The Reloading Workflow](#the-reloading-workflow)
  - [Cartridges](#cartridges)
  - [Bullets](#bullets)
  - [Primers](#primers)
  - [Powders](#powders)
  - [Charge Ladders](#charge-ladders)
  - [History](#history)
- [Settings](#settings)
  - [General](#general)
  - [Mail / SMTP](#mail--smtp)
  - [Backup & Restore](#backup--restore)
  - [Reference Lists](#reference-lists)
- [Batch ID Format](#batch-id-format)
- [Building from Source](#building-from-source)

---

## Features Overview

- **Inventory management** for cartridge batches, bullets, primers, and powders
- **Guided 8-step workflow** per load with step-by-step tracking and timestamps
- **Cycle tracking** — the same brass batch can be reloaded multiple times, each getting its own cycle record under the same batch number
- **Charge ladder support** for systematic load development across multiple powder charges
- **Soft delete with restock** — deleting a load prompts you to return primers, powder, and bullets back to inventory
- **Show/hide fired and deleted loads** per batch group in the load list
- **Email notifications** for key events (new load, completion, firing, low stock)
- **Backup and restore** via JSON export/import
- **User management** with admin and regular-user roles
- **Configurable reference lists** (calibers, manufacturers, powder types, primer types)
- **European date format** (dd/mm/yyyy) throughout
- **Custom branding** — uploadable logo and background image

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Backend | Express 5, TypeScript |
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM (auto-migrations on startup) |
| Auth | express-session + connect-pg-simple + bcryptjs |
| Package manager | pnpm 10 (workspace) |

---

## Quick Start with Docker

### Prerequisites

- Docker Engine 24+
- Docker Compose v2

### 1. Clone the repository

```bash
git clone https://github.com/your-username/reloading-manager.git
cd reloading-manager
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
# Stop
docker compose down

# Update to latest version
git pull
docker compose up -d --build
```

### 5. Persistent data

All PostgreSQL data is stored in the named Docker volume `postgres_data`. It survives container restarts and image rebuilds. To fully wipe it:

```bash
docker compose down -v   # WARNING: destroys all data
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Yes | `changeme` | Password for the PostgreSQL `reloading` user |
| `SESSION_SECRET` | Yes | `change-this-secret-in-production` | Secret used to sign session cookies |
| `PORT` | No | `3000` | Host port mapped to the application |
| `DATABASE_URL` | Auto | set by compose | Full PostgreSQL connection string (set automatically by docker-compose) |
| `NODE_ENV` | Auto | `production` | Set automatically by docker-compose |

SMTP settings are **not** environment variables — they are configured inside the application under **Settings → Mail**.

---

## First Login & Admin Setup

On first launch the application detects that no admin password has been set and redirects to a **Setup** screen.

1. Open **http://localhost:3000** in your browser
2. You are redirected to the setup page automatically
3. Enter a password for the built-in `admin` account and confirm it
4. Click **Set Password** — you are logged in immediately as admin

After this, the setup page is no longer accessible.

---

## User Management

User management is available to admin users only under **Settings → Users**.

### Roles

| Role | Capabilities |
|---|---|
| **Admin** | Full access: all inventory, all loads, user management, settings, backup/restore, undo fired/completed states |
| **User** | Read and write access to loads and inventory; cannot manage users or settings, cannot undo final states |

### Creating a user

1. Go to **Settings → Users**
2. Click **Add User**
3. Enter a username, email address, password, and select a role
4. Click **Create** — the user can log in immediately

### Managing existing users

From the user list you can:

- **Reset password** — enter and confirm a new password for any user
- **Deactivate / Reactivate** — blocks login without deleting the account or its data
- **Delete** — permanently removes the user account

### Notification preferences

Each user can configure which email notifications they receive. Go to **Settings → Notifications** and toggle the four event types:

| Event | Trigger |
|---|---|
| Load Created | A new reloading load has been started |
| Load Completed | All workflow steps are done and the load is marked complete |
| Load Fired | A completed load has been marked as fired |
| Low Stock | A component has dropped below your configured threshold |

Notifications only send if SMTP is enabled in Settings and the user has an email address set.

---

## Application Guide

### Dashboard

The dashboard gives you an at-a-glance view of the entire operation:

- **Inventory counters** — total cartridge batches, bullets, primers, and powders in stock
- **Load counters** — active (in progress), completed, and fired loads
- **Low stock warnings** — components below your configured thresholds appear here
- **Recent loads** — the latest load records with batch ID, caliber, quantity, and status
- **Export** — download a full JSON backup of all data

---

### Load Records

The Load Records page groups all loads by cartridge batch. Within each group:

- **Active loads** are shown by default — everything from washing through bullet seating that has not yet been fired
- **Show fired loads** — toggle to reveal loads that have been fired within that batch
- **Show deleted loads** — toggle to reveal soft-deleted loads, shown in red with strikethrough and the deletion note if one was recorded

Each load row shows:
- **Batch ID** (e.g. `#00003-002`) — see [Batch ID Format](#batch-id-format)
- **Quantity** — number of rounds in this load
- **Cycle** — which reload cycle this is for the batch
- **Date** — load creation date
- **Current step** — where in the workflow this load is
- **Status** — Active, Completed, or Fired

#### Deleting a load (admin only)

Click the trash icon on any load row. A dialog asks whether to restock components back to inventory:

- **Restock primers** — returns the primer quantity used
- **Restock powder** — returns the total powder weight in grams
- **Restock bullets** — returns the bullet quantity used
- **Note** — optional reason for deletion, stored and shown in the deleted loads view

---

### The Reloading Workflow

Each load follows an 8-step workflow. Open a load by clicking **Workflow →** in the load list. Steps can be individually skipped where not applicable.

| Step | What you record |
|---|---|
| **1. Washing** | Duration in minutes and date of initial cleaning |
| **2. Calibration** | Sizing method (e.g. Full Length Resize, Neck Sizing) |
| **3. Trim** | Final case length (L6 measurement in inches) |
| **4. Annealing** | Mark cases as annealed |
| **5. Second Washing** | Duration and date of post-prep cleaning |
| **6. Priming** | Select primer from inventory; quantity used is recorded |
| **7. Powder** | Either a single powder + charge weight, or a linked Charge Ladder |
| **8. Bullet Seating** | Select bullet, record COAL and OAL in inches |

All step dates are recorded and displayed in European format (dd/mm/yyyy).

#### Completing a load

Once all steps are done, click **Mark as Completed**. This:
- Changes the load status to Completed
- Automatically deducts bullets, primers, and powder from inventory

#### Marking as fired

After shooting, click **Mark as Fired**. Optionally record:
- **H₂O weight** of the fired brass (tracks case expansion over multiple cycles)
- **Best charge level** if the load used a charge ladder

#### Starting a new cycle

After a load is fired, click **Start New Cycle**. A new load record is created for the same batch of brass:
- Inherits the same batch number
- Cycle number increments automatically (e.g. `#00003-002` → `#00003-003`)
- No additional inventory is consumed — the brass is being reused

#### Undoing states (admin only)

Admins can reverse the last final state:
- **Undo Completion** — returns a Completed load to In Progress
- **Undo Fired** — clears the fired flag and H₂O weight

---

### Cartridges

Tracks your brass by batch. Each record represents a specific batch from a specific manufacturer.

**Fields:**
- Manufacturer, Caliber, Production Charge (headstamp batch identifier)
- Quantity Total and Quantity Loaded
- Average H₂O internal volume (grains)
- Shoulder diameter, base diameter, neck wall thickness (inches)
- AMP Aztec Code and Pilot Number (for AMP annealing machines)
- Notes and photo

The expanded view for each cartridge batch shows all loads ever created from it, with batch ID, date, quantity, and status.

---

### Bullets

Inventory of projectiles. Each record tracks:
- Manufacturer, model/type, caliber, weight (grains), length (inches)
- Quantity in stock
- Photo and notes

Quantity is automatically deducted when a load using that bullet is marked as completed.

---

### Primers

Inventory of primers. Each record tracks:
- Manufacturer, type (e.g. Small Rifle, Large Pistol), quantity in stock
- Notes

Quantity is automatically deducted when a load using that primer is marked as completed.

---

### Powders

Inventory of propellant powders. Each record tracks:
- Manufacturer, powder name/type, quantity in stock (grams)
- Notes

Quantity is deducted in grams when a load is completed, calculated as charge weight × number of rounds.

---

### Charge Ladders

Used for systematic load development — testing multiple powder charges in a single range session.

**Creating a ladder:**

1. Go to **Charge Ladders** and click **New Ladder**
2. Give it a name and select the powder
3. Add levels — each level defines a charge weight in grains and how many rounds to load at that weight

**Linking to a load:**

In the Powder step of the load workflow, choose **Use Charge Ladder** instead of a single charge and select your ladder.

**After firing:**

In the **Mark as Fired** dialog, select the **Best Level** — the charge that produced the best results. This level is highlighted with a ★ in the ladder view for future reference.

---

### History

A consolidated table showing performance data for cartridge batches over time — total rounds reloaded, number of cycles completed, and times fired.

---

## Settings

Accessible from the sidebar. All tabs are admin-only except personal notification preferences.

### General

- **Low Stock Thresholds** — quantities at which bullets (units), powder (grams), and primers (units) trigger a dashboard warning and email notification
- **Next Load Number** — the auto-incrementing counter used to generate batch IDs; can be adjusted if needed
- **Branding** — upload a custom logo and background image stored in the database

### Mail / SMTP

Configure outgoing email for notifications:

| Field | Description |
|---|---|
| Host | SMTP server hostname (e.g. `smtp.gmail.com`) |
| Port | Usually `587` (STARTTLS) or `465` (SSL) |
| Username | SMTP authentication username |
| Password | SMTP authentication password |
| From address | The `From:` address in sent emails |
| Enabled | Master toggle for all outgoing notifications |

Use **Send Test Email** to verify the configuration. **Mail History** shows the last 100 sent or failed email attempts with timestamps and any error details.

### Backup & Restore

- **Download Backup** — exports all data (loads, inventory, settings, users) as a single JSON file
- **Restore Backup** — upload a previously downloaded JSON file to fully restore the database

> Restore replaces all existing data. Always download a backup before restoring.

### Reference Lists

Manage the dropdown options used throughout the application:

- Calibers
- Cartridge manufacturers
- Bullet manufacturers
- Powder manufacturers
- Primer manufacturers
- Powder types
- Primer types

Add, rename, or remove entries. Changes take effect immediately across all forms.

---

## Batch ID Format

Every load gets a batch ID in the format **`#LLLLL-CCC`**:

- `LLLLL` — five-digit zero-padded load number (increments globally for each new load)
- `CCC` — three-digit zero-padded cycle number (starts at `001`, increments each time the same brass is reloaded via **Start New Cycle**)

**Examples:**

| Scenario | Batch ID |
|---|---|
| New load from a fresh batch of brass | `#00007-001` |
| Same brass reloaded a second time | `#00007-002` |
| Same brass reloaded a third time | `#00007-003` |
| A completely different cartridge batch | `#00008-001` |

Two independent loads created from the same cartridge stock each get their own load number but both start at cycle `001`:

| Scenario | Batch ID |
|---|---|
| 50 rounds from Batch A | `#00007-001` |
| Another 50 rounds from the same Batch A | `#00008-001` |

---

## Building from Source

For local development without Docker:

### Prerequisites

- Node.js 22
- pnpm 10 (`npm install -g pnpm@10`)
- PostgreSQL 16 running locally

### Setup

```bash
# Install all dependencies
pnpm install

# Create your local environment
export DATABASE_URL="postgres://user:password@localhost:5432/reloading"
export SESSION_SECRET="dev-secret-change-me"

# Start the API server (auto-runs migrations on startup)
pnpm --filter @workspace/api-server run dev

# In a second terminal — start the React dev server
pnpm --filter @workspace/reloading-manager run dev
```

The frontend is served at `http://localhost:5173` in development mode and proxies API calls to the backend automatically.

---

## License

MIT
