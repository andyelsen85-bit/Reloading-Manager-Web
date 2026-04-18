import { pgTable, serial, text, integer, timestamp, doublePrecision, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const loadsTable = pgTable("loads", {
  id: serial("id").primaryKey(),
  userLoadId: text("user_load_id").notNull(),
  cartridgeId: integer("cartridge_id").notNull(),
  cartridgeProductionCharge: text("cartridge_production_charge").notNull(),
  reloadingCycle: integer("reloading_cycle").notNull().default(1),
  date: text("date").notNull(),
  caliber: text("caliber").notNull(),
  cartridgeQuantityUsed: integer("cartridge_quantity_used").notNull(),
  primerId: integer("primer_id"),
  primerQuantityUsed: integer("primer_quantity_used"),
  powderId: integer("powder_id"),
  powderChargeGr: doublePrecision("powder_charge_gr"),
  powderTotalUsedGr: doublePrecision("powder_total_used_gr"),
  bulletId: integer("bullet_id"),
  bulletQuantityUsed: integer("bullet_quantity_used"),
  coalIn: doublePrecision("coal_in"),
  oalIn: doublePrecision("oal_in"),
  l6In: doublePrecision("l6_in"),
  washingMinutes: integer("washing_minutes"),
  secondWashingMinutes: integer("second_washing_minutes"),
  calibrationType: text("calibration_type"),
  completed: boolean("completed").notNull().default(false),
  fired: boolean("fired").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLoadSchema = createInsertSchema(loadsTable).omit({ id: true, createdAt: true });
export type InsertLoad = z.infer<typeof insertLoadSchema>;
export type Load = typeof loadsTable.$inferSelect;
