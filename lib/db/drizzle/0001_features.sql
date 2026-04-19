ALTER TABLE "loads" ADD COLUMN "load_number" integer;
--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "annealing_minutes" integer;
--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "skipped_steps" text;
--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "h2o_weight_gr" double precision;
--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "photo_base64" text;
--> statement-breakpoint
ALTER TABLE "loads" ALTER COLUMN "user_load_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "bullets" ADD COLUMN "photo_base64" text;
--> statement-breakpoint
ALTER TABLE "cartridges" ADD COLUMN "photo_base64" text;
--> statement-breakpoint
CREATE TABLE "settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "bullet_low_stock_threshold" integer NOT NULL DEFAULT 100,
  "powder_low_stock_threshold" double precision NOT NULL DEFAULT 500,
  "primer_low_stock_threshold" integer NOT NULL DEFAULT 100,
  "next_load_number" integer NOT NULL DEFAULT 1,
  "logo_base64" text,
  "background_base64" text
);
--> statement-breakpoint
INSERT INTO "settings" ("bullet_low_stock_threshold", "powder_low_stock_threshold", "primer_low_stock_threshold", "next_load_number") VALUES (100, 500, 100, 1);
