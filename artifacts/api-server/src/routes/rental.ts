import { and, desc, eq, gte, ne, sum } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreatePaymentBody,
  CreatePropertyBody,
  CreateRepairBody,
  CreateContactRevealBody,
  CreateTenantBody,
  CreateUnitBody,
  CreatePropertyResponse,
  CreatePaymentResponse,
  CreateContactRevealResponse,
  CreateRepairResponse,
  CreateTenantResponse,
  CreateUnitResponse,
  GetAgreementsResponse,
  GetPaymentsResponse,
  GetPropertiesResponse,
  GetRepairsResponse,
  GetRentalActivityResponse,
  GetRentalActivityResponseItem,
  GetRentalAnalyticsQueryParams,
  GetRentalAnalyticsResponse,
  GetRentalDashboardResponse,
  GetTenantsResponse,
  GetUnitsResponse,
  GetUnitsResponseItem,
  SignAgreementBody,
  SignAgreementParams,
  SignAgreementResponse,
  UpdateRepairBody,
  UpdateRepairParams,
  UpdateRepairResponse,
  UpdateUnitBody,
  UpdateUnitParams,
  UpdateUnitResponse,
  type Activity,
  type Unit,
} from "@workspace/api-zod";
import {
  agreementsTable,
  contactRevealsTable,
  db,
  paymentsTable,
  propertiesTable,
  repairsTable,
  tenantsTable,
  unitsTable,
} from "@workspace/db";

const router: IRouter = Router();

const money = (value: string | number | null | undefined): number =>
  Number(value ?? 0);

function monthStart(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + amount);
  return result;
}

function dateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

let seedPromise: Promise<void> | undefined;

async function seedDemoData(): Promise<void> {
  const [existing] = await db.select({ id: propertiesTable.id }).from(propertiesTable).limit(1);
  if (existing) return;

  const now = new Date();
  const [property] = await db
    .insert(propertiesTable)
    .values({
      name: "Mirembe Court",
      address: "Kisaasi, Kampala",
      description: "A quiet, well-kept home close to the city.",
    })
    .returning();

  const [grace] = await db
    .insert(tenantsTable)
    .values({ fullName: "Grace Nabirye", phone: "+256 772 481 206" })
    .returning();
  const [daniel] = await db
    .insert(tenantsTable)
    .values({ fullName: "Daniel Okello", phone: "+256 704 329 518" })
    .returning();

  const [unitA1] = await db
    .insert(unitsTable)
    .values({
      propertyId: property.id,
      unitNumber: "A1",
      bedrooms: 2,
      rentAmount: 450000,
      tenantId: grace.id,
      status: "paid",
    })
    .returning();
  const [unitA2] = await db
    .insert(unitsTable)
    .values({
      propertyId: property.id,
      unitNumber: "A2",
      bedrooms: 2,
      rentAmount: 600000,
      tenantId: daniel.id,
      status: "late",
    })
    .returning();
  const [unitB1] = await db
    .insert(unitsTable)
    .values({
      propertyId: property.id,
      unitNumber: "B1",
      bedrooms: 1,
      rentAmount: 350000,
      status: "vacant",
    })
    .returning();

  await db.insert(paymentsTable).values([
    {
      unitId: unitA1.id,
      amount: 450000,
      method: "mobile_money",
      status: "paid",
      recordedBy: "Amina · Caretaker",
      reference: "MTN-804215",
      recordedAt: now,
    },
    {
      unitId: unitA2.id,
      amount: 250000,
      method: "cash",
      status: "paid",
      recordedBy: "Amina · Caretaker",
      reference: null,
      recordedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      unitId: unitA1.id,
      amount: 450000,
      method: "bank",
      status: "paid",
      recordedBy: "Amina · Caretaker",
      reference: "BANK-392818",
      recordedAt: addMonths(now, -1),
    },
  ]);

  await db.insert(repairsTable).values([
    {
      unitId: unitA2.id,
      title: "Kitchen tap is leaking",
      description: "Water is dripping steadily under the kitchen sink.",
      status: "in_progress",
      cost: 85000,
      assignedTo: "Moses · Plumber",
      reportedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      unitId: unitA1.id,
      title: "Replace porch light",
      description: "The light outside the front door has stopped working.",
      status: "reported",
      cost: null,
      assignedTo: null,
      reportedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
  ]);

  await db.insert(agreementsTable).values([
    {
      tenantId: grace.id,
      unitId: unitA1.id,
      monthlyRent: 450000,
      deposit: 450000,
      startDate: dateOnly(addMonths(now, -8)),
      endDate: dateOnly(addMonths(now, 4)),
      nextDueDate: dateOnly(addMonths(now, 1)),
      signedAt: new Date(addMonths(now, -8)),
    },
    {
      tenantId: daniel.id,
      unitId: unitA2.id,
      monthlyRent: 600000,
      deposit: 600000,
      startDate: dateOnly(addMonths(now, -10)),
      endDate: dateOnly(addMonths(now, 1)),
      nextDueDate: dateOnly(addMonths(now, 1)),
      signedAt: new Date(addMonths(now, -10)),
    },
  ]);
}

async function ensureSeeded(): Promise<void> {
  seedPromise ??= seedDemoData();
  await seedPromise;
}

async function collectedByUnit(): Promise<Map<number, number>> {
  const rows = await db
    .select({ unitId: paymentsTable.unitId, total: sum(paymentsTable.amount) })
    .from(paymentsTable)
    .where(gte(paymentsTable.recordedAt, monthStart()))
    .groupBy(paymentsTable.unitId);
  return new Map(rows.map((row) => [row.unitId, money(row.total)]));
}

function unitStatus(
  unit: typeof unitsTable.$inferSelect,
  balance: number,
): "paid" | "pending" | "late" | "vacant" | "repair" {
  if (unit.status === "repair") return "repair";
  if (unit.tenantId == null) return "vacant";
  if (balance <= 0) return "paid";
  return new Date().getDate() > 5 ? "late" : "pending";
}

async function unitDtos(): Promise<Unit[]> {
  const [units, tenants, collected] = await Promise.all([
    db.select().from(unitsTable).orderBy(unitsTable.unitNumber),
    db.select().from(tenantsTable),
    collectedByUnit(),
  ]);
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant.fullName]));
  return units.map((unit) => {
    const balance =
      unit.tenantId == null ? 0 : Math.max(0, unit.rentAmount - (collected.get(unit.id) ?? 0));
    return GetUnitsResponseItem.parse({
      ...unit,
      status: unitStatus(unit, balance),
      tenantName: unit.tenantId == null ? null : tenantById.get(unit.tenantId) ?? null,
      balance,
    });
  });
}

async function activityDtos(): Promise<Activity[]> {
  const [payments, repairs, agreements, units, tenants, contactReveals] = await Promise.all([
    db.select().from(paymentsTable).orderBy(desc(paymentsTable.recordedAt)).limit(20),
    db.select().from(repairsTable).orderBy(desc(repairsTable.reportedAt)).limit(20),
    db.select().from(agreementsTable).orderBy(desc(agreementsTable.signedAt)).limit(20),
    db.select().from(unitsTable),
    db.select().from(tenantsTable),
    db.select().from(contactRevealsTable).orderBy(desc(contactRevealsTable.occurredAt)).limit(20),
  ]);
  const unitById = new Map(units.map((unit) => [unit.id, unit.unitNumber]));
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant.fullName]));
  const activity = [
    ...payments.map((payment) => ({
      id: payment.id,
      unitId: payment.unitId,
      unitNumber: unitById.get(payment.unitId) ?? "—",
      title: "Payment recorded",
      detail: `UGX ${payment.amount.toLocaleString("en-UG")} · ${payment.method.replace("_", " ")}`,
      actor: payment.recordedBy,
      type: "payment" as const,
      occurredAt: payment.recordedAt.toISOString(),
    })),
    ...repairs.map((repair) => ({
      id: 1_000_000 + repair.id,
      unitId: repair.unitId,
      unitNumber: unitById.get(repair.unitId) ?? "—",
      title: repair.title,
      detail: `Repair ${repair.status.replace("_", " ")}`,
      actor: repair.assignedTo ?? "Tenant report",
      type: "repair" as const,
      occurredAt: repair.reportedAt.toISOString(),
    })),
    ...agreements.map((agreement) => ({
      id: 2_000_000 + agreement.id,
      unitId: agreement.unitId,
      unitNumber: unitById.get(agreement.unitId) ?? "—",
      title: "Agreement signed",
      detail: tenantById.get(agreement.tenantId) ?? "Tenant",
      actor: tenantById.get(agreement.tenantId) ?? "Tenant",
      type: "agreement" as const,
      occurredAt: agreement.signedAt?.toISOString() ?? `${agreement.startDate}T00:00:00.000Z`,
    })),
    ...contactReveals.map((reveal) => ({
      id: 3_000_000 + reveal.id,
      unitId: reveal.unitId ?? 0,
      unitNumber: reveal.unitId == null ? "Tenant record" : unitById.get(reveal.unitId) ?? "—",
      title: "Tenant contact revealed",
      detail: `Phone number opened for ${tenantById.get(reveal.tenantId) ?? "tenant"}`,
      actor: `${reveal.actorRole} (demo)`,
      type: "contact_reveal" as const,
      occurredAt: reveal.occurredAt.toISOString(),
    })),
  ];
  return activity
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 20)
    .map((entry) => GetRentalActivityResponseItem.parse(entry));
}

router.get("/rental/dashboard", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const [property, units, payments, repairs, activity] = await Promise.all([
    db.select().from(propertiesTable).orderBy(propertiesTable.id).limit(1),
    unitDtos(),
    db.select().from(paymentsTable).where(gte(paymentsTable.recordedAt, monthStart())),
    db.select().from(repairsTable),
    activityDtos(),
  ]);
  const totalCollected = payments.reduce((total, payment) => total + payment.amount, 0);
  const occupiedUnits = units.filter((unit) => unit.tenantId != null).length;
  const outstanding = units.reduce((total, unit) => total + unit.balance, 0);
  const digitalCollected = payments
    .filter((payment) => payment.method !== "cash")
    .reduce((total, payment) => total + payment.amount, 0);
  const paidToday = payments.filter(
    (payment) => payment.recordedAt.toDateString() === new Date().toDateString(),
  ).length;
  const lateCount = units.filter((unit) => unit.status === "late").length;
  const unresolvedRepairs = repairs.filter((repair) => repair.status !== "done").length;
  const dashboard = GetRentalDashboardResponse.parse({
    propertyName: property[0]?.name ?? "Your property",
    totalCollected,
    outstanding,
    occupiedUnits,
    totalUnits: units.length,
    paidToday,
    trustPercent: totalCollected === 0 ? 0 : Math.round((digitalCollected / totalCollected) * 100),
    lateCount,
    unresolvedRepairs,
    unverifiedPayments: 0,
    units,
    attention: [
      ...(lateCount ? [`${lateCount} rent payment${lateCount === 1 ? "" : "s"} overdue`] : []),
      ...(unresolvedRepairs
        ? [`${unresolvedRepairs} repair${unresolvedRepairs === 1 ? "" : "s"} need attention`]
        : []),
    ],
    activity,
  });
  res.json(GetRentalDashboardResponse.parse(dashboard));
});

router.get("/rental/properties", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const properties = await db.select().from(propertiesTable).orderBy(propertiesTable.id);
  const units = await db.select().from(unitsTable);
  res.json(
    GetPropertiesResponse.parse(
      properties.map((property) => ({
        ...property,
        unitCount: units.filter((unit) => unit.propertyId === property.id).length,
      })),
    ),
  );
});

router.post("/rental/properties", async (req, res): Promise<void> => {
  await ensureSeeded();
  const body = CreatePropertyBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [property] = await db
    .insert(propertiesTable)
    .values({ ...body.data, description: body.data.description ?? "" })
    .returning();
  res.status(201).json(CreatePropertyResponse.parse({ ...property, unitCount: 0 }));
});

router.get("/rental/units", async (_req, res): Promise<void> => {
  await ensureSeeded();
  res.json(GetUnitsResponse.parse(await unitDtos()));
});

router.post("/rental/units", async (req, res): Promise<void> => {
  await ensureSeeded();
  const body = CreateUnitBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [unit] = await db
    .insert(unitsTable)
    .values({ ...body.data, status: "vacant" })
    .returning();
  res.status(201).json(CreateUnitResponse.parse({ ...unit, tenantName: null, balance: 0 }));
});

router.patch("/rental/units/:id", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = UpdateUnitParams.safeParse(req.params);
  const body = UpdateUnitBody.safeParse(req.body);
  if (!params.success || !body.success) {
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    res.status(400).json({ error: body.success ? "Invalid request body" : body.error.message });
    return;
  }
  const [currentUnit] = await db
    .select()
    .from(unitsTable)
    .where(eq(unitsTable.id, params.data.id));
  if (!currentUnit) {
    res.status(404).json({ error: "Unit not found" });
    return;
  }

  if (body.data.tenantId != null) {
    const [tenant] = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, body.data.tenantId));
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
  }

  const [updated] = await db.transaction(async (tx) => {
    if (body.data.tenantId !== undefined) {
      if (body.data.tenantId != null) {
        await tx
          .update(unitsTable)
          .set({ tenantId: null, status: "vacant" })
          .where(
            and(
              eq(unitsTable.tenantId, body.data.tenantId),
              ne(unitsTable.id, params.data.id),
            ),
          );
      }
      const nextStatus =
        body.data.status ??
        (body.data.tenantId == null ? "vacant" : "pending");
      return tx
        .update(unitsTable)
        .set({ ...body.data, status: nextStatus })
        .where(eq(unitsTable.id, params.data.id))
        .returning();
    }

    return tx
      .update(unitsTable)
      .set(body.data)
      .where(eq(unitsTable.id, params.data.id))
      .returning();
  });
  if (!updated) {
    res.status(404).json({ error: "Unit not found" });
    return;
  }
  const [unit] = (await unitDtos()).filter((item) => item.id === updated.id);
  res.json(UpdateUnitResponse.parse(unit));
});

router.get("/rental/tenants", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const [tenants, units, agreements, repairs, collected] = await Promise.all([
    db.select().from(tenantsTable).orderBy(tenantsTable.fullName),
    db.select().from(unitsTable),
    db.select().from(agreementsTable).orderBy(desc(agreementsTable.startDate)),
    db.select().from(repairsTable),
    collectedByUnit(),
  ]);
  const result = tenants.map((tenant) => {
    const unit = units.find((item) => item.tenantId === tenant.id);
    const agreement = agreements.find((item) => item.tenantId === tenant.id);
    const balance = unit
      ? Math.max(0, unit.rentAmount - (collected.get(unit.id) ?? 0))
      : 0;
    return {
      id: tenant.id,
      fullName: tenant.fullName,
      phone: tenant.phone,
      unitId: unit?.id ?? null,
      unitNumber: unit?.unitNumber ?? null,
      agreementStart: agreement?.startDate ?? null,
      agreementEnd: agreement?.endDate ?? null,
      openRequests: repairs.filter((repair) => repair.unitId === unit?.id && repair.status !== "done").length,
      balance,
    };
  });
  res.json(GetTenantsResponse.parse(result));
});

router.post("/rental/tenants", async (req, res): Promise<void> => {
  await ensureSeeded();
  const body = CreateTenantBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.unitId != null) {
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, body.data.unitId));
    if (!unit) {
      res.status(404).json({ error: "Unit not found" });
      return;
    }
    if (unit.tenantId != null) {
      res.status(409).json({ error: "This unit already has a tenant" });
      return;
    }
  }
  const [tenant] = await db
    .insert(tenantsTable)
    .values({ fullName: body.data.fullName, phone: body.data.phone })
    .returning();
  let unit: typeof unitsTable.$inferSelect | undefined;
  if (body.data.unitId != null) {
    [unit] = await db
      .update(unitsTable)
      .set({ tenantId: tenant.id, status: "pending" })
      .where(eq(unitsTable.id, body.data.unitId))
      .returning();
  }
  if (
    unit &&
    body.data.agreementStart &&
    body.data.agreementEnd &&
    body.data.monthlyRent != null
  ) {
    const agreementInsert: typeof agreementsTable.$inferInsert = {
      tenantId: tenant.id,
      unitId: unit.id,
      monthlyRent: body.data.monthlyRent,
      deposit: body.data.deposit ?? 0,
      startDate: dateOnly(body.data.agreementStart),
      endDate: dateOnly(body.data.agreementEnd),
      nextDueDate: dateOnly(addMonths(new Date(), 1)),
      signedAt: null,
    };
    await db.insert(agreementsTable).values(agreementInsert);
  }
  res.status(201).json(
    CreateTenantResponse.parse({
      id: tenant.id,
      fullName: tenant.fullName,
      phone: tenant.phone,
      unitId: unit?.id ?? null,
      unitNumber: unit?.unitNumber ?? null,
      agreementStart: body.data.agreementStart ? dateOnly(body.data.agreementStart) : null,
      agreementEnd: body.data.agreementEnd ? dateOnly(body.data.agreementEnd) : null,
      openRequests: 0,
      balance: unit ? body.data.monthlyRent ?? unit.rentAmount : 0,
    }),
  );
});

router.post("/rental/contact-reveals", async (req, res): Promise<void> => {
  await ensureSeeded();
  const body = CreateContactRevealBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, body.data.tenantId));
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  const [unit] = await db
    .select()
    .from(unitsTable)
    .where(eq(unitsTable.tenantId, tenant.id));
  const [reveal] = await db
    .insert(contactRevealsTable)
    .values({
      tenantId: tenant.id,
      unitId: unit?.id ?? null,
      actorRole: body.data.actorRole,
    })
    .returning();
  res.status(201).json(
    CreateContactRevealResponse.parse({
      id: reveal.id,
      tenantId: reveal.tenantId,
      unitId: reveal.unitId,
      actorRole: reveal.actorRole,
      occurredAt: reveal.occurredAt.toISOString(),
    }),
  );
});

router.get("/rental/payments", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const [payments, units, tenants] = await Promise.all([
    db.select().from(paymentsTable).orderBy(desc(paymentsTable.recordedAt)),
    db.select().from(unitsTable),
    db.select().from(tenantsTable),
  ]);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant.fullName]));
  res.json(
    GetPaymentsResponse.parse(
      payments.map((payment) => {
        const unit = unitById.get(payment.unitId);
        return {
          ...payment,
          unitNumber: unit?.unitNumber ?? "—",
          tenantName: unit?.tenantId ? tenantById.get(unit.tenantId) ?? "Tenant" : "Tenant",
          recordedAt: payment.recordedAt.toISOString(),
          reference: payment.reference,
        };
      }),
    ),
  );
});

router.post("/rental/payments", async (req, res): Promise<void> => {
  await ensureSeeded();
  const body = CreatePaymentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, body.data.unitId));
  if (!unit || unit.tenantId == null) {
    res.status(404).json({ error: "Choose an occupied unit before recording rent" });
    return;
  }
  const duplicateSince = new Date(Date.now() - 60 * 60 * 1000);
  const [duplicate] = await db
    .select({ id: paymentsTable.id })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.unitId, body.data.unitId),
        eq(paymentsTable.amount, body.data.amount),
        gte(paymentsTable.recordedAt, duplicateSince),
      ),
    )
    .limit(1);
  if (duplicate && !body.data.confirmDuplicate) {
    res.status(409).json({ error: "A payment for this unit and amount was recorded recently" });
    return;
  }
  const { confirmDuplicate: _confirmDuplicate, ...paymentData } = body.data;
  const [payment] = await db
    .insert(paymentsTable)
    .values({
      ...paymentData,
      reference: body.data.reference?.trim() || null,
      status: "paid",
    })
    .returning();
  const totals = await collectedByUnit();
  const balance = Math.max(0, unit.rentAmount - (totals.get(unit.id) ?? 0));
  await db
    .update(unitsTable)
    .set({ status: balance === 0 ? "paid" : "pending" })
    .where(eq(unitsTable.id, unit.id));
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, unit.tenantId));
  res.status(201).json(
    CreatePaymentResponse.parse({
      ...payment,
      unitNumber: unit.unitNumber,
      tenantName: tenant?.fullName ?? "Tenant",
      recordedAt: payment.recordedAt.toISOString(),
      reference: payment.reference,
    }),
  );
});

router.get("/rental/repairs", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const [repairs, units, tenants] = await Promise.all([
    db.select().from(repairsTable).orderBy(desc(repairsTable.reportedAt)),
    db.select().from(unitsTable),
    db.select().from(tenantsTable),
  ]);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant.fullName]));
  res.json(
    GetRepairsResponse.parse(
      repairs.map((repair) => {
        const unit = unitById.get(repair.unitId);
        return {
          ...repair,
          unitNumber: unit?.unitNumber ?? "—",
          tenantName: unit?.tenantId ? tenantById.get(unit.tenantId) ?? "Tenant" : "—",
          reportedAt: repair.reportedAt.toISOString(),
          cost: repair.cost,
          assignedTo: repair.assignedTo,
        };
      }),
    ),
  );
});

router.post("/rental/repairs", async (req, res): Promise<void> => {
  await ensureSeeded();
  const body = CreateRepairBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, body.data.unitId));
  if (!unit) {
    res.status(404).json({ error: "Unit not found" });
    return;
  }
  const [repair] = await db
    .insert(repairsTable)
    .values({
      unitId: unit.id,
      title: body.data.title,
      description: body.data.description,
      status: "reported",
    })
    .returning();
  await db.update(unitsTable).set({ status: "repair" }).where(eq(unitsTable.id, unit.id));
  const [tenant] = unit.tenantId
    ? await db.select().from(tenantsTable).where(eq(tenantsTable.id, unit.tenantId))
    : [undefined];
  res.status(201).json(
    CreateRepairResponse.parse({
      ...repair,
      unitNumber: unit.unitNumber,
      tenantName: body.data.tenantName ?? tenant?.fullName ?? "—",
      reportedAt: repair.reportedAt.toISOString(),
      cost: repair.cost,
      assignedTo: repair.assignedTo,
    }),
  );
});

router.patch("/rental/repairs/:id", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = UpdateRepairParams.safeParse(req.params);
  const body = UpdateRepairBody.safeParse(req.body);
  if (!params.success || !body.success) {
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    res.status(400).json({ error: body.success ? "Invalid request body" : body.error.message });
    return;
  }
  const [repair] = await db
    .update(repairsTable)
    .set(body.data)
    .where(eq(repairsTable.id, params.data.id))
    .returning();
  if (!repair) {
    res.status(404).json({ error: "Repair not found" });
    return;
  }
  if (body.data.status === "done") {
    const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, repair.unitId));
    if (unit?.status === "repair") {
      await db
        .update(unitsTable)
        .set({ status: unit.tenantId == null ? "vacant" : "pending" })
        .where(eq(unitsTable.id, unit.id));
    }
  }
  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, repair.unitId));
  const [tenant] =
    unit?.tenantId != null
      ? await db.select().from(tenantsTable).where(eq(tenantsTable.id, unit.tenantId))
      : [undefined];
  res.json(
    UpdateRepairResponse.parse({
      ...repair,
      unitNumber: unit?.unitNumber ?? "—",
      tenantName: tenant?.fullName ?? "—",
      reportedAt: repair.reportedAt.toISOString(),
      cost: repair.cost,
      assignedTo: repair.assignedTo,
    }),
  );
});

router.get("/rental/agreements", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const [agreements, units, tenants] = await Promise.all([
    db.select().from(agreementsTable).orderBy(agreementsTable.endDate),
    db.select().from(unitsTable),
    db.select().from(tenantsTable),
  ]);
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant.fullName]));
  res.json(
    GetAgreementsResponse.parse(
      agreements.map((agreement) => ({
        ...agreement,
        unitNumber: unitById.get(agreement.unitId)?.unitNumber ?? "—",
        tenantName: tenantById.get(agreement.tenantId) ?? "Tenant",
        signedAt: agreement.signedAt?.toISOString() ?? null,
      })),
    ),
  );
});

router.post("/rental/agreements/:id/sign", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = SignAgreementParams.safeParse(req.params);
  const body = SignAgreementBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [agreement] = await db
    .select()
    .from(agreementsTable)
    .where(eq(agreementsTable.id, params.data.id));
  if (!agreement) {
    res.status(404).json({ error: "Agreement not found" });
    return;
  }
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, agreement.tenantId));
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  if (body.data.signerName.trim().toLocaleLowerCase() !== tenant.fullName.trim().toLocaleLowerCase()) {
    res.status(400).json({ error: "Enter the tenant's full name to match this agreement." });
    return;
  }
  const [signed] = agreement.signedAt
    ? [agreement]
    : await db
        .update(agreementsTable)
        .set({ signedAt: new Date() })
        .where(eq(agreementsTable.id, agreement.id))
        .returning();
  const [unit] = await db
    .select()
    .from(unitsTable)
    .where(eq(unitsTable.id, agreement.unitId));
  res.json(
    SignAgreementResponse.parse({
      ...signed,
      unitNumber: unit?.unitNumber ?? "—",
      tenantName: tenant.fullName,
      signedAt: signed.signedAt?.toISOString() ?? null,
    }),
  );
});

router.get("/rental/analytics", async (req, res): Promise<void> => {
  await ensureSeeded();
  const query = GetRentalAnalyticsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const payments = await db.select().from(paymentsTable);
  const units = await db.select().from(unitsTable);
  const points =
    query.data.period === "year"
      ? Array.from({ length: 12 }, (_, index) => {
          const collected = payments
            .filter((payment) => payment.recordedAt.getFullYear() === year && payment.recordedAt.getMonth() === index)
            .reduce((total, payment) => total + payment.amount, 0);
          return {
            label: new Date(year, index, 1).toLocaleString("en", { month: "short" }),
            collected,
            outstanding: Math.max(0, units.reduce((total, unit) => total + (unit.tenantId ? unit.rentAmount : 0), 0) - collected),
          };
        })
      : Array.from({ length: 4 }, (_, index) => {
          const firstDay = index * 7 + 1;
          const lastDay = index === 3 ? new Date(year, month + 1, 0).getDate() : firstDay + 6;
          const collected = payments
            .filter(
              (payment) =>
                payment.recordedAt.getFullYear() === year &&
                payment.recordedAt.getMonth() === month &&
                payment.recordedAt.getDate() >= firstDay &&
                payment.recordedAt.getDate() <= lastDay,
            )
            .reduce((total, payment) => total + payment.amount, 0);
          return {
            label: `${firstDay}–${lastDay}`,
            collected,
            outstanding: Math.max(0, units.reduce((total, unit) => total + (unit.tenantId ? unit.rentAmount : 0), 0) - collected),
          };
        });
  const current = points.reduce((total, point) => total + point.collected, 0);
  const insight =
    current > 0
      ? `UGX ${current.toLocaleString("en-UG")} collected in ${query.data.period === "year" ? "this year" : "this month"}.`
      : "No rent has been recorded in this period yet.";
  res.json(
    GetRentalAnalyticsResponse.parse(
      GetRentalAnalyticsResponse.parse({ period: query.data.period, points, insight }),
    ),
  );
});

router.get("/rental/activity", async (_req, res): Promise<void> => {
  await ensureSeeded();
  res.json(GetRentalActivityResponse.parse(await activityDtos()));
});

export default router;
