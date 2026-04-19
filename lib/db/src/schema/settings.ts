import { pgTable, serial, integer, doublePrecision, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  bulletLowStockThreshold: integer("bullet_low_stock_threshold").notNull().default(100),
  powderLowStockThreshold: doublePrecision("powder_low_stock_threshold").notNull().default(500),
  primerLowStockThreshold: integer("primer_low_stock_threshold").notNull().default(100),
  nextLoadNumber: integer("next_load_number").notNull().default(1),
  logoBase64: text("logo_base64"),
  backgroundBase64: text("background_base64"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
