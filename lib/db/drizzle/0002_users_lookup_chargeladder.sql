-- Users
CREATE TABLE "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "username" text NOT NULL UNIQUE,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "role" text NOT NULL DEFAULT 'user',
  "active" boolean NOT NULL DEFAULT true,
  "notifications_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Reference data (calibers, manufacturers)
CREATE TABLE "reference_data" (
  "id" serial PRIMARY KEY NOT NULL,
  "category" text NOT NULL,
  "value" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  UNIQUE("category", "value")
);
--> statement-breakpoint

-- Charge ladders (load development)
CREATE TABLE "charge_ladders" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "caliber" text NOT NULL,
  "cartridge_id" integer NOT NULL,
  "bullet_id" integer,
  "primer_id" integer,
  "cartridges_per_level" integer NOT NULL DEFAULT 3,
  "notes" text,
  "status" text NOT NULL DEFAULT 'planning',
  "best_level_id" integer,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Charge levels (individual charge weights within a ladder)
CREATE TABLE "charge_levels" (
  "id" serial PRIMARY KEY NOT NULL,
  "ladder_id" integer NOT NULL REFERENCES "charge_ladders"("id") ON DELETE CASCADE,
  "charge_gr" double precision NOT NULL,
  "cartridge_count" integer NOT NULL DEFAULT 3,
  "sort_order" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'planned',
  "notes" text,
  "oal_in" double precision,
  "coal_in" double precision,
  "group_size_mm" double precision,
  "velocity_fps" double precision,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Soft delete and SMTP for loads
ALTER TABLE "loads" ADD COLUMN "deleted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "deleted_note" text;
--> statement-breakpoint

-- SMTP settings
ALTER TABLE "settings" ADD COLUMN "smtp_host" text;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "smtp_port" integer DEFAULT 587;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "smtp_user" text;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "smtp_pass" text;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "smtp_from" text;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "smtp_enabled" boolean DEFAULT false;
--> statement-breakpoint

-- Pre-populate calibers
INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
  ('caliber', '.17 HMR', 10),
  ('caliber', '.22 LR', 20),
  ('caliber', '.22 WMR', 30),
  ('caliber', '.22-250 Remington', 40),
  ('caliber', '.223 Remington / 5.56 NATO', 50),
  ('caliber', '.243 Winchester', 60),
  ('caliber', '6mm Creedmoor', 70),
  ('caliber', '6mm BR Norma', 80),
  ('caliber', '6mm PPC', 90),
  ('caliber', '6.5 Creedmoor', 100),
  ('caliber', '6.5 PRC', 110),
  ('caliber', '6.5x47 Lapua', 120),
  ('caliber', '6.5x55 Swedish', 130),
  ('caliber', '6.5-284 Norma', 140),
  ('caliber', '.260 Remington', 150),
  ('caliber', '.25-06 Remington', 160),
  ('caliber', '.270 Winchester', 170),
  ('caliber', '.270 WSM', 180),
  ('caliber', '7mm-08 Remington', 190),
  ('caliber', '7mm Remington Magnum', 200),
  ('caliber', '7mm PRC', 210),
  ('caliber', '7mm WSM', 220),
  ('caliber', '.280 Remington', 230),
  ('caliber', '.280 Ackley Improved', 240),
  ('caliber', '.30-06 Springfield', 250),
  ('caliber', '.30-30 Winchester', 260),
  ('caliber', '.308 Winchester / 7.62x51 NATO', 270),
  ('caliber', '.300 Winchester Magnum', 280),
  ('caliber', '.300 PRC', 290),
  ('caliber', '.300 WSM', 300),
  ('caliber', '.300 Norma Magnum', 310),
  ('caliber', '.300 Weatherby Magnum', 320),
  ('caliber', '.338 Lapua Magnum', 330),
  ('caliber', '.338 Winchester Magnum', 340),
  ('caliber', '.375 H&H Magnum', 350),
  ('caliber', '.416 Rigby', 360),
  ('caliber', '.450 Bushmaster', 370),
  ('caliber', '.45-70 Government', 380),
  ('caliber', '9mm Luger / 9x19 Parabellum', 390),
  ('caliber', '.40 S&W', 400),
  ('caliber', '.45 ACP', 410),
  ('caliber', '.380 ACP', 420),
  ('caliber', '10mm Auto', 430),
  ('caliber', '.357 Magnum', 440),
  ('caliber', '.44 Magnum', 450),
  ('caliber', '.357 SIG', 460);
--> statement-breakpoint

-- Pre-populate bullet manufacturers
INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
  ('bullet_manufacturer', 'Berger', 10),
  ('bullet_manufacturer', 'Barnes', 20),
  ('bullet_manufacturer', 'Federal', 30),
  ('bullet_manufacturer', 'Hornady', 40),
  ('bullet_manufacturer', 'Lapua', 50),
  ('bullet_manufacturer', 'Lehigh Defense', 60),
  ('bullet_manufacturer', 'Nosler', 70),
  ('bullet_manufacturer', 'Remington', 80),
  ('bullet_manufacturer', 'Sierra', 90),
  ('bullet_manufacturer', 'Speer', 100),
  ('bullet_manufacturer', 'Swift', 110),
  ('bullet_manufacturer', 'Winchester', 120),
  ('bullet_manufacturer', 'CCI', 130),
  ('bullet_manufacturer', 'Cutting Edge Bullets', 140),
  ('bullet_manufacturer', 'Hammers', 150),
  ('bullet_manufacturer', 'Peregrine', 160);
--> statement-breakpoint

-- Pre-populate powder manufacturers
INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
  ('powder_manufacturer', 'ADI / Australian Munitions', 10),
  ('powder_manufacturer', 'Accurate Powders', 20),
  ('powder_manufacturer', 'Alliant Powder', 30),
  ('powder_manufacturer', 'Hodgdon', 40),
  ('powder_manufacturer', 'IMR', 50),
  ('powder_manufacturer', 'Lovex', 60),
  ('powder_manufacturer', 'Norma', 70),
  ('powder_manufacturer', 'Ramshot', 80),
  ('powder_manufacturer', 'Vihtavuori', 90),
  ('powder_manufacturer', 'Winchester', 100),
  ('powder_manufacturer', 'Shooters World', 110),
  ('powder_manufacturer', 'Reload Swiss', 120);
--> statement-breakpoint

-- Pre-populate primer manufacturers
INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
  ('primer_manufacturer', 'CCI', 10),
  ('primer_manufacturer', 'Cheddite', 20),
  ('primer_manufacturer', 'Federal', 30),
  ('primer_manufacturer', 'Fiocchi', 40),
  ('primer_manufacturer', 'Lapua', 50),
  ('primer_manufacturer', 'Remington', 60),
  ('primer_manufacturer', 'RWS', 70),
  ('primer_manufacturer', 'Winchester', 80);
--> statement-breakpoint

-- Pre-populate cartridge manufacturers
INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
  ('cartridge_manufacturer', 'Lapua', 10),
  ('cartridge_manufacturer', 'Norma', 20),
  ('cartridge_manufacturer', 'Federal', 30),
  ('cartridge_manufacturer', 'Winchester', 40),
  ('cartridge_manufacturer', 'Remington', 50),
  ('cartridge_manufacturer', 'Hornady', 60),
  ('cartridge_manufacturer', 'PPU / Prvi Partizan', 70),
  ('cartridge_manufacturer', 'Starline', 80),
  ('cartridge_manufacturer', 'Peterson', 90),
  ('cartridge_manufacturer', 'Alpha Munitions', 100),
  ('cartridge_manufacturer', 'ADG', 110),
  ('cartridge_manufacturer', 'Nosler', 120);
