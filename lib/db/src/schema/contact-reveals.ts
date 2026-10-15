import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { tenantsTable, unitsTable } from "./properties";

export const contactRevealsTable = pgTable("rental_contact_reveals", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").references(() => unitsTable.id, { onDelete: "set null" }),
  actorRole: text("actor_role").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContactRevealSchema = createInsertSchema(contactRevealsTable).omit({
  id: true,
  occurredAt: true,
});

export type ContactReveal = typeof contactRevealsTable.$inferSelect;
export type InsertContactReveal = typeof contactRevealsTable.$inferInsert;
