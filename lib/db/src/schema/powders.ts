import { pgTable, serial, text, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const powdersTable = pgTable("powders", {
  id: serial("id").primaryKey(),
  manufacturer: text("manufacturer").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  grainsAvailable: doublePrecision("grains_available").notNull(),
  notes: text("notes"),
  photoBase64: text("photo_base64"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPowderSchema = createInsertSchema(powdersTable).omit({ id: true, createdAt: true });
export type InsertPowder = z.infer<typeof insertPowderSchema>;
export type Powder = typeof powdersTable.$inferSelect;
