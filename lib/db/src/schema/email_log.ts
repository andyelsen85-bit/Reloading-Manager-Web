import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailLogTable = pgTable("email_log", {
  id: serial("id").primaryKey(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  status: text("status").notNull().default("sent"),
  error: text("error"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogTable).omit({ id: true, sentAt: true });
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogTable.$inferSelect;
