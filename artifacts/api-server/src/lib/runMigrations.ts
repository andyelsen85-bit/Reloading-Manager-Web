import type { Pool } from "pg";

const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "0000_init",
    sql: `
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

      CREATE TABLE IF NOT EXISTS "settings" (
        "id" serial PRIMARY KEY,
        "bullet_low_stock_threshold" integer NOT NULL DEFAULT 100,
        "powder_low_stock_threshold" double precision NOT NULL DEFAULT 500,
        "primer_low_stock_threshold" integer NOT NULL DEFAULT 100,
        "next_load_number" integer NOT NULL DEFAULT 1,
        "logo_base64" text,
        "background_base64" text,
        "smtp_host" text,
        "smtp_port" integer DEFAULT 587,
        "smtp_user" text,
        "smtp_pass" text,
        "smtp_from" text,
        "smtp_enabled" boolean DEFAULT false
      );

      INSERT INTO "settings" DEFAULT VALUES ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS "cartridges" (
        "id" serial PRIMARY KEY,
        "manufacturer" text NOT NULL,
        "caliber" text NOT NULL,
        "production_charge" text NOT NULL,
        "times_fired" integer NOT NULL DEFAULT 0,
        "quantity_total" integer NOT NULL,
        "quantity_loaded" integer NOT NULL DEFAULT 0,
        "current_step" text NOT NULL DEFAULT 'New',
        "l6_in" text,
        "notes" text,
        "photo_base64" text,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "bullets" (
        "id" serial PRIMARY KEY,
        "manufacturer" text NOT NULL,
        "model" text NOT NULL,
        "weight_gr" double precision NOT NULL,
        "diameter_in" double precision NOT NULL,
        "quantity_available" integer NOT NULL DEFAULT 0,
        "notes" text,
        "photo_base64" text,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "powders" (
        "id" serial PRIMARY KEY,
        "manufacturer" text NOT NULL,
        "name" text NOT NULL,
        "type" text,
        "grains_available" double precision NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "primers" (
        "id" serial PRIMARY KEY,
        "manufacturer" text NOT NULL,
        "type" text NOT NULL,
        "quantity_available" integer NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "loads" (
        "id" serial PRIMARY KEY,
        "load_number" integer,
        "user_load_id" text,
        "cartridge_id" integer NOT NULL,
        "cartridge_production_charge" text NOT NULL,
        "reloading_cycle" integer NOT NULL DEFAULT 1,
        "date" text NOT NULL,
        "caliber" text NOT NULL,
        "cartridge_quantity_used" integer NOT NULL,
        "primer_id" integer,
        "primer_quantity_used" integer,
        "powder_id" integer,
        "powder_charge_gr" double precision,
        "powder_total_used_gr" double precision,
        "bullet_id" integer,
        "bullet_quantity_used" integer,
        "coal_in" double precision,
        "oal_in" double precision,
        "l6_in" double precision,
        "washing_minutes" integer,
        "annealing_minutes" integer,
        "second_washing_minutes" integer,
        "calibration_type" text,
        "skipped_steps" text,
        "h2o_weight_gr" double precision,
        "photo_base64" text,
        "completed" boolean NOT NULL DEFAULT false,
        "fired" boolean NOT NULL DEFAULT false,
        "notes" text,
        "deleted_at" timestamp,
        "deleted_note" text,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: "0001_features",
    sql: `
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "skipped_steps" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "h2o_weight_gr" double precision;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "photo_base64" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "deleted_note" text;

      CREATE TABLE IF NOT EXISTS "email_log" (
        "id" serial PRIMARY KEY,
        "to_address" text NOT NULL,
        "subject" text NOT NULL,
        "body" text,
        "status" text NOT NULL DEFAULT 'sent',
        "error" text,
        "sent_at" timestamp NOT NULL DEFAULT NOW()
      );

      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_host" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_port" integer DEFAULT 587;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_user" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_pass" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_from" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_enabled" boolean DEFAULT false;
    `,
  },
  {
    id: "0002_users_lookup_chargeladder",
    sql: `
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY,
        "username" text NOT NULL UNIQUE,
        "email" text NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "role" text NOT NULL DEFAULT 'user',
        "active" boolean NOT NULL DEFAULT true,
        "notifications_enabled" boolean NOT NULL DEFAULT true,
        "notification_prefs" text DEFAULT '{}',
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "reference_data" (
        "id" serial PRIMARY KEY,
        "category" text NOT NULL,
        "value" text NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        UNIQUE("category", "value")
      );

      CREATE TABLE IF NOT EXISTS "charge_ladders" (
        "id" serial PRIMARY KEY,
        "name" text NOT NULL,
        "caliber" text NOT NULL,
        "cartridge_id" integer NOT NULL,
        "bullet_id" integer,
        "primer_id" integer,
        "cartridges_per_level" integer NOT NULL DEFAULT 3,
        "notes" text,
        "status" text NOT NULL DEFAULT 'planning',
        "best_level_id" integer,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "charge_levels" (
        "id" serial PRIMARY KEY,
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
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );

      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "load_number" integer;

      -- Reference data: calibers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('caliber', '308 Win', 10), ('caliber', '223 Rem', 20), ('caliber', '6.5 Creedmoor', 30),
        ('caliber', '7mm Rem Mag', 40), ('caliber', '6mm Creedmoor', 50), ('caliber', '300 Win Mag', 60),
        ('caliber', '30-06 Springfield', 70), ('caliber', '9mm', 80), ('caliber', '45 ACP', 90),
        ('caliber', '40 S&W', 100), ('caliber', '38 Special', 110), ('caliber', '357 Magnum', 120)
      ON CONFLICT DO NOTHING;

      -- Reference data: manufacturers (cartridge)
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('cartridge_manufacturer', 'Lapua', 10), ('cartridge_manufacturer', 'Norma', 20),
        ('cartridge_manufacturer', 'Federal', 30), ('cartridge_manufacturer', 'Winchester', 40),
        ('cartridge_manufacturer', 'Remington', 50), ('cartridge_manufacturer', 'Hornady', 60),
        ('cartridge_manufacturer', 'Starline', 70), ('cartridge_manufacturer', 'Peterson', 80)
      ON CONFLICT DO NOTHING;

      -- Reference data: bullet manufacturers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('bullet_manufacturer', 'Sierra', 10), ('bullet_manufacturer', 'Hornady', 20),
        ('bullet_manufacturer', 'Berger', 30), ('bullet_manufacturer', 'Nosler', 40),
        ('bullet_manufacturer', 'Barnes', 50), ('bullet_manufacturer', 'Speer', 60)
      ON CONFLICT DO NOTHING;

      -- Reference data: powder manufacturers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('powder_manufacturer', 'Hodgdon', 10), ('powder_manufacturer', 'IMR', 20),
        ('powder_manufacturer', 'Vihtavuori', 30), ('powder_manufacturer', 'Alliant', 40),
        ('powder_manufacturer', 'Accurate', 50), ('powder_manufacturer', 'Ramshot', 60),
        ('powder_manufacturer', 'ADI', 70), ('powder_manufacturer', 'Shooters World', 80)
      ON CONFLICT DO NOTHING;

      -- Reference data: primer manufacturers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('primer_manufacturer', 'CCI', 10), ('primer_manufacturer', 'Federal', 20),
        ('primer_manufacturer', 'Winchester', 30), ('primer_manufacturer', 'Remington', 40),
        ('primer_manufacturer', 'Lapua', 50), ('primer_manufacturer', 'RWS', 60)
      ON CONFLICT DO NOTHING;
    `,
  },
  {
    id: "0003_annealing_cartridge_fields_chargelevel_powder",
    sql: `
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "annealing_done" boolean NOT NULL DEFAULT false;

      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "primer_type" text;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_empty_weight_gr" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_internal_volume_gr" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_shoulder_diameter_in" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_base_diameter_in" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_neck_wall_thickness_in" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "amp_aztec_code" text;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "amp_pilot_number" text;

      ALTER TABLE "charge_levels" ADD COLUMN IF NOT EXISTS "powder_id" integer;

      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('powder_type', 'Stick', 10), ('powder_type', 'Ball', 20),
        ('powder_type', 'Flake', 30), ('powder_type', 'Flattened Ball', 40)
      ON CONFLICT DO NOTHING;

      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('primer_type', 'Small Pistol (SP)', 10), ('primer_type', 'Large Pistol (LP)', 20),
        ('primer_type', 'Small Rifle (SR)', 30), ('primer_type', 'Large Rifle (LR)', 40)
      ON CONFLICT DO NOTHING;

      -- Admin user: use $NEEDS_SETUP$ sentinel so the web UI prompts for password on first login
      INSERT INTO "users" ("username", "email", "password_hash", "role", "active", "notifications_enabled")
      VALUES ('admin', 'admin@localhost', '$NEEDS_SETUP$', 'admin', true, false)
      ON CONFLICT ("username") DO NOTHING;
    `,
  },
  {
    id: "0004_load_charge_ladder_link",
    sql: `
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "charge_ladder_id" integer REFERENCES "charge_ladders"("id") ON DELETE SET NULL;
    `,
  },
  {
    id: "0005_step_dates_and_fired_date",
    sql: `
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "washing_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "annealing_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "second_washing_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "calibration_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "trim_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "priming_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "powder_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "bullet_seating_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "fired_date" text;
    `,
  },
  {
    id: "0006_extended_reference_data",
    sql: `
      -- Extended calibers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('caliber', '.22 LR', 1), ('caliber', '.17 HMR', 2), ('caliber', '.22 WMR', 3),
        ('caliber', '9mm Luger', 5), ('caliber', '.45 ACP', 6), ('caliber', '.40 S&W', 7),
        ('caliber', '.38 Special', 8), ('caliber', '.357 Magnum', 9), ('caliber', '.357 SIG', 11),
        ('caliber', '.380 ACP', 12), ('caliber', '.44 Magnum', 13), ('caliber', '.44 Special', 14),
        ('caliber', '.10mm Auto', 15), ('caliber', '.45 Colt', 16),
        ('caliber', '.223 Rem', 20), ('caliber', '.308 Win', 21), ('caliber', '.30-06 Springfield', 22),
        ('caliber', '.243 Win', 23), ('caliber', '.270 Win', 24), ('caliber', '.30-30 Win', 25),
        ('caliber', '.45-70 Govt', 26), ('caliber', '.300 Blackout', 27),
        ('caliber', '6.5 Creedmoor', 30), ('caliber', '6mm Creedmoor', 31),
        ('caliber', '6.5 PRC', 32), ('caliber', '6.8 Western', 33),
        ('caliber', '.300 Win Mag', 34), ('caliber', '.300 PRC', 35),
        ('caliber', '.338 Lapua Mag', 36), ('caliber', '7mm PRC', 37),
        ('caliber', '7mm Rem Mag', 38), ('caliber', '.260 Rem', 39),
        ('caliber', '6.5x55 Swedish', 40), ('caliber', '8x57 IS', 41),
        ('caliber', '7x57 Mauser', 42), ('caliber', '9.3x62', 43),
        ('caliber', '6x47 Lapua', 44), ('caliber', '6.5x47 Lapua', 45),
        ('caliber', '.284 Win', 46), ('caliber', '.300 Norma Mag', 47),
        ('caliber', '7.62x39', 48), ('caliber', '5.56x45 NATO', 49),
        ('caliber', '.375 H&H Mag', 50), ('caliber', '.416 Rigby', 51),
        ('caliber', '.458 Win Mag', 52), ('caliber', '.500 S&W Mag', 53)
      ON CONFLICT DO NOTHING;

      -- Extended cartridge/brass manufacturers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('cartridge_manufacturer', 'Lapua', 10), ('cartridge_manufacturer', 'Norma', 20),
        ('cartridge_manufacturer', 'Federal', 30), ('cartridge_manufacturer', 'Winchester', 40),
        ('cartridge_manufacturer', 'Remington', 50), ('cartridge_manufacturer', 'Hornady', 60),
        ('cartridge_manufacturer', 'Starline', 70), ('cartridge_manufacturer', 'Peterson', 80),
        ('cartridge_manufacturer', 'Nosler', 90), ('cartridge_manufacturer', 'ADI', 100),
        ('cartridge_manufacturer', 'PPU', 110), ('cartridge_manufacturer', 'RUAG/RWS', 120),
        ('cartridge_manufacturer', 'Fiocchi', 130), ('cartridge_manufacturer', 'Eley', 140),
        ('cartridge_manufacturer', 'Graf & Sons', 150), ('cartridge_manufacturer', 'Alpha Munitions', 160),
        ('cartridge_manufacturer', 'Bertram', 170), ('cartridge_manufacturer', 'Sellier & Bellot', 180)
      ON CONFLICT DO NOTHING;

      -- Extended bullet manufacturers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('bullet_manufacturer', 'Sierra', 10), ('bullet_manufacturer', 'Hornady', 20),
        ('bullet_manufacturer', 'Berger', 30), ('bullet_manufacturer', 'Nosler', 40),
        ('bullet_manufacturer', 'Barnes', 50), ('bullet_manufacturer', 'Speer', 60),
        ('bullet_manufacturer', 'Lapua', 70), ('bullet_manufacturer', 'Swift', 80),
        ('bullet_manufacturer', 'Federal', 90), ('bullet_manufacturer', 'Cutting Edge', 100),
        ('bullet_manufacturer', 'Hammer Bullets', 110), ('bullet_manufacturer', 'Norma', 120),
        ('bullet_manufacturer', 'Woodleigh', 130), ('bullet_manufacturer', 'Remington', 140),
        ('bullet_manufacturer', 'Winchester', 150), ('bullet_manufacturer', 'Leupold', 160),
        ('bullet_manufacturer', 'GS Custom', 170), ('bullet_manufacturer', 'Peregrine', 180)
      ON CONFLICT DO NOTHING;

      -- Extended powder manufacturers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('powder_manufacturer', 'Hodgdon', 10), ('powder_manufacturer', 'IMR', 20),
        ('powder_manufacturer', 'Vihtavuori', 30), ('powder_manufacturer', 'Alliant', 40),
        ('powder_manufacturer', 'Accurate', 50), ('powder_manufacturer', 'Ramshot', 60),
        ('powder_manufacturer', 'ADI / Thales', 70), ('powder_manufacturer', 'Shooters World', 80),
        ('powder_manufacturer', 'Norma', 90), ('powder_manufacturer', 'Nobel Sport', 100),
        ('powder_manufacturer', 'Lovex / Explosia', 110), ('powder_manufacturer', 'Tubal / Baschieri', 120),
        ('powder_manufacturer', 'Western Powders', 130), ('powder_manufacturer', 'Somchem', 140),
        ('powder_manufacturer', 'Reload Swiss', 150)
      ON CONFLICT DO NOTHING;

      -- Extended primer manufacturers
      INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
        ('primer_manufacturer', 'CCI', 10), ('primer_manufacturer', 'Federal', 20),
        ('primer_manufacturer', 'Winchester', 30), ('primer_manufacturer', 'Remington', 40),
        ('primer_manufacturer', 'Lapua', 50), ('primer_manufacturer', 'RWS', 60),
        ('primer_manufacturer', 'Fiocchi', 70), ('primer_manufacturer', 'Cheddite', 80),
        ('primer_manufacturer', 'Murom', 90), ('primer_manufacturer', 'Nobel Sport', 100),
        ('primer_manufacturer', 'Sellier & Bellot', 110), ('primer_manufacturer', 'Norma', 120)
      ON CONFLICT DO NOTHING;
    `,
  },
  {
    id: "0007_audit_log",
    sql: `
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" serial PRIMARY KEY,
        "user_id" integer,
        "username" text NOT NULL,
        "action" text NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: "0008_bullet_schema_repair",
    sql: `
      ALTER TABLE "bullets" ADD COLUMN IF NOT EXISTS "diameter_in" double precision NOT NULL DEFAULT 0;
      ALTER TABLE "bullets" ADD COLUMN IF NOT EXISTS "photo_base64" text;
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'bullets'
            AND column_name = 'caliber'
        ) THEN
          ALTER TABLE "bullets" ALTER COLUMN "caliber" DROP NOT NULL;
        END IF;
      END $$;
    `,
  },
  {
    id: "0009_backup_schema_repair",
    sql: `
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "quantity_loaded" integer NOT NULL DEFAULT 0;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "current_step" text NOT NULL DEFAULT 'New';
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "l6_in" text;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "photo_base64" text;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "primer_type" text;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_empty_weight_gr" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_internal_volume_gr" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_shoulder_diameter_in" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_base_diameter_in" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_neck_wall_thickness_in" double precision;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "amp_aztec_code" text;
      ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "amp_pilot_number" text;

      ALTER TABLE "bullets" ADD COLUMN IF NOT EXISTS "diameter_in" double precision NOT NULL DEFAULT 0;
      ALTER TABLE "bullets" ADD COLUMN IF NOT EXISTS "photo_base64" text;
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'bullets'
            AND column_name = 'caliber'
        ) THEN
          ALTER TABLE "bullets" ALTER COLUMN "caliber" DROP NOT NULL;
        END IF;
      END $$;

      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "load_number" integer;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "skipped_steps" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "h2o_weight_gr" double precision;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "photo_base64" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "annealing_minutes" integer;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "annealing_done" boolean NOT NULL DEFAULT false;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "washing_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "annealing_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "second_washing_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "calibration_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "trim_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "priming_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "powder_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "bullet_seating_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "fired_date" text;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "charge_ladder_id" integer;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
      ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "deleted_note" text;
      ALTER TABLE "loads" ALTER COLUMN "user_load_id" DROP NOT NULL;

      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logo_base64" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "background_base64" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_host" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_port" integer DEFAULT 587;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_user" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_pass" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_from" text;
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "smtp_enabled" boolean DEFAULT false;
      INSERT INTO "settings" (
        "bullet_low_stock_threshold",
        "powder_low_stock_threshold",
        "primer_low_stock_threshold",
        "next_load_number"
      )
      SELECT 100, 500, 100, 1
      WHERE NOT EXISTS (SELECT 1 FROM "settings");

      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notifications_enabled" boolean NOT NULL DEFAULT true;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_prefs" text DEFAULT '{}';

      ALTER TABLE "charge_levels" ADD COLUMN IF NOT EXISTS "powder_id" integer;
      ALTER TABLE "charge_levels" ADD COLUMN IF NOT EXISTS "oal_in" double precision;
      ALTER TABLE "charge_levels" ADD COLUMN IF NOT EXISTS "coal_in" double precision;
      ALTER TABLE "charge_levels" ADD COLUMN IF NOT EXISTS "group_size_mm" double precision;
      ALTER TABLE "charge_levels" ADD COLUMN IF NOT EXISTS "velocity_fps" double precision;
    `,
  },
];

export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS __app_migrations (
        id text PRIMARY KEY,
        applied_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of MIGRATIONS) {
      const { rows } = await client.query(
        `SELECT id FROM __app_migrations WHERE id = $1`,
        [migration.id]
      );
      if (rows.length > 0) continue;

      console.log(`[migration] applying ${migration.id}…`);
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO __app_migrations (id) VALUES ($1)`,
          [migration.id]
        );
        await client.query("COMMIT");
        console.log(`[migration] ${migration.id} OK`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }
}
