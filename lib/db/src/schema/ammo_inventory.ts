import { pgTable, serial, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

export const ammoInventoryTable = pgTable("ammo_inventory", {
  id: serial("id").primaryKey(),
  manufacturer: text("manufacturer").notNull(),
  caliber: text("caliber").notNull(),
  model: text("model").notNull(),
  bulletWeightGr: doublePrecision("bullet_weight_gr"),
  countTotal: integer("count_total").notNull().default(0),
  countFired: integer("count_fired").notNull().default(0),
  notes: text("notes"),
  photoBase64: text("photo_base64"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AmmoInventory = typeof ammoInventoryTable.$inferSelect;
