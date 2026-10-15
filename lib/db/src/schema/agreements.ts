import { createInsertSchema } from "drizzle-zod";
import { date, integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { unitsTable } from "./properties";
import { tenantsTable } from "./properties";

export const agreementsTable = pgTable("rental_agreements", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  monthlyRent: integer("monthly_rent").notNull(),
  deposit: integer("deposit").notNull().default(0),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  nextDueDate: date("next_due_date", { mode: "string" }).notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }),
});

export const insertAgreementSchema = createInsertSchema(agreementsTable).omit({ id: true });
export type InsertAgreement = z.infer<typeof insertAgreementSchema>;
export type Agreement = typeof agreementsTable.$inferSelect;
