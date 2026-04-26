import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const primersTable = pgTable("primers", {
  id: serial("id").primaryKey(),
  manufacturer: text("manufacturer").notNull(),
  type: text("type").notNull(),
  quantityAvailable: integer("quantity_available").notNull(),
  notes: text("notes"),
  photoBase64: text("photo_base64"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrimerSchema = createInsertSchema(primersTable).omit({ id: true, createdAt: true });
export type InsertPrimer = z.infer<typeof insertPrimerSchema>;
export type Primer = typeof primersTable.$inferSelect;
