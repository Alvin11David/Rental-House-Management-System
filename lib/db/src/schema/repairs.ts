import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { unitsTable } from "./properties";

export const repairsTable = pgTable("rental_repairs", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("reported"),
  cost: integer("cost"),
  reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
  assignedTo: text("assigned_to"),
});

export const insertRepairSchema = createInsertSchema(repairsTable).omit({ id: true, reportedAt: true });
export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type Repair = typeof repairsTable.$inferSelect;
