import { pgTable, serial, text, integer, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bulletsTable = pgTable("bullets", {
  id: serial("id").primaryKey(),
  manufacturer: text("manufacturer").notNull(),
  model: text("model").notNull(),
  weightGr: doublePrecision("weight_gr").notNull(),
  diameterIn: doublePrecision("diameter_in").notNull(),
  quantityAvailable: integer("quantity_available").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBulletSchema = createInsertSchema(bulletsTable).omit({ id: true, createdAt: true });
export type InsertBullet = z.infer<typeof insertBulletSchema>;
export type Bullet = typeof bulletsTable.$inferSelect;
