import { pgTable, serial, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chargeLaddersTable = pgTable("charge_ladders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  caliber: text("caliber").notNull(),
  cartridgeId: integer("cartridge_id").notNull(),
  bulletId: integer("bullet_id"),
  primerId: integer("primer_id"),
  cartridgesPerLevel: integer("cartridges_per_level").notNull().default(3),
  notes: text("notes"),
  status: text("status").notNull().default("planning"),
  bestLevelId: integer("best_level_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chargeLevelsTable = pgTable("charge_levels", {
  id: serial("id").primaryKey(),
  ladderId: integer("ladder_id").notNull().references(() => chargeLaddersTable.id, { onDelete: "cascade" }),
  chargeGr: doublePrecision("charge_gr").notNull(),
  cartridgeCount: integer("cartridge_count").notNull().default(3),
  powderId: integer("powder_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
  oalIn: doublePrecision("oal_in"),
  coalIn: doublePrecision("coal_in"),
  groupSizeMm: doublePrecision("group_size_mm"),
  velocityFps: doublePrecision("velocity_fps"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChargeLadderSchema = createInsertSchema(chargeLaddersTable).omit({ id: true, createdAt: true });
export type InsertChargeLadder = z.infer<typeof insertChargeLadderSchema>;
export type ChargeLadder = typeof chargeLaddersTable.$inferSelect;

export const insertChargeLevelSchema = createInsertSchema(chargeLevelsTable).omit({ id: true, createdAt: true });
export type InsertChargeLevel = z.infer<typeof insertChargeLevelSchema>;
export type ChargeLevel = typeof chargeLevelsTable.$inferSelect;
