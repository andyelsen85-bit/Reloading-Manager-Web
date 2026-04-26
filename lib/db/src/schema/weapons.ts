import { pgTable, serial, text, integer, timestamp, doublePrecision, boolean } from "drizzle-orm/pg-core";

export const weaponsTable = pgTable("weapons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  model: text("model"),
  type: text("type").notNull(),
  caliber: text("caliber"),
  serialNumber: text("serial_number"),
  actionType: text("action_type"),
  barrelLengthIn: doublePrecision("barrel_length_in"),
  weightKg: doublePrecision("weight_kg"),
  color: text("color"),
  countryOfOrigin: text("country_of_origin"),
  buyDate: text("buy_date"),
  buyPrice: doublePrecision("buy_price"),
  buyFrom: text("buy_from"),
  sold: boolean("sold").notNull().default(false),
  sellDate: text("sell_date"),
  sellPrice: doublePrecision("sell_price"),
  soldTo: text("sold_to"),
  soldNotes: text("sold_notes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const weaponPhotosTable = pgTable("weapon_photos", {
  id: serial("id").primaryKey(),
  weaponId: integer("weapon_id").notNull(),
  photoBase64: text("photo_base64").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
