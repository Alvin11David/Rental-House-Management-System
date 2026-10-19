export type Role = "Landlord" | "Caretaker" | "Tenant";
export type UnitStatus = "paid" | "pending" | "late" | "vacant" | "repair";
export type PaymentMethod = "mobile_money" | "cash" | "bank";
export type RepairStatus = "reported" | "assigned" | "in_progress" | "done";
export type ActivityType = "payment" | "repair" | "agreement" | "message" | "contact_reveal";
export type AnalyticsPeriod = "month" | "year";

export interface Property {
  id: number;
  name: string;
  address: string;
  description: string;
  unitCount: number;
  photoDataUrls?: string[];
}

export interface PropertyInput {
  name: string;
  address: string;
  description?: string;
  photoDataUrls?: string[];
}

export interface Unit {
  id: number;
  propertyId: number;
  unitNumber: string;
  bedrooms: number;
  rentAmount: number;
  status: UnitStatus;
  tenantId: number | null;
  tenantName: string | null;
  balance: number;
  daysLate: number | null;
}

export interface UnitInput {
  propertyId: number;
  unitNumber: string;
  bedrooms: number;
  rentAmount: number;
}

export interface Tenant {
  id: number;
  fullName: string;
  phone: string;
  unitId: number | null;
  unitNumber: string | null;
  agreementStart: string | null;
  agreementEnd: string | null;
  openRequests: number;
  balance: number;
}

export interface TenantInput {
  fullName: string;
  phone: string;
  unitId?: number | null;
  agreementStart?: string | null;
  agreementEnd?: string | null;
  monthlyRent?: number;
  deposit?: number;
}

export interface ContactRevealInput {
  tenantId: number;
  actorRole: Role;
}

export interface ContactReveal {
  id: number;
  tenantId: number;
  unitId: number | null;
  actorRole: Role;
  occurredAt: string;
}

export type ReminderChannel = "sms" | "whatsapp" | "copied";

export interface Reminder {
  id: number;
  tenantId: number;
  unitId: number;
  channel: ReminderChannel;
  message: string;
  sentBy: string;
  sentAt: string;
  tenantName: string | null;
  unitNumber: string | null;
}

export interface ReminderInput {
  tenantId: number;
  unitId: number;
  channel: ReminderChannel;
  message: string;
  sentBy: string;
}

export interface Caretaker {
  id: number;
  name: string;
  phone: string;
  unitIds: number[];
  active: boolean;
}

export interface Payment {
  id: number;
  unitId: number;
  unitNumber: string;
  tenantName: string;
  amount: number;
  method: PaymentMethod;
  status: "paid" | "pending";
  recordedBy: string;
  recordedAt: string;
  reference: string | null;
}

export interface PaymentInput {
  unitId: number;
  amount: number;
  method: PaymentMethod;
  recordedBy: string;
  reference?: string;
  status?: "paid" | "pending";
}

export type MessageContext = "general" | "payment" | "repair";

export interface Message {
  id: number;
  unitId: number;
  tenantId: number;
  from: "tenant" | "property";
  sentBy: string;
  body: string;
  context: MessageContext;
  contextId: number | null;
  sentAt: string;
  read: boolean;
}

export interface MessageInput {
  unitId: number;
  tenantId: number;
  from: "tenant" | "property";
  sentBy: string;
  body: string;
  context?: MessageContext;
  contextId?: number | null;
}

export interface Repair {
  id: number;
  unitId: number;
  unitNumber: string;
  tenantName: string;
  title: string;
  description: string;
  status: RepairStatus;
  cost: number | null;
  reportedAt: string;
  assignedTo: string | null;
  photoDataUrl?: string | null;
  history?: RepairHistoryEntry[];
}

export interface RepairHistoryEntry {
  status: RepairStatus;
  detail: string;
  actor: string;
  occurredAt: string;
}

export interface RepairInput {
  unitId: number;
  title: string;
  description: string;
  tenantName?: string;
  reportedBy?: string;
  photoDataUrl?: string | null;
}

export interface RepairUpdate {
  status?: RepairStatus;
  cost?: number | null;
  assignedTo?: string | null;
  actor?: string;
  detail?: string;
}

export interface AgreementSignatureInput {
  signedBy: string;
  signatureDataUrl: string | null;
}

export interface Agreement {
  id: number;
  tenantId: number;
  unitId: number;
  tenantName: string;
  unitNumber: string;
  monthlyRent: number;
  deposit: number;
  startDate: string;
  endDate: string;
  nextDueDate: string;
  signedAt: string | null;
  signedBy?: string | null;
  signatureDataUrl?: string | null;
}

export interface Activity {
  id: number;
  unitId: number;
  unitNumber: string;
  title: string;
  detail: string;
  actor: string;
  type: ActivityType;
  occurredAt: string;
}

export interface Dashboard {
  propertyName: string;
  totalCollected: number;
  outstanding: number;
  occupiedUnits: number;
  totalUnits: number;
  paidToday: number;
  paidTodayAmount: number;
  trustPercent: number;
  lateCount: number;
  unresolvedRepairs: number;
  unverifiedPayments: number;
  paidCount: number;
  pendingCount: number;
  vacantCount: number;
  lateUnits: Unit[];
  agreementsEndingSoon: Agreement[];
  units: Unit[];
  attention: string[];
  activity: Activity[];
}

export interface AnalyticsPoint {
  label: string;
  collected: number;
  outstanding: number;
}

export interface Analytics {
  period: AnalyticsPeriod;
  points: AnalyticsPoint[];
  insight: string;
}

interface StoredProperty extends Omit<Property, "unitCount"> {}
interface StoredUnit extends UnitInput {
  id: number;
  tenantId: number | null;
  status: UnitStatus;
}
interface StoredTenant {
  id: number;
  fullName: string;
  phone: string;
}
interface StoredPayment extends Omit<Payment, "unitNumber" | "tenantName"> {}
interface StoredRepair extends Omit<Repair, "unitNumber" | "tenantName"> {}
interface StoredAgreement extends Omit<Agreement, "tenantName" | "unitNumber"> {
  tenantId: number;
  unitId: number;
}
interface StoredReminder extends Omit<Reminder, "tenantName" | "unitNumber"> {}

export interface WorkspaceRecords {
  version: 2;
  nextId: number;
  properties: StoredProperty[];
  units: StoredUnit[];
  tenants: StoredTenant[];
  payments: StoredPayment[];
  repairs: StoredRepair[];
  agreements: StoredAgreement[];
  contactReveals: ContactReveal[];
  reminders: StoredReminder[];
  messages: Message[];
  caretakers: Caretaker[];
}

export interface WorkspaceView {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  payments: Payment[];
  repairs: Repair[];
  agreements: Agreement[];
  reminders: Reminder[];
  messages: Message[];
  caretakers: Caretaker[];
  activity: Activity[];
  dashboard: Dashboard;
  getAnalytics: (period: AnalyticsPeriod) => Analytics;
}

export const workspaceStorageKey = "rentwise-local-workspace-v1";

function dateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addMonths(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + amount);
  return result;
}

function daysBetween(fromDay: Date, toDay: Date): number {
  const from = Date.UTC(fromDay.getFullYear(), fromDay.getMonth(), fromDay.getDate());
  const to = Date.UTC(toDay.getFullYear(), toDay.getMonth(), toDay.getDate());
  return Math.round((to - from) / 86_400_000);
}

export function createSeedRecords(now = new Date()): WorkspaceRecords {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastMonth = addMonths(now, -1);
  const graceStart = dateOnly(addMonths(now, -8));
  const danielStart = dateOnly(addMonths(now, -10));

  return {
    version: 2,
    nextId: 15,
    properties: [{
      id: 1,
      name: "Mirembe Court",
      address: "Kisaasi, Kampala",
      description: "A quiet, well-kept home close to the city.",
    }],
    tenants: [
      { id: 2, fullName: "Grace Nabirye", phone: "+256 772 481 206" },
      { id: 3, fullName: "Daniel Okello", phone: "+256 704 329 518" },
    ],
    units: [
      { id: 4, propertyId: 1, unitNumber: "A1", bedrooms: 2, rentAmount: 450000, tenantId: 2, status: "paid" },
      { id: 5, propertyId: 1, unitNumber: "A2", bedrooms: 2, rentAmount: 600000, tenantId: 3, status: "late" },
      { id: 6, propertyId: 1, unitNumber: "B1", bedrooms: 1, rentAmount: 350000, tenantId: null, status: "vacant" },
    ],
    payments: [
      { id: 7, unitId: 4, amount: 250000, method: "mobile_money", status: "paid", recordedBy: "Amina · Caretaker", recordedAt: now.toISOString(), reference: "MTN-804215" },
      { id: 8, unitId: 5, amount: 250000, method: "cash", status: "paid", recordedBy: "Amina · Caretaker", recordedAt: yesterday.toISOString(), reference: null },
      { id: 9, unitId: 4, amount: 450000, method: "bank", status: "paid", recordedBy: "Amina · Caretaker", recordedAt: lastMonth.toISOString(), reference: "BANK-392818" },
    ],
    repairs: [
      { id: 10, unitId: 5, title: "Kitchen tap is leaking", description: "Water is dripping steadily under the kitchen sink.", status: "in_progress", cost: 85000, reportedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), assignedTo: "Moses · Plumber" },
      { id: 11, unitId: 4, title: "Replace porch light", description: "The light outside the front door has stopped working.", status: "reported", cost: null, reportedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), assignedTo: null },
    ],
    agreements: [
      { id: 12, tenantId: 2, unitId: 4, monthlyRent: 450000, deposit: 450000, startDate: graceStart, endDate: dateOnly(addMonths(now, 4)), nextDueDate: dateOnly(addMonths(now, 1)), signedAt: addMonths(now, -8).toISOString() },
      { id: 13, tenantId: 3, unitId: 5, monthlyRent: 600000, deposit: 600000, startDate: danielStart, endDate: dateOnly(addMonths(now, 1)), nextDueDate: dateOnly(addMonths(now, 1)), signedAt: addMonths(now, -10).toISOString() },
    ],
    contactReveals: [],
    reminders: [],
    messages: [
      {
        id: 14,
        unitId: 4,
        tenantId: 2,
        from: "property",
        sentBy: "Amina · Caretaker",
        body: "Hello Grace, the plumber will come by on Thursday morning to fix the porch light. No action needed from you.",
        context: "repair",
        contextId: 11,
        sentAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        read: false,
      },
    ],
    caretakers: [],
  };
}

function parseRecords(raw: string): WorkspaceRecords {
  const value: unknown = JSON.parse(raw);
  const baseKeys = ["properties", "units", "tenants", "payments", "repairs", "agreements", "contactReveals"];
  if (
    !value
    || typeof value !== "object"
    || !Number.isInteger((value as WorkspaceRecords).nextId)
    || !baseKeys.every((key) => Array.isArray((value as Record<string, unknown>)[key]))
  ) {
    throw new Error("Saved rental data is invalid. It was not replaced; check this browser's stored workspace data.");
  }
  const records = value as WorkspaceRecords;
  if ((records as any).version === 1 || (records as any).version === undefined) {
    return { ...records, version: 2, reminders: [], messages: [], caretakers: [] } as any;
  }
  if (records.version !== 2 || !Array.isArray(records.reminders) || !Array.isArray(records.caretakers)) {
    throw new Error("Saved rental data is invalid. It was not replaced; check this browser's stored workspace data.");
  }
  return { ...records, messages: Array.isArray(records.messages) ? records.messages : [] };
}

export function readWorkspaceRecords(): WorkspaceRecords {
  const raw = window.localStorage.getItem(workspaceStorageKey);
  if (raw === null) {
    const seed = createSeedRecords();
    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(seed));
    return seed;
  }
  return parseRecords(raw);
}

export function parseWorkspaceRecords(raw: string): WorkspaceRecords {
  return parseRecords(raw);
}

export function saveWorkspaceRecords(records: WorkspaceRecords): void {
  window.localStorage.setItem(workspaceStorageKey, JSON.stringify(records));
}

export function deriveWorkspace(records: WorkspaceRecords, now = new Date()): WorkspaceView {
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const collected = new Map<number, number>();
  for (const payment of records.payments) {
    if (payment.status === "pending") continue;
    if (new Date(payment.recordedAt).getTime() >= currentMonth) {
      collected.set(payment.unitId, (collected.get(payment.unitId) ?? 0) + payment.amount);
    }
  }
  const agreementByUnit = new Map<number, StoredAgreement>();
  for (const agreement of records.agreements) {
    const existing = agreementByUnit.get(agreement.unitId);
    if (!existing || agreement.startDate > existing.startDate) {
      agreementByUnit.set(agreement.unitId, agreement);
    }
  }

  const units: Unit[] = [...records.units]
    .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber))
    .map((unit) => {
      const balance = unit.tenantId === null
        ? 0
        : Math.max(0, unit.rentAmount - (collected.get(unit.id) ?? 0));
      const status: UnitStatus = unit.status === "repair"
        ? "repair"
        : unit.tenantId === null
          ? "vacant"
          : balance <= 0
            ? "paid"
            : now.getDate() > 5 ? "late" : "pending";
      let daysLate: number | null = null;
      if (unit.tenantId !== null && balance > 0 && status !== "repair") {
        const agreement = agreementByUnit.get(unit.id);
        if (agreement) {
          const [year, month, day] = agreement.nextDueDate.slice(0, 10).split("-").map(Number);
          const dueInDays = daysBetween(new Date(Date.UTC(year, month - 1, day)), now);
          if (dueInDays > 0) daysLate = dueInDays;
        }
        if (daysLate === null && status === "late") {
          daysLate = Math.max(1, now.getDate() - 5);
        }
      }
      return {
        ...unit,
        status,
        tenantName: unit.tenantId === null
          ? null
          : records.tenants.find((tenant) => tenant.id === unit.tenantId)?.fullName ?? null,
        balance,
        daysLate,
      };
    });
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const tenantById = new Map(records.tenants.map((tenant) => [tenant.id, tenant]));
  const properties: Property[] = records.properties.map((property) => ({
    ...property,
    unitCount: records.units.filter((unit) => unit.propertyId === property.id).length,
  }));
  const agreements: Agreement[] = [...records.agreements]
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .map((agreement) => ({
      id: agreement.id,
      tenantId: agreement.tenantId,
      unitId: agreement.unitId,
      tenantName: tenantById.get(agreement.tenantId)?.fullName ?? "Tenant",
      unitNumber: unitById.get(agreement.unitId)?.unitNumber ?? "—",
      monthlyRent: agreement.monthlyRent,
      deposit: agreement.deposit,
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      nextDueDate: agreement.nextDueDate,
      signedAt: agreement.signedAt,
      signedBy: agreement.signedBy ?? null,
      signatureDataUrl: agreement.signatureDataUrl ?? null,
    }));
  const tenants: Tenant[] = [...records.tenants]
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((tenant) => {
      const unit = units.find((candidate) => candidate.tenantId === tenant.id);
      const agreement = [...records.agreements]
        .filter((candidate) => candidate.tenantId === tenant.id)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
      return {
        ...tenant,
        unitId: unit?.id ?? null,
        unitNumber: unit?.unitNumber ?? null,
        agreementStart: agreement?.startDate ?? null,
        agreementEnd: agreement?.endDate ?? null,
        openRequests: records.repairs.filter((repair) => repair.unitId === unit?.id && repair.status !== "done").length,
        balance: unit?.balance ?? 0,
      };
    });
  const payments: Payment[] = [...records.payments]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .map((payment) => ({
      ...payment,
      unitNumber: unitById.get(payment.unitId)?.unitNumber ?? "—",
      tenantName: unitById.get(payment.unitId)?.tenantName ?? "Tenant",
    }));
  const repairs: Repair[] = [...records.repairs]
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
    .map((repair) => ({
      ...repair,
      unitNumber: unitById.get(repair.unitId)?.unitNumber ?? "—",
      tenantName: unitById.get(repair.unitId)?.tenantName ?? "—",
      history: repair.history?.length
        ? repair.history
        : [{
          status: repair.status,
          detail: "Repair reported",
          actor: repair.assignedTo ?? "Tenant report",
          occurredAt: repair.reportedAt,
        }],
    }));
  const activity: Activity[] = [
    ...records.payments.map((payment) => ({
      id: payment.id,
      unitId: payment.unitId,
      unitNumber: unitById.get(payment.unitId)?.unitNumber ?? "—",
      title: "Payment recorded",
      detail: `UGX ${payment.amount.toLocaleString("en-UG")} · ${payment.method.replace("_", " ")}`,
      actor: payment.recordedBy,
      type: "payment" as const,
      occurredAt: payment.recordedAt,
    })),
    ...records.repairs.flatMap((repair) => {
      const history = repair.history?.length
        ? repair.history
        : [{
          status: repair.status,
          detail: "Repair reported",
          actor: repair.assignedTo ?? "Tenant report",
          occurredAt: repair.reportedAt,
        }];
      return history.map((entry, index) => ({
        id: 1_000_000 + repair.id * 1_000 + index,
        unitId: repair.unitId,
        unitNumber: unitById.get(repair.unitId)?.unitNumber ?? "—",
        title: repair.title,
        detail: entry.detail,
        actor: entry.actor,
        type: "repair" as const,
        occurredAt: entry.occurredAt,
      }));
    }),
    ...records.agreements.map((agreement) => ({
      id: 2_000_000 + agreement.id,
      unitId: agreement.unitId,
      unitNumber: unitById.get(agreement.unitId)?.unitNumber ?? "—",
      title: agreement.signedAt ? "Agreement signed" : "Agreement recorded",
      detail: agreement.signedAt
        ? `Agreement for ${tenantById.get(agreement.tenantId)?.fullName ?? "tenant"} signed`
        : `Agreement summary recorded for ${tenantById.get(agreement.tenantId)?.fullName ?? "tenant"}`,
      actor: agreement.signedBy ?? tenantById.get(agreement.tenantId)?.fullName ?? "Workspace team",
      type: "agreement" as const,
      occurredAt: agreement.signedAt ?? `${agreement.startDate}T00:00:00.000Z`,
    })),
    ...records.contactReveals.map((reveal) => {
      const unit = units.find((candidate) => candidate.tenantId === reveal.tenantId);
      const tenant = tenantById.get(reveal.tenantId);
      return {
        id: 3_000_000 + reveal.id,
        unitId: unit?.id ?? 0,
        unitNumber: unit?.unitNumber ?? "Tenant record",
        title: "Tenant contact revealed",
        detail: `Phone number opened for ${tenant?.fullName ?? "tenant"}`,
        actor: `${reveal.actorRole} (demo)`,
        type: "contact_reveal" as const,
        occurredAt: reveal.occurredAt,
      };
    }),
    ...records.reminders.map((reminder) => ({
      id: 4_000_000 + reminder.id,
      unitId: reminder.unitId,
      unitNumber: unitById.get(reminder.unitId)?.unitNumber ?? "—",
      title: "Rent reminder sent",
      detail: reminder.channel === "whatsapp"
        ? "Reminder opened in WhatsApp"
        : reminder.channel === "sms"
          ? "Reminder opened in SMS"
          : "Reminder message copied",
      actor: reminder.sentBy,
      type: "message" as const,
      occurredAt: reminder.sentAt,
    })),
    ...(records.messages ?? []).map((message) => ({
      id: 5_000_000 + message.id,
      unitId: message.unitId,
      unitNumber: unitById.get(message.unitId)?.unitNumber ?? "—",
      title: message.from === "tenant"
        ? `${tenantById.get(message.tenantId)?.fullName ?? "Tenant"} sent a message`
        : "Message from the property team",
      detail: message.context === "payment"
        ? `About rent payment · ${message.body}`
        : message.context === "repair"
          ? `About a repair · ${message.body}`
          : message.body,
      actor: message.sentBy,
      type: "message" as const,
      occurredAt: message.sentAt,
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 20);

  const totalCollected = records.payments
    .filter((payment) => new Date(payment.recordedAt).getTime() >= currentMonth)
    .reduce((total, payment) => total + payment.amount, 0);
  const occupiedUnits = units.filter((unit) => unit.tenantId !== null).length;
  const outstanding = units.reduce((total, unit) => total + unit.balance, 0);
  const todaysPayments = records.payments.filter((payment) => {
    const recorded = new Date(payment.recordedAt);
    return recorded.getFullYear() === now.getFullYear()
      && recorded.getMonth() === now.getMonth()
      && recorded.getDate() === now.getDate();
  });
  const paidToday = todaysPayments.length;
  const paidTodayAmount = todaysPayments.reduce((total, payment) => total + payment.amount, 0);
  const lateCount = units.filter((unit) => unit.status === "late").length;
  const unresolvedRepairs = records.repairs.filter((repair) => repair.status !== "done").length;
  const paidCount = units.filter((unit) => unit.tenantId !== null && unit.status === "paid").length;
  const pendingCount = units.filter((unit) => unit.status === "pending").length;
  const vacantCount = units.filter((unit) => unit.status === "vacant").length;
  const lateUnits = units
    .filter((unit) => unit.status === "late")
    .sort((a, b) => (b.daysLate ?? 0) - (a.daysLate ?? 0));
  const todayKey = dateOnly(now);
  const agreementsEndingSoon = agreements.filter((agreement) => {
    const daysLeft = daysBetween(now, new Date(`${agreement.endDate.slice(0, 10)}T00:00:00`));
    return agreement.startDate <= todayKey && daysLeft >= 0 && daysLeft <= 60;
  });
  const reminders: Reminder[] = [...records.reminders]
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .map((reminder) => ({
      ...reminder,
      unitNumber: unitById.get(reminder.unitId)?.unitNumber ?? "—",
      tenantName: tenantById.get(reminder.tenantId)?.fullName ?? null,
    }));
  const messages: Message[] = [...(records.messages ?? [])]
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const dashboard: Dashboard = {
    propertyName: properties[0]?.name ?? "Your property",
    totalCollected,
    outstanding,
    occupiedUnits,
    totalUnits: units.length,
    paidToday,
    paidTodayAmount,
    trustPercent: totalCollected === 0
      ? 0
      : Math.round((records.payments
        .filter((payment) => payment.method !== "cash" && new Date(payment.recordedAt).getTime() >= currentMonth)
        .reduce((total, payment) => total + payment.amount, 0) / totalCollected) * 100),
    lateCount,
    unresolvedRepairs,
    unverifiedPayments: 0,
    paidCount,
    pendingCount,
    vacantCount,
    lateUnits,
    agreementsEndingSoon,
    units,
    attention: [
      ...(lateCount ? [`${lateCount} rent payment${lateCount === 1 ? "" : "s"} overdue`] : []),
      ...(agreementsEndingSoon.length ? [`${agreementsEndingSoon.length} agreement${agreementsEndingSoon.length === 1 ? "" : "s"} ending within 60 days`] : []),
      ...(unresolvedRepairs ? [`${unresolvedRepairs} repair${unresolvedRepairs === 1 ? "" : "s"} need attention`] : []),
    ],
    activity,
  };
  const getAnalytics = (period: AnalyticsPeriod): Analytics => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const expectedRent = units.reduce((total, unit) => total + (unit.tenantId ? unit.rentAmount : 0), 0);
    const points: AnalyticsPoint[] = period === "year"
      ? Array.from({ length: 12 }, (_, index) => ({
        label: new Date(year, index, 1).toLocaleString("en", { month: "short" }),
        collected: records.payments
          .filter((payment) => {
            const date = new Date(payment.recordedAt);
            return date.getFullYear() === year && date.getMonth() === index;
          })
          .reduce((total, payment) => total + payment.amount, 0),
        outstanding: Math.max(0, expectedRent - records.payments
          .filter((payment) => {
            const date = new Date(payment.recordedAt);
            return date.getFullYear() === year && date.getMonth() === index;
          })
          .reduce((total, payment) => total + payment.amount, 0)),
      }))
      : Array.from({ length: 4 }, (_, index) => {
        const firstDay = index * 7 + 1;
        const lastDay = index === 3 ? new Date(year, month + 1, 0).getDate() : firstDay + 6;
        const collectedThisWeek = records.payments
          .filter((payment) => {
            const date = new Date(payment.recordedAt);
            return date.getFullYear() === year
              && date.getMonth() === month
              && date.getDate() >= firstDay
              && date.getDate() <= lastDay;
          })
          .reduce((total, payment) => total + payment.amount, 0);
        return {
          label: `${firstDay}–${lastDay}`,
          collected: collectedThisWeek,
          outstanding: Math.max(0, expectedRent - collectedThisWeek),
        };
      });
    const current = points.reduce((total, point) => total + point.collected, 0);
    const previousYear = period === "year" ? year - 1 : month === 0 ? year - 1 : year;
    const previousMonth = month === 0 ? 11 : month - 1;
    const previous = records.payments
      .filter((payment) => {
        const date = new Date(payment.recordedAt);
        return date.getFullYear() === previousYear
          && (period === "year" || date.getMonth() === previousMonth);
      })
      .reduce((total, payment) => total + payment.amount, 0);
    const comparisonLabel = period === "year" ? "last year" : "last month";
    const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
    const insight = current === 0
      ? `No rent has been recorded in ${period === "year" ? "this year" : "this month"} yet.`
      : change === null
        ? `UGX ${current.toLocaleString("en-UG")} collected so far. There is no recorded data for ${comparisonLabel} to compare.`
        : change === 0
          ? `Collections are level with ${comparisonLabel} at UGX ${current.toLocaleString("en-UG")}.`
          : `Collections are ${Math.abs(change)}% ${change > 0 ? "higher" : "lower"} than ${comparisonLabel}. UGX ${current.toLocaleString("en-UG")} collected.`;
    return {
      period,
      points,
      insight,
    };
  };

  return {
    properties,
    units,
    tenants,
    payments,
    repairs,
    agreements,
    reminders,
    messages,
    caretakers: [...records.caretakers],
    activity,
    dashboard,
    getAnalytics,
  };
}
