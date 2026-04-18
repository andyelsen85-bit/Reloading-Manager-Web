CREATE TABLE "cartridges" (
	"id" serial PRIMARY KEY NOT NULL,
	"manufacturer" text NOT NULL,
	"caliber" text NOT NULL,
	"production_charge" text NOT NULL,
	"times_fired" integer DEFAULT 0 NOT NULL,
	"quantity_total" integer NOT NULL,
	"quantity_loaded" integer DEFAULT 0 NOT NULL,
	"current_step" text DEFAULT 'New' NOT NULL,
	"l6_in" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bullets" (
	"id" serial PRIMARY KEY NOT NULL,
	"manufacturer" text NOT NULL,
	"model" text NOT NULL,
	"weight_gr" double precision NOT NULL,
	"diameter_in" double precision NOT NULL,
	"quantity_available" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "powders" (
	"id" serial PRIMARY KEY NOT NULL,
	"manufacturer" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"grains_available" double precision NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "primers" (
	"id" serial PRIMARY KEY NOT NULL,
	"manufacturer" text NOT NULL,
	"type" text NOT NULL,
	"quantity_available" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_load_id" text NOT NULL,
	"cartridge_id" integer NOT NULL,
	"cartridge_production_charge" text NOT NULL,
	"reloading_cycle" integer DEFAULT 1 NOT NULL,
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
	"second_washing_minutes" integer,
	"calibration_type" text,
	"completed" boolean DEFAULT false NOT NULL,
	"fired" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
