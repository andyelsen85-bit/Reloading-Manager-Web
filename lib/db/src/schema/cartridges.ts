import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cartridgesTable = pgTable("cartridges", {
  id: serial("id").primaryKey(),
  manufacturer: text("manufacturer").notNull(),
  caliber: text("caliber").notNull(),
  productionCharge: text("production_charge").notNull(),
  timesFired: integer("times_fired").notNull().default(0),
  quantityTotal: integer("quantity_total").notNull(),
  quantityLoaded: integer("quantity_loaded").notNull().default(0),
  currentStep: text("current_step").notNull().default("New"),
  l6In: text("l6_in"),
  notes: text("notes"),
  photoBase64: text("photo_base64"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCartridgeSchema = createInsertSchema(cartridgesTable).omit({ id: true, createdAt: true });
export type InsertCartridge = z.infer<typeof insertCartridgeSchema>;
export type Cartridge = typeof cartridgesTable.$inferSelect;
