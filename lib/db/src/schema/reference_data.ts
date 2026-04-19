import { pgTable, serial, text, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referenceDataTable = pgTable("reference_data", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [
  unique().on(t.category, t.value),
]);

export const insertReferenceDataSchema = createInsertSchema(referenceDataTable).omit({ id: true });
export type InsertReferenceData = z.infer<typeof insertReferenceDataSchema>;
export type ReferenceData = typeof referenceDataTable.$inferSelect;
