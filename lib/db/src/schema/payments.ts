import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { unitsTable } from "./properties";

export const paymentsTable = pgTable("rental_payments", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull().default("paid"),
  recordedBy: text("recorded_by").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  reference: text("reference"),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, recordedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
