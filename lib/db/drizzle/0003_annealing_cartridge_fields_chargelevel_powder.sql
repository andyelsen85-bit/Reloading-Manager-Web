-- Migration 0003: annealing done flag, cartridge measurement fields, charge level powder, reference types, default admin

-- Loads: add annealing_done boolean (keep annealing_minutes for existing data)
ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "annealing_done" boolean NOT NULL DEFAULT false;

-- Cartridges: add optional measurement/identification fields
ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "primer_type" text;
ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_empty_weight_gr" double precision;
ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_internal_volume_gr" double precision;
ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_shoulder_diameter_in" double precision;
ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_base_diameter_in" double precision;
ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "avg_neck_wall_thickness_in" double precision;
ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "amp_aztec_code" text;
ALTER TABLE "cartridges" ADD COLUMN IF NOT EXISTS "amp_pilot_number" text;

-- Charge levels: add per-level powder selection
ALTER TABLE "charge_levels" ADD COLUMN IF NOT EXISTS "powder_id" integer;

-- Reference data: powder types
INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
  ('powder_type', 'Stick', 10),
  ('powder_type', 'Ball', 20),
  ('powder_type', 'Flake', 30),
  ('powder_type', 'Flattened Ball', 40)
ON CONFLICT DO NOTHING;

-- Reference data: primer types
INSERT INTO "reference_data" ("category", "value", "sort_order") VALUES
  ('primer_type', 'Small Pistol (SP)', 10),
  ('primer_type', 'Large Pistol (LP)', 20),
  ('primer_type', 'Small Rifle (SR)', 30),
  ('primer_type', 'Large Rifle (LR)', 40)
ON CONFLICT DO NOTHING;

-- Default admin user (password: admin)
INSERT INTO "users" ("username", "email", "password_hash", "role", "active", "notifications_enabled")
VALUES ('admin', 'admin@localhost', '$2b$10$N/xSkUCUf6kGiOOznZ4/F.7gG5dcYtJ57LlUx5uhnlT8WeGDpzVMi', 'admin', true, false)
ON CONFLICT ("username") DO NOTHING;
