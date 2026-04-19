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
        "caliber" text NOT NULL,
        "weight_gr" double precision NOT NULL,
        "quantity_available" integer NOT NULL DEFAULT 0,
        "notes" text,
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
