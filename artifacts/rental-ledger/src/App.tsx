import { type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import './rental.css';
import './dashboard.css';
import './tenant-portal.css';
import './caretaker.css';
import './landlord-exec.css';
import OnboardingTour from '@/components/OnboardingTour';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotFoundPage from '@/pages/not-found';
import SignUpPage from '@/pages/sign-up';
import AuthPage from '@/pages/auth';
import {
  deriveWorkspace,
  parseWorkspaceRecords,
  readWorkspaceRecords,
  saveWorkspaceRecords,
  workspaceStorageKey,
  type Activity,
  type Agreement,
  type AgreementSignatureInput,
  type ContactRevealInput,
  type Message,
  type MessageContext,
  type MessageInput,
  type Payment,
  type PaymentInput,
  type Property,
  type PropertyInput,
  type Reminder,
  type ReminderInput,
  type Repair,
  type RepairInput,
  type RepairUpdate,
  type Role,
  type Tenant,
  type TenantInput,
  type Unit,
  type UnitInput,
  type WorkspaceRecords,
  type WorkspaceView,
} from '@/lib/local-data';
import {
  Activity as ActivityIcon, ArrowDownLeft, ArrowLeft, ArrowUpRight, Bell, Building2, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronLeft, CircleHelp, ClipboardList, Clock3, Download, FileCheck2,
  LayoutDashboard, List, LogOut, Menu, MessageSquare, Moon, MoreHorizontal,
  Plus, RefreshCw, Search, Settings, ShieldCheck, Sun, UserRound, Users, Wallet, Wrench, X,
  BarChart3, MapPin, Smartphone, Eye, EyeOff, ReceiptText, House, TrendingUp, ImagePlus,
} from 'lucide-react';
import { Link, Redirect, Route, Switch, useLocation, useRoute, Router as WouterRouter } from 'wouter';
import { readReminderChannel, readTenantLanguage, tenantCopy, type TenantCopy, type TenantLanguage } from '@/lib/tenant-copy';

type DataContextValue = {
  refresh: () => void;
  role: Role;
  setRole: (value: Role) => void;
  language: TenantLanguage;
  setLanguage: (value: TenantLanguage) => void;
  createProperty: (input: PropertyInput) => Property;
  createUnit: (input: UnitInput) => Unit;
  createTenant: (input: TenantInput) => Tenant;
  signAgreement: (id: number, input: AgreementSignatureInput) => void;
  createPayment: (input: PaymentInput) => Payment;
  confirmPayment: (id: number) => void;
  createContactReveal: (input: ContactRevealInput) => void;
  createReminder: (input: ReminderInput) => Reminder;
  createMessage: (input: MessageInput) => Message;
  markMessagesRead: (unitId?: number) => void;
  updateTenant: (id: number, update: { phone?: string }) => void;
  createRepair: (input: RepairInput) => Repair;
  updateRepair: (id: number, update: RepairUpdate) => Repair;
  removePayment: (id: number) => void;
  assignTenant: (tenantId: number, unitId: number) => void;
  notify: (message: string, undo?: () => void) => void;
} & WorkspaceView;
const DataContext = createContext<DataContextValue | null>(null);
const useData = () => {
  const value = useContext(DataContext);
  if (!value) throw new Error('Workspace data is unavailable');
  return value;
};

type NavLink = [string, string, typeof LayoutDashboard];
const navGroupsByRole: Record<Role, { title: string; links: NavLink[] }[]> = {
  Landlord: [
    { title: 'WORKSPACE', links: [['/dashboard', 'Overview', LayoutDashboard], ['/properties', 'Properties', Building2], ['/daily-collection', 'Daily collection', Wallet], ['/payments', 'Payment ledger', ReceiptText]] },
    { title: 'PEOPLE & OPERATIONS', links: [['/tenants', 'Tenants', Users], ['/repairs', 'Repairs', Wrench], ['/agreements', 'Agreements', FileCheck2], ['/notifications', 'Activity & receipts', Bell]] },
    { title: 'INSIGHTS', links: [['/analytics', 'Analytics', BarChart3]] },
  ],
  Caretaker: [
    { title: 'TODAY', links: [['/dashboard', 'My day', LayoutDashboard], ['/daily-collection', 'Daily collection', Wallet], ['/properties', 'Homes in care', Building2]] },
    { title: 'PROPERTY CARE', links: [['/payments', 'Recorded payments', ReceiptText], ['/tenants', 'Tenant contacts', Users], ['/repairs', 'Repair activity', Wrench], ['/agreements', 'Rent summaries', FileCheck2], ['/notifications', 'Activity & receipts', Bell]] },
  ],
  Tenant: [
    { title: 'YOUR HOME', links: [['/dashboard', 'My home', House], ['/payments', 'My payments', ReceiptText], ['/messages', 'Messages', MessageSquare], ['/repairs', 'My repairs', Wrench], ['/agreements', 'My agreement', FileCheck2], ['/notifications', 'Receipts & activity', Bell]] },
  ],
};
const fmt = (n?: number | null) => `UGX ${(n ?? 0).toLocaleString('en-UG')}`;
const tenantNavText: Record<string, (c: TenantCopy) => string> = {
  '/dashboard': c => c.navHome,
  '/payments': c => c.navPayments,
  '/messages': c => c.navMessages,
  '/repairs': c => c.navRepairs,
  '/agreements': c => c.navAgreement,
  '/notifications': c => c.navActivity,
};
const compact = (n?: number) => `UGX ${(n ?? 0).toLocaleString('en-UG', { notation: 'compact', maximumFractionDigits: 1 })}`;
const dateFmt = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const daysUntilDate = (value: string, today: Date) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const targetDay = Date.UTC(year, month - 1, day);
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetDay - todayDay) / 86_400_000);
};
const initials = (name?: string | null) => (name || '—').split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();
const statusLabel = (s: string) => s.replaceAll('_', ' ');
const classes = (...args: (string | false | undefined | null)[]) => args.filter(Boolean).join(' ');
const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
};
const useCountUp = (target: number, duration = 850) => {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced || !Number.isFinite(target)) { setValue(target); return; }
    let frame = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced, duration]);
  return value;
};
const useSimulatedLoad = (delay = 520) => {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), delay); return () => window.clearTimeout(timer); }, [delay]);
  return loading;
};

function WorkspaceData({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState(readWorkspaceRecords);
  const recordsRef = useRef(records);
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('ledger-role') as Role) || 'Landlord');
  const [language, setLanguageState] = useState<TenantLanguage>(readTenantLanguage);
  const setLanguage = (value: TenantLanguage) => {
    setLanguageState(value);
    localStorage.setItem('ledger-language', value);
  };
  const [notice, setNotice] = useState<{ message: string; undo?: () => void } | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const notify = (message: string, undo?: () => void) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice({ message, undo });
    noticeTimer.current = window.setTimeout(() => setNotice(null), undo ? 10000 : 3600);
  };
  const commitRecords = (update: (current: WorkspaceRecords) => WorkspaceRecords) => {
    const next = update(recordsRef.current);
    saveWorkspaceRecords(next);
    recordsRef.current = next;
    setRecords(next);
    return next;
  };
  const createProperty = (input: PropertyInput) => {
    let created!: Property;
    commitRecords(current => {
      const id = current.nextId;
      created = { id, name: input.name.trim(), address: input.address.trim(), description: input.description?.trim() || '', unitCount: 0, photoDataUrls: input.photoDataUrls ?? [] };
      return { ...current, nextId: id + 1, properties: [...current.properties, { id, name: created.name, address: created.address, description: created.description, photoDataUrls: created.photoDataUrls }] };
    });
    return created;
  };
  const createUnit = (input: UnitInput) => {
    let created!: Unit;
    commitRecords(current => {
      if (!current.properties.some(property => property.id === input.propertyId)) throw new Error('Choose a property before adding a unit.');
      const id = current.nextId;
      created = { ...input, id, unitNumber: input.unitNumber.trim(), status: 'vacant', tenantId: null, tenantName: null, balance: 0, daysLate: null };
      return { ...current, nextId: id + 1, units: [...current.units, { id, propertyId: input.propertyId, unitNumber: created.unitNumber, bedrooms: input.bedrooms, rentAmount: input.rentAmount, status: 'vacant', tenantId: null }] };
    });
    return created;
  };
  const createTenant = (input: TenantInput) => {
    let created!: Tenant;
    commitRecords(current => {
      const unit = input.unitId == null ? undefined : current.units.find(item => item.id === input.unitId);
      if (input.unitId != null && !unit) throw new Error('The selected unit could not be found.');
      if (unit?.tenantId != null) throw new Error('This unit already has a tenant.');
      const tenantId = current.nextId;
      const tenant = { id: tenantId, fullName: input.fullName.trim(), phone: input.phone.trim() };
      const createAgreement = Boolean(unit && input.agreementStart && input.agreementEnd && input.monthlyRent != null);
      const agreementId = createAgreement ? tenantId + 1 : undefined;
      created = {
        ...tenant,
        unitId: unit?.id ?? null,
        unitNumber: unit?.unitNumber ?? null,
        agreementStart: input.agreementStart ?? null,
        agreementEnd: input.agreementEnd ?? null,
        openRequests: 0,
        balance: unit ? input.monthlyRent ?? unit.rentAmount : 0,
      };
      return {
        ...current,
        nextId: tenantId + (createAgreement ? 2 : 1),
        tenants: [...current.tenants, tenant],
        units: unit
          ? current.units.map(item => item.id === unit.id ? { ...item, tenantId, status: 'pending' as const } : item)
          : current.units,
        agreements: createAgreement && agreementId != null && unit
          ? [...current.agreements, {
            id: agreementId,
            tenantId,
            unitId: unit.id,
            monthlyRent: input.monthlyRent!,
            deposit: input.deposit ?? 0,
            startDate: input.agreementStart!,
            endDate: input.agreementEnd!,
            nextDueDate: (() => {
              const due = new Date();
              due.setMonth(due.getMonth() + 1);
              return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
            })(),
            signedAt: null,
          }]
          : current.agreements,
      };
    });
    return created;
  };
  const createPayment = (input: PaymentInput) => {
    let created!: Payment;
    commitRecords(current => {
      const unit = current.units.find(item => item.id === input.unitId);
      if (!unit || unit.tenantId == null) throw new Error('Choose an occupied unit before recording rent.');
      const id = current.nextId;
      const status = input.status ?? 'paid';
      const tenantName = current.tenants.find(tenant => tenant.id === unit.tenantId)?.fullName ?? 'Tenant';
      created = {
        ...input,
        id,
        unitNumber: unit.unitNumber,
        tenantName,
        status,
        recordedAt: new Date().toISOString(),
        reference: input.reference?.trim() || null,
      };
      return {
        ...current,
        nextId: id + 1,
        payments: [...current.payments, {
          id,
          unitId: input.unitId,
          amount: input.amount,
          method: input.method,
          status,
          recordedBy: input.recordedBy.trim(),
          recordedAt: created.recordedAt,
          reference: created.reference,
        }],
        units: current.units.map(item => item.id === unit.id ? { ...item, status: 'pending' as const } : item),
      };
    });
    return created;
  };
  const confirmPayment = (id: number) => {
    commitRecords(current => ({
      ...current,
      payments: current.payments.map(payment => payment.id === id ? { ...payment, status: 'paid' as const } : payment),
    }));
  };
  const updateTenant = (id: number, update: { phone?: string }) => {
    commitRecords(current => ({
      ...current,
      tenants: current.tenants.map(tenant => tenant.id === id
        ? { ...tenant, phone: update.phone?.trim() || tenant.phone }
        : tenant),
    }));
  };
  const signAgreement = (id: number, input: AgreementSignatureInput) => {
    commitRecords(current => {
      const agreement = current.agreements.find(item => item.id === id);
      if (!agreement) throw new Error('Agreement not found.');
      if (agreement.signedAt) throw new Error('This agreement has already been signed.');
      if (!input.signedBy.trim()) throw new Error('Enter the signer’s name before saving.');
      return {
        ...current,
        agreements: current.agreements.map(item => item.id === id
          ? { ...item, signedAt: new Date().toISOString(), signedBy: input.signedBy.trim(), signatureDataUrl: input.signatureDataUrl }
          : item),
      };
    });
  };
  const createContactReveal = (input: ContactRevealInput) => {
    commitRecords(current => {
      const tenant = current.tenants.find(item => item.id === input.tenantId);
      if (!tenant) throw new Error('Tenant not found.');
      const id = current.nextId;
      return {
        ...current,
        nextId: id + 1,
        contactReveals: [...current.contactReveals, {
          id,
          tenantId: tenant.id,
          unitId: current.units.find(unit => unit.tenantId === tenant.id)?.id ?? null,
          actorRole: input.actorRole,
          occurredAt: new Date().toISOString(),
        }],
      };
    });
  };
  const createReminder = (input: ReminderInput) => {
    let created!: Reminder;
    commitRecords(current => {
      const tenant = current.tenants.find(item => item.id === input.tenantId);
      const unit = current.units.find(item => item.id === input.unitId);
      if (!tenant || !unit) throw new Error('Tenant or unit not found.');
      const id = current.nextId;
      created = {
        ...input,
        id,
        sentAt: new Date().toISOString(),
        tenantName: tenant.fullName,
        unitNumber: unit.unitNumber,
      };
      return {
        ...current,
        nextId: id + 1,
        reminders: [...current.reminders, {
          id,
          tenantId: input.tenantId,
          unitId: input.unitId,
          channel: input.channel,
          message: input.message,
          sentBy: input.sentBy,
          sentAt: created.sentAt,
        }],
      };
    });
    return created;
  };
  const createMessage = (input: MessageInput) => {
    let created!: Message;
    commitRecords(current => {
      const unit = current.units.find(item => item.id === input.unitId);
      const tenant = current.tenants.find(item => item.id === input.tenantId);
      if (!unit || !tenant) throw new Error('A home must be assigned before a message can be sent.');
      if (!input.body.trim()) throw new Error('Write a message before sending.');
      const id = current.nextId;
      created = {
        id,
        unitId: unit.id,
        tenantId: tenant.id,
        from: input.from,
        sentBy: input.sentBy.trim() || 'Tenant',
        body: input.body.trim(),
        context: input.context ?? 'general',
        contextId: input.contextId ?? null,
        sentAt: new Date().toISOString(),
        read: input.from === 'tenant',
      };
      return {
        ...current,
        nextId: id + 1,
        messages: [...(current.messages ?? []), created],
      };
    });
    return created;
  };
  const markMessagesRead = (unitId?: number) => {
    commitRecords(current => ({
      ...current,
      messages: (current.messages ?? []).map(message => message.from === 'property' && !message.read && (unitId == null || message.unitId === unitId) ? { ...message, read: true } : message),
    }));
  };
  const createRepair = (input: RepairInput) => {
    let created!: Repair;
    commitRecords(current => {
      const unit = current.units.find(item => item.id === input.unitId);
      if (!unit) throw new Error('Choose a unit before logging a repair.');
      const id = current.nextId;
      const reportedAt = new Date().toISOString();
      const reportedBy = input.reportedBy?.trim() || 'Tenant report';
      created = {
        id,
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        tenantName: current.tenants.find(tenant => tenant.id === unit.tenantId)?.fullName ?? '—',
        title: input.title.trim(),
        description: input.description.trim(),
        status: 'reported',
        cost: null,
        reportedAt,
        assignedTo: null,
        photoDataUrl: input.photoDataUrl ?? null,
        history: [{ status: 'reported', detail: 'Repair reported', actor: reportedBy, occurredAt: reportedAt }],
      };
      return {
        ...current,
        nextId: id + 1,
        repairs: [...current.repairs, {
          id,
          unitId: unit.id,
          title: created.title,
          description: created.description,
          status: 'reported',
          cost: null,
          reportedAt: created.reportedAt,
          assignedTo: null,
          photoDataUrl: created.photoDataUrl,
          history: created.history,
        }],
        units: current.units.map(item => item.id === unit.id ? { ...item, status: 'repair' as const } : item),
      };
    });
    return created;
  };
  const updateRepair = (id: number, update: RepairUpdate) => {
    let updated!: Repair;
    commitRecords(current => {
      const repair = current.repairs.find(item => item.id === id);
      if (!repair) throw new Error('Repair not found.');
      const { actor = 'Workspace team', detail, ...changes } = update;
      const status = changes.status ?? repair.status;
      const occurredAt = new Date().toISOString();
      const defaultDetail = changes.status && changes.status !== repair.status
        ? `Repair moved to ${changes.status.replaceAll('_', ' ')}`
        : changes.cost !== undefined
          ? changes.cost == null ? 'Repair cost removed' : `Repair cost recorded: UGX ${changes.cost.toLocaleString('en-UG')}`
          : changes.assignedTo !== undefined
            ? changes.assignedTo ? `Assigned to ${changes.assignedTo}` : 'Repair assignment cleared'
            : 'Repair details updated';
      const history = repair.history?.length
        ? repair.history
        : [{ status: repair.status, detail: 'Repair reported', actor: repair.assignedTo ?? 'Tenant report', occurredAt: repair.reportedAt }];
      const nextRepair = {
        ...repair,
        ...changes,
        history: [...history, { status, detail: detail ?? defaultDetail, actor, occurredAt }],
      };
      const unit = current.units.find(item => item.id === repair.unitId);
      updated = {
        ...nextRepair,
        unitNumber: unit?.unitNumber ?? '—',
        tenantName: current.tenants.find(tenant => tenant.id === unit?.tenantId)?.fullName ?? '—',
      };
      return {
        ...current,
        repairs: current.repairs.map(item => item.id === id ? nextRepair : item),
        units: update.status === 'done' && unit?.status === 'repair'
          ? current.units.map(item => item.id === unit.id ? { ...item, status: item.tenantId == null ? 'vacant' as const : 'pending' as const } : item)
          : current.units,
      };
    });
    return updated;
  };
  const removePayment = (id: number) => {
    commitRecords(current => ({ ...current, payments: current.payments.filter(payment => payment.id !== id) }));
  };
  const assignTenant = (tenantId: number, unitId: number) => {
    commitRecords(current => {
      const tenant = current.tenants.find(item => item.id === tenantId);
      const unit = current.units.find(item => item.id === unitId);
      if (!tenant || !unit) return current;
      return {
        ...current,
        units: current.units.map(item => {
          if (item.id === unitId) return { ...item, tenantId, status: 'pending' as const };
          if (item.tenantId === tenantId) return { ...item, tenantId: null, status: 'vacant' as const };
          return item;
        }),
        tenants: current.tenants.map(item => item.id === tenantId ? { ...item, unitId, unitNumber: unit.unitNumber } : item),
      };
    });
  };
  const refresh = () => {
    const latest = readWorkspaceRecords();
    recordsRef.current = latest;
    setRecords(latest);
    notify('Browser-stored workspace refreshed');
  };
  useEffect(() => { localStorage.setItem('ledger-role', role); }, [role]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== workspaceStorageKey || !event.newValue) return;
      try {
        const latest = parseWorkspaceRecords(event.newValue);
        recordsRef.current = latest;
        setRecords(latest);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Saved browser data could not be reloaded.');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const data: DataContextValue = {
    ...deriveWorkspace(records),
    refresh,
    role,
    setRole,
    language,
    setLanguage,
    createProperty,
    createUnit,
    createTenant,
    signAgreement,
    createPayment,
    confirmPayment,
    createContactReveal,
    createReminder,
    createMessage,
    markMessagesRead,
    updateTenant,
    createRepair,
    updateRepair,
    removePayment,
    assignTenant,
    notify,
  };
  return <DataContext.Provider value={data}>{children}{notice && <div role="status" aria-live="polite" className="toast-note" data-testid="status-feedback"><CheckCircle2 size={17}/><span className="toast-message">{notice.message}</span>{notice.undo && <button type="button" className="toast-undo" onClick={() => { notice.undo?.(); setNotice(null); }}>Undo</button>}<button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={16}/></button></div>}</DataContext.Provider>;
}

function AppShell() {
  const d = useData();
  const [path, setLocation] = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('rentwise-sidebar-collapsed') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('ledger-theme') || 'light');
  useEffect(() => {
    localStorage.setItem('rentwise-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ledger-theme', theme);
  }, [theme]);
  const roleNav = navGroupsByRole[d.role];
  const isTenant = d.role === 'Tenant';
  const c = tenantCopy(d.language);
  const allRoleNav = Object.values(navGroupsByRole).flatMap(groups => groups.flatMap(group => group.links));
  const rawTitle = path.startsWith('/receipt/') ? (isTenant ? c.pageReceipt : 'Receipt') : path === '/settings' ? (isTenant ? c.pageSettings : 'Preferences') : (roleNav.flatMap(g => g.links).find(([href]) => href === path)?.[1] as string) || (allRoleNav.find(([href]) => href === path)?.[1] as string) || (path === '/dashboard' ? (isTenant ? 'My home' : d.role === 'Caretaker' ? 'My day' : 'Overview') : 'Rentwise');
  const title = isTenant && tenantNavText[path] ? tenantNavText[path](c) : rawTitle;
  const roleSubtitle = d.role === 'Caretaker' ? 'A practical view of today’s collection and the homes in your care.' : isTenant ? c.roleSubtitle : 'A clearer view of home, and everything that keeps it running.';
  const tenantName = getDemoTenant(d)?.fullName ?? 'Tenant';
  const tenantNameParts = tenantName.split(' ');
  const tenantDisplayName = `${tenantNameParts[0]} ${tenantNameParts[tenantNameParts.length - 1]?.[0] ?? ''}.`;
  const displayName = d.role === 'Tenant' ? tenantDisplayName : d.role === 'Caretaker' ? 'Amina' : 'Agnes M.';
  const tenantUnit = d.role === 'Tenant' ? d.units.find(unit => unit.id === getDemoTenant(d)?.unitId) : undefined;
  const tenantUnreadMessages = d.role === 'Tenant' && tenantUnit
    ? (d.messages ?? []).filter(message => message.unitId === tenantUnit.id && message.from === 'property' && !message.read).length
    : 0;
  const workspaceProperty = d.role === 'Tenant'
    ? d.properties.find(property => property.id === tenantUnit?.propertyId)?.name || 'Your home'
    : d.dashboard?.propertyName || d.properties?.[0]?.name || 'Mirembe Court';
  const todayKey = localDateKey(new Date());
  const occupiedUnits = d.units.filter(unit => unit.tenantId != null);
  const collectedUnitIds = new Set(d.payments.filter(payment => payment.status !== 'pending' && payment.recordedAt.slice(0, 10) === todayKey).map(payment => payment.unitId));
  const collectionProgress = occupiedUnits.length ? Math.round(occupiedUnits.filter(unit => collectedUnitIds.has(unit.id)).length / occupiedUnits.length * 100) : 0;
  const sidebar = <aside id="workspace-sidebar" className={classes('sidebar', drawer && 'sidebar-open')} aria-label="Rentwise workspace sidebar">
    <div className="brand-lockup"><span className="brand-mark"><House size={19}/></span><span><b>rentwise</b><small>PROPERTY LEDGER</small></span><button className="sidebar-collapse-button" type="button" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!sidebarCollapsed} aria-controls="workspace-sidebar" title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} data-testid="button-sidebar-collapse"><ChevronLeft size={17}/></button><button className="sidebar-close" onClick={() => setDrawer(false)} aria-label="Close navigation"><X size={19}/></button></div>
    <div className="workspace-label">{d.role === 'Landlord' ? 'MANAGEMENT DESK' : d.role === 'Caretaker' ? 'ON-SITE DESK' : c.deskLabel}</div>
    <div className="property-picker" title={d.role === 'Tenant' ? 'Your home' : `${workspaceProperty} · ${d.role === 'Landlord' ? 'All properties' : 'Property in your care'}`}><span className="property-symbol">{workspaceProperty[0]}</span><span><b>{workspaceProperty}</b><small>{d.role === 'Landlord' ? 'All properties' : d.role === 'Caretaker' ? 'Property in your care' : c.propertySubLabel}</small></span>{d.role === 'Landlord' && <ChevronDown size={15}/>}</div>
    <nav aria-label="Main navigation">{roleNav.map(group => <div className="nav-group" key={group.title}><p>{group.title}</p>{group.links.map(([href, label, Icon]) => {
      const displayLabel = isTenant && tenantNavText[href] ? tenantNavText[href](c) : label;
      return <Link key={href} href={href} onClick={() => setDrawer(false)} aria-label={href === '/messages' && tenantUnreadMessages ? c.unreadNavAria(displayLabel, tenantUnreadMessages) : displayLabel} title={displayLabel} className={classes('nav-item', path === href && 'active')} data-testid={`nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={18}/><span>{displayLabel}</span>{href === '/daily-collection' && d.dashboard?.lateCount ? <em>{d.dashboard.lateCount}</em> : href === '/messages' && tenantUnreadMessages ? <em>{tenantUnreadMessages}</em> : null}</Link>;
    })}</div>)}</nav>
     <div className="sidebar-bottom">
        <div className="sync-card" title={isTenant ? c.syncSub : 'Records are saved only in this browser'}><span className="sync-dot"/><div><b>{isTenant ? c.syncTitle : 'Saved on this device'}</b><small>{isTenant ? c.syncSub : 'Local storage · no account sync'}</small></div><Check size={15}/></div>
        <Link href="/settings" aria-label={isTenant ? c.pageSettings : 'Preferences'} title={isTenant ? c.pageSettings : 'Preferences'} className={classes('nav-item', path === '/settings' && 'active')} data-testid="nav-settings"><Settings size={18}/><span>{isTenant ? c.pageSettings : 'Preferences'}</span></Link>
        <section className="sidebar-account" aria-label="Current workspace profile" data-testid="sidebar-account">
          <div className="sidebar-account-kicker"><span>{isTenant ? c.accountKicker : 'WORKSPACE PROFILE'}</span><i>DEMO</i></div>
          <div className="sidebar-account-identity">
            <span className="avatar sidebar-account-avatar" aria-hidden="true">{initials(displayName)}</span>
            <span className="sidebar-account-copy"><b>{displayName}</b><small>{isTenant ? c.accountRole(d.role) : `${d.role} workspace`}</small></span>
          </div>
          <div className="sidebar-account-property"><span className="sidebar-account-property-icon"><Building2 size={14}/></span><span><small>{isTenant ? c.accountPropertyHead : 'CURRENT PROPERTY'}</small><b title={workspaceProperty}>{workspaceProperty}</b></span></div>
          <button type="button" className="sidebar-signout" onClick={() => { setDrawer(false); setLocation('/'); }} aria-label={isTenant ? c.signOut : 'Sign out of Rentwise'} data-testid="sidebar-sign-out"><LogOut size={15}/><span>{isTenant ? c.signOut : 'Sign out'}</span><small>{isTenant ? c.signOutSub : 'Leave workspace'}</small></button>
        </section>
     </div>
  </aside>;
  return <div className={classes('app-shell', `role-${d.role.toLowerCase()}`)}><div className={classes('shell-layout', sidebarCollapsed && 'sidebar-is-collapsed')}>{sidebar}{drawer && <button className="scrim" onClick={() => setDrawer(false)} aria-label="Close menu"/>}<main className="main-area">
    {d.role !== 'Tenant' && <div className="ambient-status" role="progressbar" aria-label="Today’s collection progress" aria-valuenow={collectionProgress} aria-valuemin={0} aria-valuemax={100} title={`${collectionProgress}% of occupied homes recorded a payment today`}><i style={{ width: `${collectionProgress}%`, backgroundColor: `hsl(${Math.round(collectionProgress * 1.2)} 43% 46%)` }}/></div>}
    <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20}/></button><div className="crumb"><span>{isTenant ? c.crumbHome : 'Workspace'}</span><span>/</span><b>{title}</b></div><div className="top-actions"><span className="connection"><span/>{isTenant ? c.connectionLabel : 'Browser-only'}</span><button className="icon-button" aria-label={isTenant ? c.refreshLabel : 'Refresh workspace'} onClick={d.refresh} data-testid="button-refresh"><RefreshCw size={17}/></button><Link href="/notifications" className="icon-button notify-button" aria-label={tenantUnreadMessages > 0 ? c.unreadNavAria(isTenant ? c.activityAria : 'Receipts and activity', tenantUnreadMessages) : (isTenant ? c.activityAria : 'Receipts and activity')} data-testid="link-top-activity"><Bell size={18}/>{d.role === 'Tenant' ? (tenantUnreadMessages > 0 && <i/>) : <i/>}</Link><span className="top-divider"/><DropdownMenu>
        <DropdownMenuTrigger asChild><button className="profile-button" data-testid="button-profile" aria-label="Open account menu"><span className="avatar small-avatar">{initials(displayName)}</span><span>{displayName}</span><ChevronDown size={14}/></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
            <span className="avatar small-avatar">{initials(displayName)}</span>
             <span className="flex flex-col gap-0.5"><b className="text-[13px] font-semibold">{displayName}</b><small className="text-[11px] text-muted-foreground">{isTenant ? c.accountRole(d.role) : `${d.role} workspace`}</small></span>
           </DropdownMenuLabel>
           <DropdownMenuSeparator/>
           <DropdownMenuItem onSelect={() => setLocation('/settings')} data-testid="menu-preferences"><Settings size={16}/> {isTenant ? c.pageSettings : 'Preferences'}</DropdownMenuItem>
           <DropdownMenuSeparator/>
           <DropdownMenuItem onSelect={() => setLocation('/')} className="focus:bg-destructive focus:text-destructive-foreground" data-testid="menu-sign-out"><LogOut size={16}/> {isTenant ? c.signOut : 'Sign out'}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu></div></header>
      <div className="content-area"><div className="page-heading"><div><div className="eyebrow">{path === '/dashboard' ? (isTenant ? c.dashboardEyebrow : `${d.role.toUpperCase()} WORKSPACE · UGANDA`) : 'RENTWISE · UGANDA'}</div><h1>{title}</h1>{path === '/dashboard' && <p className="heading-sub">{roleSubtitle}</p>}</div>{path === '/dashboard' && d.role === 'Landlord' && <Link href="/daily-collection" className="button button-primary" data-testid="button-collect-rent"><Wallet size={17}/>View collection</Link>}</div>
      <div className="page-enter"><Switch>
        <Route path="/" component={() => <Redirect to="/dashboard"/>}/>
        <Route path="/dashboard" component={RoleDashboardPage}/>
        <Route path="/properties" component={RolePropertiesPage}/>
        <Route path="/daily-collection" component={() => <RoleGate allow={['Landlord','Caretaker']}><RoleCollectionPage/></RoleGate>}/>
        <Route path="/payments" component={RolePaymentsPage}/>
        <Route path="/tenants" component={RoleTenantsPage}/>
        <Route path="/repairs" component={RoleRepairsPage}/>
        <Route path="/messages" component={() => <RoleGate allow={['Tenant']}><TenantMessagesPage/></RoleGate>}/>
        <Route path="/agreements" component={RoleAgreementsPage}/>
        <Route path="/analytics" component={() => <RoleGate allow={['Landlord']}><AnalyticsPage/></RoleGate>}/>
        <Route path="/notifications" component={RoleNotificationsPage}/>
        <Route path="/tenant" component={() => <Redirect to="/dashboard"/>}/>
        <Route path="/receipt/:id" component={ReceiptPage}/><Route path="/unit/:id" component={() => <RoleGate allow={['Landlord','Caretaker']}><UnitTimelinePage/></RoleGate>}/><Route path="/settings" component={() => <SettingsPage theme={theme} setTheme={setTheme}/>}/>
        <Route component={NotFoundPage}/>
      </Switch></div>
      <footer className="footer"><span>Rentwise <i>·</i> A reliable record, for everyone under one roof.</span><span>UGX <i>·</i> Kampala, Uganda</span></footer>
    </div>
    <OnboardingTour key={d.role} role={d.role}/>
  </main></div></div>;
}

function Metric({ label, value, numeric, format, note, icon: Icon, tone = 'green', cornerMark = false }: { label: string; value?: string; numeric?: number; format?: (n: number) => string; note: string; icon: typeof Wallet; tone?: string; cornerMark?: boolean }) {
  const animated = useCountUp(numeric ?? 0);
  const display = numeric != null && format ? format(animated) : value;
  return <div className={classes('metric-card', cornerMark && 'has-corner-mark')} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17}/></span></div><strong>{display}</strong><small>{note}</small>{cornerMark && <span className="card-corner-mark" aria-hidden="true"><ArrowUpRight size={13}/></span>}</div>;
}
function Panel({ title, action, children, className = '', cornerMark = false }: { title: string; action?: ReactNode; children: ReactNode; className?: string; cornerMark?: boolean }) {
  return <section className={classes('panel', className, cornerMark && 'has-corner-mark')}><div className="panel-head"><h2>{title}</h2>{action}</div>{children}{cornerMark && <span className="card-corner-mark" aria-hidden="true"><ArrowUpRight size={12}/></span>}</section>;
}
function Skeleton({ height, width, radius }: { height?: number; width?: number | string; radius?: number }) { return <span className="skeleton-block" style={{ height, width, borderRadius: radius }} aria-hidden="true"/>; }
function Status({ value }: { value: string }) { return <span className={`status-pill status-${value.replaceAll('_', '-')}`}><i/>{statusLabel(value)}</span>; }
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><span className="empty-icon"><ClipboardList size={22}/></span><b>{title}</b><p>{text}</p>{action}</div>; }
function DataState({ rows, children, title = 'No records yet', text = 'When new activity is recorded, it will appear here.', action }: { rows?: unknown[]; children: ReactNode; title?: string; text?: string; action?: ReactNode }) {
  if (rows && rows.length === 0) return <Empty title={title} text={text} action={action}/>;
  return <>{children}</>;
}
function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role } = useData();
  if (allow.includes(role)) return <>{children}</>;
  return <section className="role-unavailable" role="status" data-testid="role-unavailable">
    <span className="role-unavailable-icon"><ShieldCheck size={22}/></span>
    <span className="eyebrow">PRIVATE WORKSPACE</span>
    <h2>This page is not available for your role.</h2>
    <p>Your {role.toLowerCase()} workspace only shows the records and tools relevant to you.</p>
    <Link href="/dashboard" className="button button-primary" data-testid="link-return-workspace">Return to your workspace <ArrowUpRight size={15}/></Link>
  </section>;
}
const getDemoTenant = (d: DataContextValue) =>
  d.tenants.find(tenant => tenant.unitId != null && (d.messages ?? []).some(message => message.unitId === tenant.unitId && message.from === 'property'))
    ?? d.tenants.find(tenant => tenant.unitId != null)
    ?? d.tenants[0];

type DashboardSearchResult = {
  title: string;
  detail: string;
  href: string;
  keywords: string;
  icon: ReactNode;
};

function DashboardSearch() {
  const d = useData();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const demoTenant = d.role === 'Tenant' ? getDemoTenant(d) : null;
  const visibleUnits = d.role === 'Tenant'
    ? d.units.filter(unit => unit.id === demoTenant?.unitId)
    : d.units;
  const visibleUnitIds = new Set(visibleUnits.map(unit => unit.id));
  const visibleTenantIds = new Set(d.role === 'Tenant' ? [demoTenant?.id] : d.tenants.map(tenant => tenant.id));
  const navResults: DashboardSearchResult[] = navGroupsByRole[d.role].flatMap(group => group.links.map(([href, label, Icon]) => ({
    title: label,
    detail: group.title,
    href,
    keywords: `${label} ${group.title}`,
    icon: <Icon size={16}/>,
  })));
  const records: DashboardSearchResult[] = [
    ...(d.role === 'Tenant' ? [] : d.properties.map(property => ({
      title: property.name,
      detail: property.address || 'Property',
      href: '/properties',
      keywords: `${property.name} ${property.address}`,
      icon: <Building2 size={16}/>,
    }))),
    ...(d.role === 'Tenant' ? [] : visibleUnits.map(unit => ({
      title: `Unit ${unit.unitNumber}`,
      detail: `${unit.tenantName || 'Vacant home'} · ${statusLabel(unit.status)} · ${fmt(unit.balance || unit.rentAmount)}`,
      href: `/unit/${unit.id}`,
      keywords: `${unit.unitNumber} ${unit.tenantName || ''} ${unit.status} ${d.properties.find(property => property.id === unit.propertyId)?.name || ''}`,
      icon: <House size={16}/>,
    }))),
    ...(d.role === 'Tenant' ? [] : d.tenants.filter(tenant => visibleTenantIds.has(tenant.id) && (d.role !== 'Caretaker' || tenant.unitId != null)).map(tenant => ({
      title: tenant.fullName,
      detail: tenant.unitNumber ? `Unit ${tenant.unitNumber} · Tenant` : 'Tenant record',
      href: '/tenants',
      keywords: `${tenant.fullName} ${tenant.unitNumber || ''}`,
      icon: <Users size={16}/>,
    }))),
    ...(d.payments || [])
      .filter(payment => visibleUnitIds.has(payment.unitId))
      .filter(payment => d.role !== 'Caretaker' || /caretaker|amina/i.test(payment.recordedBy))
      .map(payment => ({
        title: `Payment · ${payment.tenantName}`,
        detail: `Unit ${payment.unitNumber} · ${fmt(payment.amount)} · ${dateFmt(payment.recordedAt)}`,
        href: '/payments',
        keywords: `payment rent ${payment.tenantName} ${payment.unitNumber} ${payment.reference || ''} ${payment.amount}`,
        icon: <Wallet size={16}/>,
      })),
    ...(d.repairs || []).filter(repair => visibleUnitIds.has(repair.unitId)).map(repair => ({
      title: repair.title,
      detail: `Unit ${repair.unitNumber} · ${statusLabel(repair.status)}`,
      href: '/repairs',
      keywords: `repair ${repair.title} ${repair.unitNumber} ${repair.status} ${repair.description}`,
      icon: <Wrench size={16}/>,
    })),
    ...(d.agreements || [])
      .filter(agreement => d.role !== 'Tenant' || agreement.tenantName === demoTenant?.fullName)
      .map(agreement => ({
        title: `Agreement · ${agreement.tenantName}`,
        detail: `Unit ${agreement.unitNumber} · ${fmt(agreement.monthlyRent)} / month`,
        href: '/agreements',
        keywords: `agreement rent ${agreement.tenantName} ${agreement.unitNumber} ${agreement.monthlyRent}`,
        icon: <FileCheck2 size={16}/>,
      })),
  ];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = normalizedQuery
    ? [...records, ...navResults]
      .filter(item => `${item.title} ${item.detail} ${item.keywords}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 6)
    : navResults.slice(0, 4);
  const selectResult = (result: DashboardSearchResult) => {
    setLocation(result.href);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex(index => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      selectResult(results[activeIndex] || results[0]);
    }
  };
  useEffect(() => {
    const onOutsidePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('mousedown', onOutsidePointer);
    window.addEventListener('keydown', onShortcut);
    return () => {
      document.removeEventListener('mousedown', onOutsidePointer);
      window.removeEventListener('keydown', onShortcut);
    };
  }, []);
  return <div className="dashboard-search" ref={rootRef}>
    <label className="dashboard-search-box" htmlFor="dashboard-search-input">
      <span className="dashboard-search-icon"><Search size={18}/></span>
      <input
        ref={inputRef}
        id="dashboard-search-input"
        type="search"
        role="combobox"
        aria-label="Search this workspace"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="dashboard-search-results"
        aria-activedescendant={open && results[activeIndex] ? `dashboard-search-result-${activeIndex}` : undefined}
        aria-keyshortcuts="Control+K Meta+K"
        placeholder="Search homes, people, payments or repairs"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
        onKeyDown={handleKeyDown}
        data-testid="dashboard-search"
      />
      {query
        ? <button className="dashboard-search-clear" type="button" aria-label="Clear search" onClick={() => { setQuery(''); setActiveIndex(0); inputRef.current?.focus(); }}><X size={15}/></button>
        : <kbd className="dashboard-search-shortcut"><span>⌘</span><span>K</span></kbd>}
      <span className="dashboard-search-divider"/>
      <span className="dashboard-search-hint">Quick find</span>
    </label>
    {open && <div className="dashboard-search-popover" id="dashboard-search-results" role="listbox" aria-label="Workspace search results">
      <div className="dashboard-search-popover-heading"><span>{normalizedQuery ? 'MATCHING RECORDS' : 'QUICK JUMPS'}</span><small>{results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'No results'}</small></div>
      {results.length
        ? results.map((result, index) => <button
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          id={`dashboard-search-result-${index}`}
          className={classes('dashboard-search-result', index === activeIndex && 'is-active')}
          key={`${result.href}-${result.title}-${index}`}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => selectResult(result)}
        ><span className="dashboard-result-icon">{result.icon}</span><span className="dashboard-result-copy"><b>{result.title}</b><small>{result.detail}</small></span><ArrowUpRight size={15} className="dashboard-result-arrow"/></button>)
        : <div className="dashboard-search-empty"><Search size={16}/><span>No matches. Try a unit, tenant, payment, or repair.</span></div>}
      <div className="dashboard-search-footer"><span>Searches only records visible to your role</span><span><kbd>↑</kbd><kbd>↓</kbd><kbd>↵</kbd></span></div>
    </div>}
  </div>;
}

function RoleDashboardPage() {
  const { role } = useData();
  if (role === 'Caretaker') return <CaretakerDayPage/>;
  if (role === 'Tenant') return <TenantPortalPage showDashboardSearch/>;
  return <DashboardPage/>;
}
function RoleCollectionPage() {
  return <DailyCollectionPage/>;
}
function RolePropertiesPage() {
  const { role } = useData();
  if (role === 'Landlord') return <PropertiesPage/>;
  if (role === 'Caretaker') return <CaretakerHomesPage/>;
  return <Redirect to="/dashboard"/>;
}
function RolePaymentsPage() {
  const { role } = useData();
  if (role === 'Caretaker') return <CaretakerPaymentsPage/>;
  if (role === 'Tenant') return <TenantPaymentsPage/>;
  return <PaymentsPage/>;
}
function RoleTenantsPage() {
  const { role } = useData();
  if (role === 'Caretaker') return <CaretakerContactsPage/>;
  return role === 'Landlord' ? <TenantsPage/> : <RoleGate allow={['Landlord','Caretaker']}><TenantsPage/></RoleGate>;
}
function RoleRepairsPage() {
  const { role } = useData();
  if (role === 'Tenant') return <TenantRepairsPage/>;
  if (role === 'Caretaker') return <CaretakerRepairsPage/>;
  return <RepairsPage/>;
}
function RoleAgreementsPage() {
  const { role } = useData();
  if (role === 'Tenant') return <TenantAgreementPage/>;
  if (role === 'Landlord') return <AgreementsPage/>;
  return <CaretakerAgreementsPage/>;
}
function RoleNotificationsPage() {
  const { role } = useData();
  return role === 'Landlord' ? <NotificationsPage/> : <PrivateActivityPage/>;
}
function CaretakerDayPage() {
  const d = useData();
  const followUps = d.units.filter(unit => unit.tenantId != null && unit.balance > 0);
  const occupied = d.units.filter(unit => unit.tenantId != null);
  const paid = occupied.filter(unit => unit.balance === 0).length;
  const currentMonth = new Date();
  currentMonth.setDate(1); currentMonth.setHours(0, 0, 0, 0);
  const collected = d.payments.filter(payment => new Date(payment.recordedAt) >= currentMonth).reduce((sum, payment) => sum + payment.amount, 0);
  const expected = occupied.reduce((sum, unit) => sum + unit.rentAmount, 0);
  const progress = expected ? Math.min(100, Math.round(collected / expected * 100)) : 0;
  const openRepairs = d.repairs.filter(repair => repair.status !== 'done').slice(0, 3);
  return <div className="caretaker-day page-stack" data-testid="caretaker-daily-view">
    <DashboardSearch/>
    <section className="caretaker-welcome has-corner-mark">
      <div className="caretaker-welcome-copy"><span className="eyebrow"><Clock3 size={13}/> TODAY · {new Date().toLocaleDateString('en-UG',{weekday:'long', day:'numeric', month:'long'})}</span><h2>Keep the day moving.</h2><p>Here is what needs a follow-up at {d.dashboard?.propertyName || 'your property'}.</p><Link href="/daily-collection" className="button button-cream" data-testid="button-open-caretaker-collection"><Wallet size={15}/>Open collection <ArrowUpRight size={14}/></Link></div>
      <div className="caretaker-today-mark"><ClipboardList size={22}/><span>ON-SITE<br/>DESK</span></div>
      <span className="card-corner-mark" aria-hidden="true"><ArrowUpRight size={13}/></span>
    </section>
    <section className="collection-progress-card has-corner-mark" aria-label="Monthly collection progress">
      <div className="collection-progress-heading"><div><span className="eyebrow">MONTHLY COLLECTION</span><h2>{fmt(collected)} <small>of {fmt(expected)}</small></h2></div><span className="progress-fraction">{paid} of {occupied.length}<small>homes settled</small></span></div>
      <div className="collection-progress-track" role="progressbar" aria-label="Rent collected this month" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{transform:`scaleX(${progress / 100})`}}/></div>
      <div className="collection-progress-foot"><span>{progress}% recorded this month</span><span>{followUps.length} follow-up{followUps.length === 1 ? '' : 's'} remaining</span></div>
      <span className="card-corner-mark" aria-hidden="true"><ArrowUpRight size={12}/></span>
    </section>
    <div className="caretaker-day-columns">
      <Panel title="Follow-up units" action={<span className="count-bubble" aria-label={`${followUps.length} units to follow up`}>{followUps.length}</span>} className="caretaker-followups" cornerMark>
        <p className="role-panel-intro">A short list of homes with rent still due.</p>
        <DataState rows={followUps} title="Collection is up to date" text="There are no outstanding occupied units right now.">
          <div className="caretaker-followup-list">{followUps.map(unit => <article key={unit.id} className="caretaker-followup" data-testid={`caretaker-followup-${unit.id}`}><span className="unit-avatar late">{unit.unitNumber}</span><div className="caretaker-followup-person"><b>{unit.tenantName || 'Tenant'}</b><small>{unit.unitNumber} · Monthly rent {fmt(unit.rentAmount)}</small></div><div className="caretaker-followup-balance"><b>{fmt(unit.balance)}</b><Status value={unit.status}/></div></article>)}</div>
        </DataState>
      </Panel>
      <Panel title="Repair activity" action={<Link href="/repairs" className="text-link" data-testid="link-caretaker-repair-activity">View activity <ArrowUpRight size={14}/></Link>} className="caretaker-repair-panel" cornerMark>
        <p className="role-panel-intro">Repairs currently being looked after.</p>
        <DataState rows={openRepairs} title="No open repairs" text="New repair updates will appear here.">
          <div className="caretaker-repair-list">{openRepairs.map(repair => <article className="caretaker-repair-item" key={repair.id} data-testid={`caretaker-repair-${repair.id}`}><span className="repair-activity-icon"><Wrench size={16}/></span><div><b>{repair.title}</b><small>Unit {repair.unitNumber} · {dateFmt(repair.reportedAt)}</small></div><Status value={repair.status}/></article>)}</div>
        </DataState>
      </Panel>
    </div>
    <div className="caretaker-mobile-money"><Smartphone size={17}/><span><b>MTN MoMo and Airtel Money</b><small>Payment entries are kept with their reference in the browser ledger.</small></span><Link href="/payments" className="text-link" data-testid="link-caretaker-payment-records">See records <ArrowUpRight size={14}/></Link></div>
  </div>;
}
function CaretakerHomesPage() {
  const d = useData();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  return <div className="page-stack">
    <div className="role-page-intro"><span className="role-page-icon"><Building2 size={19}/></span><div><span className="eyebrow">MIREMBE COURT · KISAASI</span><h2>Homes in your care</h2><p>A simple unit view for collection follow-up and on-site repairs.</p></div></div>
    <section className="panel caretaker-homes-panel"><div className="panel-head"><h2>Unit status</h2><span className="toolbar-meta">{d.units.length} homes</span></div><DataState rows={d.units} title="No homes recorded" text="Home records for this property will appear here."><div className="caretaker-homes-grid" role="list" aria-label="Homes and current status">{d.units.map(unit => <div key={unit.id} role="listitem"><button type="button" className={`caretaker-home-tile unit-${unit.status}`} onClick={() => setSelectedUnit(unit)} aria-label={`Unit ${unit.unitNumber}, ${statusLabel(unit.status)}. View collection and repair details`} data-testid={`caretaker-home-${unit.id}`}><span className="caretaker-home-tile-head"><b>{unit.unitNumber}</b><Status value={unit.status}/></span><span>{unit.tenantName || 'Vacant home'}</span><strong>{unit.tenantId ? fmt(unit.balance > 0 ? unit.balance : unit.rentAmount) : '—'}</strong><small>{unit.tenantId ? unit.balance > 0 ? 'Balance to follow up' : 'Monthly rent' : 'No tenant assigned'}</small></button></div>)}</div></DataState>
      <div className="caretaker-unit-legend" aria-label="Unit status legend"><span><i className="legend-paid"/>Up to date</span><span><i className="legend-pending"/>Needs follow-up</span><span><i className="legend-repair"/>Repair</span><span><i className="legend-vacant"/>Vacant</span></div>
    </section>
    <UnitDrawer unit={selectedUnit} onClose={() => setSelectedUnit(null)}/>
  </div>;
}
function CaretakerPaymentsPage() {
  const d = useData();
  const payments = d.payments.filter(payment => payment.recordedBy.toLowerCase().includes('caretaker') || payment.recordedBy.toLowerCase().includes('amina'));
  return <div className="page-stack">
    <div className="role-page-intro"><span className="role-page-icon"><ReceiptText size={19}/></span><div><span className="eyebrow">YOUR RECORDS</span><h2>Payments you recorded</h2><p>Only collection entries attributed to the caretaker are shown here.</p></div></div>
    <section className="panel role-record-panel"><DataState rows={payments} title="No caretaker entries yet" text="Payments recorded by the on-site caretaker will appear here."><div className="role-record-list">{payments.map(payment => <article className="role-record-row" key={payment.id} data-testid={`caretaker-payment-${payment.id}`}><span className="payment-check"><Check size={15}/></span><div><b>Unit {payment.unitNumber} · {payment.tenantName}</b><small>{dateFmt(payment.recordedAt)} · {payment.method === 'mobile_money' ? 'MTN / Airtel mobile money' : statusLabel(payment.method)}{payment.reference ? ` · ${payment.reference}` : ''}</small></div><strong>{fmt(payment.amount)}</strong></article>)}</div></DataState></section>
  </div>;
}
function CaretakerContactsPage() {
  const d = useData();
  const contacts = d.tenants.filter(tenant => tenant.unitId != null);
  return <div className="page-stack"><div className="role-page-intro"><span className="role-page-icon"><Users size={19}/></span><div><span className="eyebrow">PROPERTY IN YOUR CARE</span><h2>Tenant contacts</h2><p>Contact and home status for the occupied units you look after.</p></div></div>
    <section className="panel role-record-panel"><DataState rows={contacts} title="No occupied homes" text="Tenant contact details will appear here when a home is occupied."><div className="role-record-list">{contacts.map(tenant => { const unit = d.units.find(item => item.id === tenant.unitId); return <article className="role-contact-row" key={tenant.id} data-testid={`caretaker-contact-${tenant.id}`}><span className="tenant-avatar">{initials(tenant.fullName)}</span><div className="role-contact-person"><b>{tenant.fullName}</b><small>{unit?.unitNumber} · {maskPhone(tenant.phone)}</small></div><Status value={unit?.status || 'pending'}/><span className="role-contact-balance">{unit && unit.balance > 0 ? fmt(unit.balance) : 'Up to date'}</span></article>; })}</div></DataState></section>
    <p className="privacy-note"><ShieldCheck size={16}/><span>Phone numbers stay partially hidden in this browser view.</span></p>
  </div>;
}
function CaretakerRepairsPage() {
  const d = useData();
  const repairs = d.repairs;
  return <div className="page-stack"><div className="role-page-intro"><span className="role-page-icon"><Wrench size={19}/></span><div><span className="eyebrow">PROPERTY CARE</span><h2>Repair activity</h2><p>Move each request forward and record the work cost when it is known.</p></div></div>
    <section className="panel role-record-panel"><DataState rows={repairs} title="No repair records yet" text="Repair reports from tenants will appear here."><div className="role-record-list">{repairs.map(repair => <article className="role-repair-row" key={repair.id} data-testid={`caretaker-repair-record-${repair.id}`}><span className="repair-activity-icon"><Wrench size={16}/></span><div><b>{repair.title}</b><small>Unit {repair.unitNumber} · Reported {dateFmt(repair.reportedAt)}{repair.assignedTo ? ` · ${repair.assignedTo}` : ''}</small><p>{repair.description}</p>{repair.photoDataUrl && <img className="repair-photo" src={repair.photoDataUrl} alt={`Photo attached to ${repair.title}`}/>}<RepairWorkflowActions repair={repair}/></div><Status value={repair.status}/></article>)}</div></DataState></section>
  </div>;
}
function RepairWorkflowActions({ repair }: { repair: Repair }) {
  const d = useData();
  const actor = d.role === 'Caretaker' ? 'Amina · Caretaker' : 'Agnes M. · Landlord';
  const [cost, setCost] = useState(repair.cost == null ? '' : String(repair.cost));
  const [assignee, setAssignee] = useState(repair.assignedTo ?? '');
  const nextStatus = repair.status === 'reported' ? 'assigned' : repair.status === 'assigned' ? 'in_progress' : 'done';
  const advance = () => {
    try {
      const previousStatus = repair.status;
      const previousAssignedTo = repair.assignedTo;
      d.updateRepair(repair.id, {
        status: nextStatus,
        actor,
        ...(repair.status === 'reported' && assignee.trim() ? { assignedTo: assignee.trim() } : {}),
      });
      d.notify(`Repair moved to ${statusLabel(nextStatus)}`, () => { d.updateRepair(repair.id, { status: previousStatus, assignedTo: previousAssignedTo, actor }); });
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not update repair status.');
    }
  };
  const saveDetails = (event: FormEvent) => {
    event.preventDefault();
    try {
      d.updateRepair(repair.id, {
        cost: cost.trim() ? Number(cost) : null,
        assignedTo: assignee.trim() || null,
        actor,
      });
      d.notify('Repair details saved');
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not save repair details.');
    }
  };
  return <div className="repair-workflow-controls">
    <form className="repair-detail-form" onSubmit={saveDetails}>
      <label>Assigned to<input value={assignee} onChange={event => setAssignee(event.target.value)} placeholder="Name or trade"/></label>
      <label>Cost (UGX)<input type="number" min="0" inputMode="numeric" value={cost} onChange={event => setCost(event.target.value)} placeholder="Add when known"/></label>
      <button className="button button-quiet" type="submit">Save details</button>
    </form>
    {repair.status !== 'done' && <button className="repair-action" type="button" onClick={advance} data-testid={`advance-repair-${repair.id}`}>{repair.status === 'reported' ? 'Assign repair' : repair.status === 'assigned' ? 'Start work' : 'Mark complete'} <ArrowUpRight size={14}/></button>}
  </div>;
}
function CaretakerAgreementsPage() {
  const d = useData();
  return <div className="page-stack">
    <div className="role-page-intro"><span className="role-page-icon"><FileCheck2 size={19}/></span><div><span className="eyebrow">COLLECTION REFERENCE</span><h2>Rent summaries</h2><p>Only the details needed to follow up on rent are shown here.</p></div></div>
    <section className="panel role-record-panel"><DataState rows={d.agreements} title="No rent summaries yet" text="Collection details will appear here when an agreement is recorded."><div className="role-record-list">{d.agreements.map(agreement => <article className="role-record-row" key={agreement.id} data-testid={`caretaker-agreement-${agreement.id}`}><span className="agreement-file"><FileCheck2 size={17}/></span><div><b>Unit {agreement.unitNumber} · {agreement.tenantName}</b><small>Next rent due {dateFmt(agreement.nextDueDate)} · {agreement.signedAt ? 'Agreement on file' : 'Awaiting signature'}</small></div><strong>{fmt(agreement.monthlyRent)}<small className="agreement-frequency"> / month</small></strong></article>)}</div></DataState></section>
  </div>;
}
function TenantPaymentsPage() {
  const d = useData(); const tenant = getDemoTenant(d); const unit = d.units.find(item => item.id === tenant?.unitId); const payments = d.payments.filter(payment => payment.unitId === tenant?.unitId);
  const agreement = d.agreements.find(item => item.tenantId === tenant?.id);
  const c = tenantCopy(d.language);
  const [payOpen, setPayOpen] = useState(false);
  const now = new Date();
  const paidThisMonth = payments.filter(payment => payment.status !== 'pending').filter(payment => { const at = new Date(payment.recordedAt); return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth(); }).reduce((sum, payment) => sum + payment.amount, 0);
  const totalPaid = payments.filter(payment => payment.status !== 'pending').reduce((sum, payment) => sum + payment.amount, 0);
  const canPay = (tenant?.balance ?? 0) > 0 && Boolean(tenant) && Boolean(unit);
  return <div className="page-stack"><div className="role-page-intro"><span className="role-page-icon"><ReceiptText size={19}/></span><div><span className="eyebrow">{c.paymentsEyebrow}</span><h2>{c.paymentsTitle}</h2><p>{c.paymentsIntro(tenant?.unitNumber ? `Unit ${tenant.unitNumber}` : 'your home')}</p></div>{canPay && <button type="button" className="button button-primary role-intro-action" onClick={() => setPayOpen(true)} data-testid="button-payments-pay-rent"><Smartphone size={15}/>{c.payRent}</button>}</div>
    <section className="tenant-pay-summary" aria-label="Payment summary"><div><span>{c.paymentsThisMonth}</span><b>{fmt(paidThisMonth)}</b></div><div><span>{c.paymentsTotal}</span><b>{fmt(totalPaid)}</b></div><div><span>{c.balanceEyebrow}</span><b className={canPay ? 'due' : ''}>{fmt(tenant?.balance ?? 0)}</b></div></section>
    <section className="panel role-record-panel"><DataState rows={payments} title={c.noReceipts} text={c.noReceiptsHint} action={canPay ? <button type="button" className="button button-primary" onClick={() => setPayOpen(true)} data-testid="button-empty-pay-rent"><Smartphone size={15}/>{c.payRent}</button> : undefined}><div className="role-record-list">{payments.map(payment => <article className="role-record-row" key={payment.id} data-testid={`tenant-payment-${payment.id}`}><span className="payment-check"><Check size={15}/></span><div><b>{dateFmt(payment.recordedAt)} · rent</b><small>{payment.method === 'mobile_money' ? 'MTN / Airtel mobile money' : statusLabel(payment.method)}{payment.reference ? ` · Ref ${payment.reference}` : ''}</small><span className={classes('status-pill', payment.status === 'paid' ? 'status-paid' : 'status-pending')}><i/>{payment.status === 'paid' ? c.statusPillConfirmed : c.statusPillPending}</span></div><strong>{fmt(payment.amount)}</strong><Link href={`/receipt/${payment.id}`} className="icon-button" aria-label={`${c.viewReceipt} · ${dateFmt(payment.recordedAt)}`}><ReceiptText size={16}/></Link></article>)}</div></DataState></section>
    <div className="mobile-money-note"><Smartphone size={17}/><span>{c.payCallout}</span></div>
    {payOpen && tenant && unit && <PayRentModal tenant={tenant} unit={unit} agreement={agreement} close={() => setPayOpen(false)}/>}
  </div>;
}
function TenantRepairsPage() {
  const d = useData();
  const tenant = getDemoTenant(d);
  const unit = d.units.find(item => item.id === tenant?.unitId);
  const repairs = d.repairs.filter(repair => repair.unitId === tenant?.unitId);
  const c = tenantCopy(d.language);
  const [reportOpen, setReportOpen] = useState(false);
  return <div className="page-stack"><div className="role-page-intro"><span className="role-page-icon"><Wrench size={19}/></span><div><span className="eyebrow">{c.repairsEyebrow}</span><h2>{c.repairsTitle}</h2><p>{c.repairsIntro}</p></div>{tenant && unit && <button type="button" className="button button-primary role-intro-action" onClick={() => setReportOpen(true)} data-testid="button-open-report"><Plus size={15}/>{c.quickReport}</button>}</div>
    <section className="panel role-record-panel"><DataState rows={repairs} title={c.noRepairs} text={c.noRepairsHint} action={tenant && unit ? <button type="button" className="button button-primary" onClick={() => setReportOpen(true)} data-testid="button-empty-report"><Wrench size={15}/>{c.ctaReport}</button> : undefined}><div className="role-record-list">{repairs.map(repair => <article className="role-repair-row" key={repair.id} data-testid={`tenant-repair-${repair.id}`}><span className="repair-activity-icon"><Wrench size={16}/></span><div><b>{repair.title}</b><small>{c.reportedOn(dateFmt(repair.reportedAt))} · Unit {repair.unitNumber}</small><p>{repair.description}</p>{repair.assignedTo && <small className="repair-handler">{c.handledBy(repair.assignedTo)}</small>}{repair.photoDataUrl && <img className="repair-photo" src={repair.photoDataUrl} alt={`Photo attached to ${repair.title}`}/>}<RepairHistoryList repair={repair}/></div><span className={classes('status-pill', `status-${repair.status.replaceAll('_', '-')}`)}><i/>{c.repairStatusLabel(repair.status)}</span></article>)}</div></DataState></section>
    {reportOpen && tenant && unit && <QuickRepairModal tenant={tenant} unit={unit} close={() => setReportOpen(false)}/>}
  </div>;
}
function TenantAgreementPage() {
  const d = useData(); const tenant = getDemoTenant(d); const agreement = d.agreements.find(item => item.tenantId === tenant?.id);
  const c = tenantCopy(d.language);
  const [signing, setSigning] = useState(false);
  if (!agreement) return <Empty title={c.noAgreement} text={c.noAgreementHint}/>;
  return <div className="page-stack"><div className="role-page-intro"><span className="role-page-icon"><FileCheck2 size={19}/></span><div><span className="eyebrow">{c.agreementEyebrow(agreement.unitNumber)}</span><h2>{c.agreementTitle}</h2><p>{c.agreementIntro}</p></div></div><article className="agreement-card tenant-own-agreement"><div className="agreement-card-head"><span className="agreement-file"><FileCheck2 size={18}/></span><span className={agreement.signedAt ? 'signed-label' : 'unsigned-label'}>{agreement.signedAt ? c.signedLabel : c.unsignedLabel}</span></div><div className="agreement-rent">{fmt(agreement.monthlyRent)}<small>{c.perMonth}</small></div><div className="agreement-details"><div><span>{c.deposit}</span><b>{fmt(agreement.deposit)}</b></div><div><span>{c.agreementTerm}</span><b>{dateFmt(agreement.startDate)} — {dateFmt(agreement.endDate)}</b></div><div><span>{c.nextRentDue}</span><b className="due-date"><CalendarDays size={14}/>{dateFmt(agreement.nextDueDate)}</b></div></div><div className="agreement-card-foot"><span>{agreement.signedAt ? `${c.signedLabel} ${dateFmt(agreement.signedAt)}${agreement.signedBy ? ` · ${agreement.signedBy}` : ''}` : c.agreementOnFile}</span>{!agreement.signedAt && <button type="button" className="button button-primary" onClick={() => setSigning(true)}>{c.signAgreement} <ArrowUpRight size={14}/></button>}</div>{agreement.signatureDataUrl && <div className="agreement-signature"><img src={agreement.signatureDataUrl} alt={`Signature ${agreement.signedBy ?? ''}`}/></div>}</article>{signing && <AgreementSignatureModal agreement={agreement} close={() => setSigning(false)}/>}</div>;
}
function PrivateActivityPage() {
  const d = useData(); const tenant = getDemoTenant(d); const isTenant = d.role === 'Tenant';
  const c = tenantCopy(d.language);
  const [filter, setFilter] = useState('all');
  const activities = d.activity.filter(item => {
    if (isTenant) return item.unitId === tenant?.unitId && item.type !== 'contact_reveal';
    return d.payments.some(payment => payment.unitId === item.unitId && payment.recordedBy.toLowerCase().includes('caretaker') && payment.id === item.id)
      || (item.type === 'repair' && d.repairs.some(repair => repair.unitId === item.unitId));
  }).filter(item => filter === 'all' || item.type === filter);
  const filters: [string, string][] = isTenant
    ? [['all', c.activityFilterAll], ['payment', c.activityFilterPayment], ['repair', c.activityFilterRepair], ['message', c.activityFilterMessage]]
    : [['all', c.activityFilterAll], ['payment', c.activityFilterPayment], ['repair', c.activityFilterRepair]];
  return <div className="page-stack">
    <div className="role-page-intro"><span className="role-page-icon"><Bell size={19}/></span><div><span className="eyebrow">{isTenant ? c.activityEyebrow : 'YOUR RECENT WORK'}</span><h2>{isTenant ? c.activityTitle : 'Activity and receipts'}</h2><p>{isTenant ? c.activityIntro : 'A record of caretaker collection and repair activity.'}</p></div></div>
    <div className="toolbar notification-toolbar"><div className="toolbar-meta">{activities.length} {isTenant ? 'records' : 'activity records'}</div><div className="filter-pills">{filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} data-testid={`activity-filter-${value}`}>{label}</button>)}</div></div>
    <section className="panel notifications-panel"><DataState rows={activities} title={isTenant ? c.activityEmptyTitle : 'Your activity is up to date'} text={isTenant ? c.activityEmptyText : 'New payment receipts and property activity will be listed here.'}>
      <div className="timeline">{activities.map((item, index) => <div className="timeline-entry" key={item.id}><div className="timeline-rail"><span className={`timeline-icon type-${item.type}`}>{item.type === 'payment' ? <Wallet size={16}/> : item.type === 'repair' ? <Wrench size={16}/> : <Bell size={16}/>}</span>{index < activities.length - 1 && <i/>}</div><div className="timeline-body"><div className="timeline-title"><b>{item.title}</b><time>{dateFmt(item.occurredAt)}</time></div><p>{item.detail}</p><div className="timeline-meta"><span>Unit {item.unitNumber}</span>{isTenant ? <span>{c.recordedBy(item.actor)}</span> : <span>{item.actor}</span>}</div>{item.type === 'payment' && isTenant && <Link className="receipt-link" href={`/receipt/${item.id}`}><ReceiptText size={14}/>{c.viewReceipt} <ArrowUpRight size={13}/></Link>}{item.type === 'message' && isTenant && <Link className="receipt-link" href="/messages"><MessageSquare size={14}/>{c.panelMessages} <ArrowUpRight size={13}/></Link>}</div></div>)}</div>
    </DataState></section></div>;
}
function DashboardPage() {
  const d = useData(); const s = d.dashboard; const activities = d.activity || s?.activity || []; const [, setLocation] = useLocation(); const loading = useSimulatedLoad(500);
  const [reminderUnit, setReminderUnit] = useState<Unit | null>(null);
  if (loading) return <div className="page-stack dashboard-page"><DashboardSearch/><div className="dashboard-grid"><div className="metrics-grid">{[0, 1, 2, 3].map(index => <div className="metric-card" key={index}><div className="metric-top"><span><Skeleton height={10} width="62%"/></span><Skeleton height={30} width={30} radius={8}/></div><div style={{ margin: '11px 0 6px' }}><Skeleton height={22} width="70%"/></div><Skeleton height={9} width="48%"/></div>)}</div><Panel title="Loading overview"><Skeleton height={130}/></Panel><Panel title="Recent activity"><Skeleton height={96}/></Panel></div></div>;
  const occupied = s?.occupiedUnits ?? 0;
  const paidCount = s?.paidCount ?? 0;
  const lateUnits = s?.lateUnits ?? [];
  const agreementsEndingSoon = s?.agreementsEndingSoon ?? [];
  const todayLabel = new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' });
  const heroHeadline = occupied === 0
    ? <>No occupied homes<br/><em>yet.</em></>
    : <>{paidCount} of {occupied} unit{occupied === 1 ? '' : 's'} have paid.<br/><em>{lateUnits.length ? `${lateUnits.length} unit${lateUnits.length === 1 ? '' : 's'} need${lateUnits.length === 1 ? 's' : ''} a follow-up.` : 'Everything is up to date.'}</em></>;
  return <div className="page-stack dashboard-page"><DashboardSearch/><div className="dashboard-grid">
     <div className="metrics-grid"><Metric label="Collected this month" numeric={s?.totalCollected ?? 0} format={compact} note="Across all active properties" icon={Wallet} cornerMark/><Metric label="Outstanding" numeric={s?.outstanding ?? 0} format={compact} note={`${s?.lateCount || 0} units need a follow-up`} icon={Clock3} tone="amber" cornerMark/><Metric label="Occupancy" value={`${s?.occupiedUnits ?? 0} / ${s?.totalUnits ?? 0}`} note={`${s?.totalUnits ? Math.round((s.occupiedUnits / s.totalUnits) * 100) : 0}% of homes occupied`} icon={Building2} tone="blue" cornerMark/><Metric label="Paid today" numeric={s?.paidToday ?? 0} format={n => `${Math.round(n)} payment${Math.round(n) === 1 ? '' : 's'}`} note={s?.paidTodayAmount ? `${fmt(s.paidTodayAmount)} received` : 'No payments recorded yet'} icon={CheckCircle2} tone="green" cornerMark/></div>
    <section className="collection-hero"><div className="hero-copy"><div className="hero-label"><CalendarDays size={15}/> TODAY · {todayLabel.toUpperCase()}</div><h2>{heroHeadline}</h2><p>{s?.paidTodayAmount ? `${fmt(s.paidTodayAmount)} collected today · ` : ''}{fmt(s?.totalCollected ?? 0)} collected this month.</p><Link href="/daily-collection" className="button button-cream">Go to daily collection <ArrowUpRight size={16}/></Link></div><div className="trust-seal"><div className="seal-ring"><ShieldCheck size={29}/><strong>{paidCount}/{occupied}</strong><small>RENT<br/>PAID</small></div><div className="seal-caption">{fmt(s?.totalCollected ?? 0)}<br/>this month</div></div><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/></section>
      <Panel title="Needs your attention" className="attention-panel" cornerMark><div className="attention-list">
        {lateUnits.slice(0, 3).map(unit => <div key={`late-${unit.id}`} className="attention-item"><span className="attention-mark warn">!</span><span><b>{unit.tenantName || 'Tenant'}</b> · Unit {unit.unitNumber} · {fmt(unit.balance)}{unit.daysLate != null ? ` · ${unit.daysLate} day${unit.daysLate === 1 ? '' : 's'} late` : ''}</span><button className="attention-reminder" onClick={() => setReminderUnit(unit)} aria-label={`Send rent reminder to ${unit.tenantName || 'tenant'} for unit ${unit.unitNumber}`} data-testid={`button-remind-${unit.id}`}>Send reminder</button></div>)}
        {agreementsEndingSoon.slice(0, 2).map(agreement => <div key={`ending-${agreement.id}`} className="attention-item"><span className="attention-mark"><FileCheck2 size={14}/></span><span>Agreement for <b>{agreement.tenantName}</b> ends in {daysUntilDate(agreement.endDate, new Date())} days</span><button onClick={() => setLocation('/agreements')} aria-label={`Review agreement for ${agreement.tenantName}`}><ArrowUpRight size={15}/></button></div>)}
        {(s?.unresolvedRepairs ?? 0) > 0 && <div className="attention-item"><span className="attention-mark"><Wrench size={14}/></span><span>{s?.unresolvedRepairs} repair{s?.unresolvedRepairs === 1 ? '' : 's'} need{(s?.unresolvedRepairs ?? 0) === 1 ? 's' : ''} attention</span><button onClick={() => setLocation('/repairs')} aria-label="Review open repairs"><ArrowUpRight size={15}/></button></div>}
        {!lateUnits.length && !agreementsEndingSoon.length && !(s?.unresolvedRepairs) && <div className="calm-empty"><CheckCircle2 size={18}/>Nothing needs attention right now.</div>}
      </div><Link href="/daily-collection" className="panel-foot-link">Review collection <ArrowUpRight size={14}/></Link></Panel>
      <Panel title="Units at a glance" action={<Link href="/properties" className="text-link">View all <ArrowUpRight size={14}/></Link>} className="units-panel" cornerMark><div className="unit-grid">{(s?.units || d.units || []).slice(0, 8).map(u => <UnitTile key={u.id} unit={u}/>)}</div>{!(s?.units || d.units)?.length && <Empty title="No units to show" text="Add a property and its units to see the monthly picture here." action={<Link className="text-link" href="/properties">Add a property</Link>}/>}</Panel>
      <UpcomingRentPanel agreements={d.agreements} cornerMark/>
     <Panel title="Recent activity" action={<Link href="/notifications" className="text-link">See activity <ArrowUpRight size={14}/></Link>} className="activity-panel" cornerMark><DataState rows={activities}><div className="activity-list">{activities.slice(0, 5).map(a => <ActivityRow key={a.id} item={a}/>)}</div></DataState></Panel>
    <div className="mobile-money-note"><Smartphone size={17}/><span><b>Mobile money, made clear.</b> MTN MoMo and Airtel Money entries are recorded alongside every receipt.</span><Link href="/payments">View ledger</Link></div>
  </div>
  {reminderUnit && <ReminderModal unit={reminderUnit} close={() => setReminderUnit(null)}/>}
  </div>;
}
function UpcomingRentPanel({ agreements, cornerMark = false }: { agreements: Agreement[]; cornerMark?: boolean }) {
  const today = new Date();
  const todayKey = localDateKey(today);
  const upcoming = (agreements || [])
    .filter(item => item.startDate <= todayKey && item.endDate >= todayKey && item.nextDueDate >= todayKey)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate) || a.unitNumber.localeCompare(b.unitNumber))
    .slice(0, 3);
  const renderState = (icon: ReactNode, text: string) => <div className="upcoming-rent-state">{icon}<span>{text}</span></div>;
  return <Panel title="Upcoming rent" action={<Link href="/agreements" className="text-link">View agreements <ArrowUpRight size={14}/></Link>} className="upcoming-rent-panel" cornerMark={cornerMark}>
    {upcoming.length ? <div className="upcoming-rent-list">{upcoming.map(item => {
        const days = daysUntilDate(item.nextDueDate, today);
        const dueLabel = days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : days < 7 ? `Due in ${days} days` : dateFmt(item.nextDueDate);
        return <div className="upcoming-rent-item" key={item.id}>
          <span className="upcoming-rent-icon"><CalendarDays size={16}/></span>
          <span className="upcoming-rent-tenant"><b>{item.tenantName}</b><small>Unit {item.unitNumber}</small></span>
          <span className="upcoming-rent-amount"><b>{compact(item.monthlyRent)}</b><small>{dueLabel}</small></span>
        </div>;
      })}</div>
      : renderState(<CalendarDays size={18}/>, 'No upcoming rent due dates are recorded.')}
  </Panel>;
}
function UnitTile({ unit }: { unit: Unit }) {
  return <Link href={`/unit/${unit.id}`} className={`unit-tile unit-${unit.status}`} data-testid={`unit-tile-${unit.id}`}><span>{unit.unitNumber}</span><i/><small>{unit.tenantName || statusLabel(unit.status)}</small><b>{unit.balance > 0 ? fmt(unit.balance) : fmt(unit.rentAmount)}</b></Link>;
}
function ActivityRow({ item }: { item: Activity }) {
  return <div className="activity-row"><span className={`activity-symbol activity-${item.type}`}><ActivityIcon size={16}/></span><div className="activity-content"><b>{item.title}</b><span>{item.detail}</span></div><time>{dateFmt(item.occurredAt)}</time></div>;
}
function PropertiesPage() {
  const d = useData(); const [mode, setMode] = useState<'plan' | 'list'>('plan'); const [open, setOpen] = useState(false); const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null); const [unitSearch, setUnitSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('all');
  const [propertyId, setPropertyId] = useState<number | ''>(''); const [unitNo, setUnitNo] = useState(''); const [beds, setBeds] = useState('1'); const [rent, setRent] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [dragTenant, setDragTenant] = useState<Tenant | null>(null);
  const [dragOverUnitId, setDragOverUnitId] = useState<number | null>(null);
  const [dragValid, setDragValid] = useState(false);
  const [hoverUnitId, setHoverUnitId] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ tenant: Tenant; unit: Unit } | null>(null);
  const dragOverUnitIdRef = useRef<number | null>(null);
  const dragValidRef = useRef(false);
  const pendingDrag = useRef<Tenant | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const downX = useRef(0);
  const downY = useRef(0);
  const updateDrag = (tenant: Tenant, x: number, y: number) => {
    setCursor({ x, y });
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const unitEl = el?.closest('[data-unit-id]') as HTMLElement | null;
    const unitId = unitEl ? Number(unitEl.dataset.unitId) : null;
    const unit = unitId != null ? (d.units || []).find(u => u.id === unitId) : undefined;
    const valid = Boolean(unit) && (unit?.tenantId == null || unit?.tenantId === tenant.id);
    setDragOverUnitId(unit ? unitId : null);
    setDragValid(valid);
    dragOverUnitIdRef.current = unit ? unitId : null;
    dragValidRef.current = valid;
  };
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!pendingDrag.current) return;
      if (!draggingRef.current) {
        if (Math.hypot(event.clientX - downX.current, event.clientY - downY.current) > 6) {
          draggingRef.current = true;
          setDragTenant(pendingDrag.current);
        }
      }
      if (draggingRef.current) updateDrag(pendingDrag.current, event.clientX, event.clientY);
    };
    const up = () => {
      if (draggingRef.current && pendingDrag.current) {
        suppressClickRef.current = true;
        const tenant = pendingDrag.current;
        const unit = dragOverUnitIdRef.current != null ? (d.units || []).find(u => u.id === dragOverUnitIdRef.current) : undefined;
        const valid = dragValidRef.current;
        pendingDrag.current = null;
        draggingRef.current = false;
        setDragTenant(null);
        setDragOverUnitId(null);
        setDragValid(false);
        setCursor(null);
        if (valid && unit) setAssignTarget({ tenant, unit });
      } else {
        pendingDrag.current = null;
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [d.units]);
  const currentAssignTenant = d.tenants.find(t => t.id === (dragTenant ? dragTenant.id : selectedTenantId ?? -1));
  const assignStateFor = (unit: Unit) => {
    if (!currentAssignTenant) return { cls: '', label: null as string | null };
    const valid = unit.tenantId == null || unit.tenantId === currentAssignTenant.id;
    const activeId = dragTenant ? dragOverUnitId : hoverUnitId;
    const hovered = activeId === unit.id;
    return { cls: hovered ? (valid ? 'assignment-hover' : 'assignment-invalid') : '', label: hovered ? (valid ? (currentAssignTenant.unitId != null ? 'Move here' : 'Drop to assign') : 'Not allowed') : null };
  };
  const onUnitClick = (unit: Unit) => {
    const tenant = currentAssignTenant;
    if (tenant && selectedTenantId != null && !dragTenant) {
      const valid = unit.tenantId == null || unit.tenantId === tenant.id;
      if (!valid) { d.notify('That home is occupied. Choose a vacant home to assign this tenant.'); return; }
      setAssignTarget({ tenant, unit });
      return;
    }
    setSelectedUnit(unit);
  };
  const addUnit = (e: FormEvent) => {
    e.preventDefault();
    const id = Number(propertyId || d.properties[0]?.id);
    if (!id) return;
    try {
      d.createUnit({ propertyId: id, unitNumber: unitNo, bedrooms: Number(beds), rentAmount: Number(rent) });
      d.notify(`Unit ${unitNo} added`);
      setAddingUnit(false);
      setUnitNo('');
      setRent('');
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not add unit. Please try again.');
    }
  };
  return <div className="page-stack"><div className="toolbar"><div className="toolbar-meta"><b>{d.properties?.length ?? 0} properties</b><span>·</span><span>{d.units?.length ?? 0} units tracked</span></div><div className="toolbar-right"><div className="segmented"><button className={mode === 'plan' ? 'selected' : ''} onClick={() => setMode('plan')} aria-pressed={mode === 'plan'} data-testid="toggle-floorplan"><LayoutDashboard size={15}/>Floor plan</button><button className={mode === 'list' ? 'selected' : ''} onClick={() => setMode('list')} aria-pressed={mode === 'list'} data-testid="toggle-list"><List size={16}/>List</button></div><button className="button button-primary" onClick={() => setOpen(true)} data-testid="button-add-property"><Plus size={16}/>Add property</button></div></div>
     {mode === 'plan' && <div className="toolbar map-filter"><label className="filter-search"><Search size={16}/><input aria-label="Search units or tenants" placeholder="Search unit or tenant" value={unitSearch} onChange={e => setUnitSearch(e.target.value)} data-testid="search-units"/></label><select aria-label="Filter units by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="filter-unit-status"><option value="all">All unit states</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="late">Late</option><option value="vacant">Vacant</option><option value="repair">Under repair</option></select></div>}
    {mode === 'plan' && (d.tenants?.length ?? 0) > 0 && <div className="assignment-tray" role="group" aria-label="Assign a tenant to a home"><div><b>Assign a tenant</b><small>Drag a person onto a home, or tap a person then a home.</small></div><div className="assignment-people">{d.tenants.map(t => <button type="button" key={t.id} className={classes('assignment-person', selectedTenantId === t.id && 'selected')} onPointerDown={event => { pendingDrag.current = t; downX.current = event.clientX; downY.current = event.clientY; draggingRef.current = false; suppressClickRef.current = false; }} onClick={() => { if (suppressClickRef.current) { suppressClickRef.current = false; return; } setSelectedTenantId(prev => prev === t.id ? null : t.id); }} aria-pressed={selectedTenantId === t.id} data-testid={`assign-person-${t.id}`}><span className="tenant-avatar">{initials(t.fullName)}</span><span><b>{t.fullName}</b><small>{t.unitNumber ? `Unit ${t.unitNumber}` : 'No unit yet'}</small></span></button>)}</div>{selectedTenantId != null && <button type="button" className="button button-quiet assignment-cancel" onClick={() => setSelectedTenantId(null)}>Cancel</button>}</div>}
    <DataState rows={d.properties} title="Your first property starts here" text="Create a property, then add units and keep every rent record in one place.">
        {mode === 'plan' ? <div className="property-plan-grid">{d.properties?.map((p, idx) => <section className="property-plan panel" key={p.id}><div className="property-plan-head"><div className={`building-icon building-${idx % 3}`}><Building2 size={20}/></div><div><h2>{p.name}</h2><span><MapPin size={13}/>{p.address}</span></div><button className="icon-button" aria-label={`More options for ${p.name}`}><MoreHorizontal size={18}/></button></div><p className="property-description">{p.description || 'Homes, managed with care.'}</p>{p.photoDataUrls?.length ? <div className="property-photo-strip" aria-label={`${p.photoDataUrls.length} property photos`}>{p.photoDataUrls.slice(0, 4).map((photo, photoIndex) => <img key={`${p.id}-photo-${photoIndex}`} src={photo} alt={`${p.name} photo ${photoIndex + 1}`}/>)}</div> : null}<div className="floorplan" data-testid={`floorplan-${p.id}`}><div className="floorplan-label">UNIT MAP <span>Tap a home to review</span></div><div className="floorplan-units">{(d.units || []).filter(u => u.propertyId === p.id && (statusFilter === 'all' || u.status === statusFilter) && `${u.unitNumber} ${u.tenantName || ''}`.toLowerCase().includes(unitSearch.toLowerCase())).map(unit => <button key={unit.id} data-unit-id={unit.id} onClick={() => onUnitClick(unit)} onPointerEnter={() => setHoverUnitId(unit.id)} onPointerLeave={() => setHoverUnitId(id => (id === unit.id ? null : id))} className={classes(`floor-unit floor-${unit.status}`, assignStateFor(unit).cls)} aria-label={`Unit ${unit.unitNumber}, ${statusLabel(unit.status)}. View details`} data-testid={`floor-unit-${unit.id}`}><span>{unit.unitNumber}</span><small>{unit.bedrooms} bed</small><i>{unit.status === 'paid' ? <Check size={12}/> : unit.status === 'late' ? 'Due' : statusLabel(unit.status)}</i>{assignStateFor(unit).label && <em>{assignStateFor(unit).label}</em>}</button>)}</div><div className="floor-legend" aria-label="Unit status legend"><span><i className="paid-dot"/>Paid</span><span><i className="pending-dot"/>Pending</span><span><i className="late-dot"/>Late</span><span><i className="vacant-dot"/>Vacant</span><span><i className="repair-dot"/>Under repair</span></div></div><div className="property-foot"><span><b>{p.unitCount}</b> total units</span><button className="text-link" onClick={() => { setPropertyId(p.id); setAddingUnit(true); }}>Add unit <Plus size={14}/></button></div></section>)}</div> : <div className="panel table-panel"><table><thead><tr><th>Property</th><th>Address</th><th>Units</th><th>Occupancy</th><th>Actions</th></tr></thead><tbody>{d.properties?.map(p => { const units = (d.units || []).filter(u => u.propertyId === p.id); return <tr key={p.id}><td><b>{p.name}</b><small>{p.description}</small></td><td>{p.address}</td><td>{p.unitCount}</td><td>{units.filter(u => u.tenantId).length} occupied</td><td><button className="text-link" onClick={() => { setPropertyId(p.id); setAddingUnit(true); }}>Add unit <Plus size={14}/></button></td></tr>; })}</tbody></table></div>}
    </DataState>
    <PropertyWizardModal open={open} close={() => setOpen(false)}/>
    <Modal open={addingUnit} title="Add a unit" close={() => setAddingUnit(false)}><form onSubmit={addUnit} className="form-stack"><Field label="Property"><select value={propertyId || d.properties[0]?.id || ''} onChange={e => setPropertyId(Number(e.target.value))}>{d.properties.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></Field><Field label="Unit number"><input required value={unitNo} onChange={e => setUnitNo(e.target.value)} placeholder="B-04"/></Field><div className="form-row"><Field label="Bedrooms"><input type="number" min="0" value={beds} onChange={e => setBeds(e.target.value)}/></Field><Field label="Monthly rent (UGX)"><input type="number" min="0" required value={rent} onChange={e => setRent(e.target.value)}/></Field></div><ModalActions close={() => setAddingUnit(false)}/></form></Modal>
    <UnitDrawer unit={selectedUnit} onClose={() => setSelectedUnit(null)}/>
    {dragTenant && cursor && <div className={classes('assignment-cursor', !dragValid && 'invalid')} style={{ left: cursor.x, top: cursor.y }} aria-hidden="true">{dragValid ? (dragTenant.unitId != null ? 'Move here' : 'Drop to assign') : 'Not allowed'}</div>}
    {assignTarget && <Modal open title="Assign tenant" close={() => setAssignTarget(null)}><div className="confirm-assignment"><p>Assign <b>{assignTarget.tenant.fullName}</b> to Unit <b>{assignTarget.unit.unitNumber}</b>?</p><p>This links the tenant to the home and marks it awaiting confirmation.</p><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setAssignTarget(null)}>Cancel</button><button type="button" className="button button-primary" onClick={() => { d.assignTenant(assignTarget.tenant.id, assignTarget.unit.id); d.notify(`${assignTarget.tenant.fullName} assigned to Unit ${assignTarget.unit.unitNumber}`); setSelectedTenantId(null); setAssignTarget(null); }}>Assign</button></div></div></Modal>}
  </div>;
}
type PropertyDraft = {
  step: number; propertyName: string; address: string; description: string; unitNumber: string;
  bedrooms: string; rentAmount: string; tenantName: string; phone: string; startDate: string;
  endDate: string; deposit: string; propertyId?: number; unitId?: number; photoDataUrls: string[];
};
const emptyPropertyDraft: PropertyDraft = {
  step: 0, propertyName: '', address: '', description: '', unitNumber: '', bedrooms: '1',
  rentAmount: '', tenantName: '', phone: '', startDate: '', endDate: '', deposit: '', photoDataUrls: [],
};
function PropertyWizardModal({ open, close }: { open: boolean; close: () => void }) {
  const d = useData();
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [draft, setDraft] = useState<PropertyDraft>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rentwise-property-draft') || 'null') as PropertyDraft | null;
      return saved ? { ...emptyPropertyDraft, ...saved, photoDataUrls: saved.photoDataUrls ?? [] } : emptyPropertyDraft;
    } catch { return emptyPropertyDraft; }
  });
  useEffect(() => { localStorage.setItem('rentwise-property-draft', JSON.stringify(draft)); }, [draft]);
  const update = (key: keyof PropertyDraft, value: string | number) => setDraft(current => ({ ...current, [key]: value }));
  const addPhotos = async (files: FileList | File[]) => {
    const remaining = Math.max(0, 6 - draft.photoDataUrls.length);
    const selected = Array.from(files).slice(0, remaining);
    if (!selected.length) {
      setPhotoError(remaining === 0 ? 'You can attach up to six property photos.' : '');
      return;
    }
    setPhotoBusy(true);
    setPhotoError('');
    const prepared: string[] = [];
    let failure = '';
    for (const file of selected) {
      try {
        prepared.push(await resizePhotoToDataUrl(file));
      } catch (error) {
        failure = error instanceof Error ? error.message : `Could not prepare ${file.name}.`;
        break;
      }
    }
    setDraft(current => ({ ...current, photoDataUrls: [...current.photoDataUrls, ...prepared] }));
    setPhotoError(failure);
    setPhotoBusy(false);
  };
  const reset = () => { localStorage.removeItem('rentwise-property-draft'); setDraft(emptyPropertyDraft); close(); };
  const saveStep = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (draft.step === 0) {
        if (draft.propertyId && d.properties.some(property => property.id === draft.propertyId)) {
          setDraft(current => ({ ...current, step: 1 }));
        } else {
          const property = d.createProperty({ name: draft.propertyName, address: draft.address, description: draft.description, photoDataUrls: draft.photoDataUrls });
          setDraft(current => ({ ...current, propertyId: property.id, step: 1 }));
          d.notify('Property saved. Continue with its units.');
        }
      } else if (draft.step === 1) {
        if (!draft.propertyId) throw new Error('Save the property before adding a unit.');
        if (draft.unitId && d.units.some(unit => unit.id === draft.unitId)) {
          setDraft(current => ({ ...current, step: 2 }));
        } else {
          const unit = d.createUnit({ propertyId: draft.propertyId, unitNumber: draft.unitNumber, bedrooms: Number(draft.bedrooms), rentAmount: Number(draft.rentAmount) });
          setDraft(current => ({ ...current, unitId: unit.id, step: 2 }));
          d.notify(`Unit ${unit.unitNumber} saved`);
        }
      } else if (draft.step === 3) {
        if ((draft.startDate || draft.endDate) && (!draft.startDate || !draft.endDate)) {
          throw new Error('Add both agreement dates, or leave both blank.');
        }
        if ((draft.startDate || draft.endDate || draft.deposit) && !draft.tenantName.trim()) {
          throw new Error('Add a tenant before saving agreement details, or leave them blank for now.');
        }
        setDraft(current => ({ ...current, step: 4 }));
      } else if (draft.step < 4) {
        setDraft(current => ({ ...current, step: current.step + 1 }));
      } else {
        if (draft.tenantName.trim() || draft.phone.trim()) {
          if (!draft.tenantName.trim() || !draft.phone.trim()) throw new Error('Enter both a tenant name and phone number, or leave both empty.');
          if (!draft.unitId) throw new Error('Add a unit before assigning a tenant.');
          d.createTenant({
            fullName: draft.tenantName,
            phone: draft.phone,
            unitId: draft.unitId,
            monthlyRent: Number(draft.rentAmount),
            deposit: Number(draft.deposit || 0),
            ...(draft.startDate ? { agreementStart: draft.startDate } : {}),
            ...(draft.endDate ? { agreementEnd: draft.endDate } : {}),
          });
        }
        d.notify('Property setup is complete');
        reset();
      }
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not save this step. Your draft is still on this device.');
    }
  };
  const steps = ['Property', 'Units', 'Tenants', 'Agreements', 'Review'];
  return <Modal open={open} title="Set up a property" close={close}>
    <div className="wizard-progress" aria-label={`Step ${draft.step + 1} of ${steps.length}`}>
      {steps.map((label, index) => <div className={classes('wizard-progress-step', index < draft.step && 'done', index === draft.step && 'current')} key={label}><i>{index < draft.step ? <Check size={12}/> : index + 1}</i><span>{label}</span></div>)}
    </div>
    <form onSubmit={saveStep} className="form-stack wizard-step" key={draft.step}>
      {draft.step === 0 && <><p className="wizard-intro">Start with the details people use to identify this home.</p><Field label="Property name"><input required value={draft.propertyName} onChange={e => update('propertyName', e.target.value)} placeholder="e.g. Kintu Court" data-testid="input-property-name"/></Field><Field label="Address"><input required value={draft.address} onChange={e => update('address', e.target.value)} placeholder="Area, Kampala" data-testid="input-property-address"/></Field><Field label="Description"><textarea value={draft.description} onChange={e => update('description', e.target.value)} placeholder="A note about the property" data-testid="input-property-description"/></Field><div className="wizard-photo-section"><span className="wizard-field-label">Property photos <small>Optional · up to six photos</small></span><label className="wizard-photo-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addPhotos(event.dataTransfer.files); }}><ImagePlus size={18}/><span>Drop photos here or <b>choose files</b><small>Images are resized and saved in this browser.</small></span><input ref={photoInput} type="file" accept="image/*" multiple aria-label="Add property photos" onChange={event => { if (event.currentTarget.files) void addPhotos(event.currentTarget.files); event.currentTarget.value = ''; }}/></label>{photoBusy && <div className="wizard-photo-skeleton" aria-live="polite"><i/><i/><i/><span>Preparing your photos…</span></div>}{photoError && <div className="wizard-photo-error" role="alert">{photoError}<button type="button" className="text-link" onClick={() => photoInput.current?.click()}>Try another photo</button></div>}{draft.photoDataUrls.length > 0 && <div className="wizard-photo-grid" aria-label={`${draft.photoDataUrls.length} property photos`}>{draft.photoDataUrls.map((photo, index) => <div key={`${photo.slice(-24)}-${index}`}><img src={photo} alt={`Property photo ${index + 1}`}/><button type="button" aria-label={`Remove property photo ${index + 1}`} onClick={() => setDraft(current => ({ ...current, photoDataUrls: current.photoDataUrls.filter((_, photoIndex) => photoIndex !== index) }))}><X size={13}/></button></div>)}</div>}</div></>}
      {draft.step === 1 && <><p className="wizard-intro">Add the first unit and its monthly rent. You can add more from the property map later.</p><Field label="Unit number"><input required value={draft.unitNumber} onChange={e => update('unitNumber', e.target.value)} placeholder="A1"/></Field><div className="form-row"><Field label="Bedrooms"><input type="number" min="0" value={draft.bedrooms} onChange={e => update('bedrooms', e.target.value)}/></Field><Field label="Monthly rent (UGX)"><input type="number" min="1" required value={draft.rentAmount} onChange={e => update('rentAmount', e.target.value)}/></Field></div></>}
      {draft.step === 2 && <><p className="wizard-intro">Add a tenant now, or leave these fields blank and assign someone later.</p><Field label="Tenant name (optional)"><input value={draft.tenantName} onChange={e => update('tenantName', e.target.value)} placeholder="Full name"/></Field><Field label="Phone number (optional)"><input type="tel" value={draft.phone} onChange={e => update('phone', e.target.value)} placeholder="+256 7…"/></Field></>}
      {draft.step === 3 && <><p className="wizard-intro">Keep the agreement dates and deposit beside the rent record.</p><div className="form-row"><Field label="Agreement starts"><input type="date" value={draft.startDate} onChange={e => update('startDate', e.target.value)}/></Field><Field label="Agreement ends"><input type="date" value={draft.endDate} onChange={e => update('endDate', e.target.value)}/></Field></div><Field label="Security deposit (UGX)"><input type="number" min="0" value={draft.deposit} onChange={e => update('deposit', e.target.value)}/></Field><p className="wizard-hint">Dates and deposit are saved when you finish this setup.</p></>}
      {draft.step === 4 && <><p className="wizard-intro">Check the details before finishing.</p><div className="wizard-review"><div><span>Property</span><b>{draft.propertyName || '—'}</b><small>{draft.address}</small></div><div><span>First unit</span><b>{draft.unitNumber || '—'} · {draft.bedrooms} bedroom</b><small>{draft.rentAmount ? fmt(Number(draft.rentAmount)) : 'Rent not set'} / month</small></div><div><span>Tenant</span><b>{draft.tenantName || 'Add later'}</b><small>{draft.phone || 'No phone added'}</small></div><div><span>Agreement</span><b>{draft.startDate && draft.endDate ? `${dateFmt(draft.startDate)} — ${dateFmt(draft.endDate)}` : 'Add dates later'}</b><small>Deposit {fmt(Number(draft.deposit || 0))}</small></div><div><span>Property photos</span><b>{draft.photoDataUrls.length} attached</b><small>Saved on this device</small></div></div></>}
      <div className="wizard-footer"><span>Draft autosaved on this device</span><div>{draft.step > 0 && <button type="button" className="button button-quiet" onClick={() => setDraft(current => ({ ...current, step: current.step - 1 }))}>Back</button>}<button type="submit" className="button button-primary" data-testid="button-wizard-next">{draft.step === 4 ? <Check size={15}/> : <ArrowUpRight size={15}/>} {draft.step === 4 ? 'Finish setup' : 'Continue'}</button></div></div>
    </form>
  </Modal>;
}
function UnitDrawer({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  const d = useData(); const [, setLocation] = useLocation(); const touchStartX = useRef<number | null>(null); const [phoneVisible, setPhoneVisible] = useState(false);
  const asideRef = useRef<HTMLElement | null>(null); const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!unit) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => asideRef.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); previousFocus.current?.focus?.(); };
  }, [unit, onClose]);
  if (!unit) return null;
  const isLandlord = d.role === 'Landlord';
  const isCaretaker = d.role === 'Caretaker';
  const tenant = d.tenants?.find(t => t.id === unit.tenantId);
  const revealPhone = () => {
    if (phoneVisible) { setPhoneVisible(false); return; }
    if (!tenant) return;
    try {
      d.createContactReveal({ tenantId: tenant.id, actorRole: d.role });
      setPhoneVisible(true);
      d.notify('Phone reveal recorded in activity');
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not record the reveal. The phone number remains hidden.');
    }
  };
  const payments = (d.payments || []).filter(p => p.unitId === unit.id).slice(0, 5);
  const repairs = (d.repairs || []).filter(r => r.unitId === unit.id && r.status !== 'done');
  const timeline = (d.activity || []).filter(item => item.unitId === unit.id).slice(0, 6);
  return <div className="drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside ref={asideRef} tabIndex={-1} className="unit-drawer" role="dialog" aria-modal="true" aria-labelledby="unit-drawer-title" onTouchStart={event => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => { const endX = event.changedTouches[0]?.clientX; if (touchStartX.current != null && endX != null && endX - touchStartX.current > 80) onClose(); touchStartX.current = null; }}>
    <div className="drawer-heading"><div><span className="eyebrow">UNIT RECORD</span><h2 id="unit-drawer-title">{unit.unitNumber}</h2><p>{d.properties?.find(p => p.id === unit.propertyId)?.name || 'Property'} · {unit.bedrooms} bedroom{unit.bedrooms === 1 ? '' : 's'}</p></div><button className="icon-button" aria-label="Close unit details" onClick={onClose}><X size={19}/></button></div>
    <div className="drawer-status-row"><Status value={unit.status}/>{isLandlord && <b>{fmt(unit.rentAmount)} <small>/ month</small></b>}</div>
    <section className="drawer-section"><div className="drawer-section-head"><h3>Tenant</h3>{tenant && <span className="privacy-check"><ShieldCheck size={14}/> Private</span>}</div>{tenant ? <div className="drawer-tenant"><span className="tenant-avatar">{initials(tenant.fullName)}</span><div><b>{tenant.fullName}</b><small>{phoneVisible ? tenant.phone : maskPhone(tenant.phone)}</small></div><button type="button" className="icon-button" aria-label={phoneVisible ? 'Hide tenant phone number' : 'Reveal tenant phone number'} onClick={revealPhone}>{phoneVisible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div> : <p className="drawer-empty">This unit is currently vacant.</p>}</section>
    <section className="drawer-section"><div className="drawer-section-head"><h3>Recent payments</h3><Link href="/payments" className="text-link" onClick={onClose}>Ledger <ArrowUpRight size={13}/></Link></div>{payments.length ? <div className="drawer-list">{payments.map(payment => <Link href={`/receipt/${payment.id}`} className="drawer-list-row drawer-payment-row" key={payment.id} onClick={onClose} aria-label={`View receipt for payment of ${fmt(payment.amount)} on ${dateFmt(payment.recordedAt)}`} data-testid={`drawer-payment-${payment.id}`}><span><b>{isLandlord ? fmt(payment.amount) : 'Payment recorded'}</b><small>{dateFmt(payment.recordedAt)}{isLandlord ? ` · ${payment.method === 'mobile_money' ? 'Mobile money' : statusLabel(payment.method)}` : ''}</small></span><Status value={payment.status}/></Link>)}</div> : <p className="drawer-empty">No payments recorded yet.</p>}</section>
    <section className="drawer-section"><div className="drawer-section-head"><h3>Open repairs</h3><span className="count-bubble small-count">{repairs.length}</span></div>{repairs.length ? <div className="drawer-list">{repairs.map(repair => <div className="drawer-list-row" key={repair.id}><span><b>{repair.title}</b><small>{dateFmt(repair.reportedAt)}</small></span><Status value={repair.status}/></div>)}</div> : <p className="drawer-empty">No open repair requests.</p>}</section>
    {isLandlord && <section className="drawer-section"><div className="drawer-section-head"><h3>Timeline ledger</h3><Link href={`/unit/${unit.id}`} className="text-link" onClick={onClose}>Full record <ArrowUpRight size={13}/></Link></div>{timeline.length ? <div className="drawer-list">{timeline.map(item => <div className="drawer-timeline-row" key={item.id}><span className={`timeline-icon type-${item.type}`}><ActivityIcon size={14}/></span><span><b>{item.title}</b><small>{item.detail} · {dateFmt(item.occurredAt)}</small><small>Recorded by {item.actor}</small></span></div>)}</div> : <p className="drawer-empty">Unit activity will appear here.</p>}</section>}
    <div className="drawer-quick-actions">{isCaretaker ? <button className="button button-primary" disabled={!tenant} onClick={() => { onClose(); setLocation(`/daily-collection?unitId=${unit.id}`); }}><Wallet size={16}/>Record payment</button> : <Link className="button button-primary" href="/payments" onClick={onClose}><ReceiptText size={16}/>View payment ledger</Link>}<button className="button button-quiet" onClick={() => { onClose(); setLocation(`/repairs?unitId=${unit.id}`); }}><Wrench size={16}/>Log repair</button></div>
  </aside></div>;
}
function ReminderModal({ unit, close }: { unit: Unit; close: () => void }) {
  const d = useData();
  const tenant = d.tenants?.find(item => item.id === unit.tenantId) ?? null;
  const landlordName = d.role === 'Landlord' ? 'Agnes M.' : 'Amina';
  const balance = unit.balance || unit.rentAmount;
  const message = `Hello ${tenant?.fullName?.split(' ')[0] ?? 'there'}, this is a friendly reminder that rent of ${fmt(balance)} for Unit ${unit.unitNumber} at ${d.dashboard?.propertyName || 'the property'} is past due. You can pay by MTN MoMo or Airtel Money, or speak with the caretaker. Thank you. — ${landlordName}`;
  const phone = tenant?.phone ?? '';
  const whatsappPhone = phone.replace(/\D/g, '');
  const smsHref = `sms:${phone}?body=${encodeURIComponent(message)}`;
  const whatsappHref = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
  const [copied, setCopied] = useState(false);
  const logReminder = (channel: 'sms' | 'whatsapp' | 'copied', action: () => void) => {
    if (!tenant) { d.notify('This unit has no tenant to remind.'); return; }
    try {
      d.createReminder({ tenantId: tenant.id, unitId: unit.id, channel, message, sentBy: `${landlordName} · ${d.role}` });
      d.notify(channel === 'copied' ? 'Reminder message copied and logged' : `Reminder opened in ${channel === 'sms' ? 'SMS' : 'WhatsApp'} and logged`);
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'The reminder could not be logged.');
      return;
    }
    action();
  };
  const copyMessage = async () => {
    logReminder('copied', () => { setCopied(true); });
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      d.notify('Could not copy on this device. Select the message text to copy it manually.');
    }
  };
  return <Modal open title={`Send rent reminder · Unit ${unit.unitNumber}`} close={close}>
    <div className="reminder-modal">
      <p className="wizard-intro">A clear, friendly message the tenant also receives. Sending is logged in the activity record.</p>
      <div className="reminder-recipient">
        <span className="tenant-avatar">{initials(tenant?.fullName)}</span>
        <div><b>{tenant?.fullName ?? 'Tenant'}</b><small>{phone ? phone : 'No phone number recorded'}</small></div>
        <div className="reminder-balance"><b>{fmt(balance)}</b><small>{unit.daysLate != null ? `${unit.daysLate} day${unit.daysLate === 1 ? '' : 's'} late` : 'Past due'}</small></div>
      </div>
      <div className="reminder-message-preview" aria-label="Reminder message preview">{message}</div>
      <div className="reminder-actions">
        <button type="button" className="button button-primary" onClick={copyMessage} data-testid="button-copy-reminder"><ReceiptText size={15}/>{copied ? 'Copied' : 'Copy message'}</button>
        <a className="button button-quiet" href={smsHref} onClick={() => logReminder('sms', () => {})} data-testid="link-sms-reminder"><Smartphone size={15}/>Open SMS</a>
        {whatsappPhone && <a className="button button-quiet" href={whatsappHref} target="_blank" rel="noreferrer" onClick={() => logReminder('whatsapp', () => {})} data-testid="link-whatsapp-reminder"><ArrowUpRight size={15}/>Open WhatsApp</a>}
      </div>
      <p className="form-trust"><ShieldCheck size={14}/> Each reminder is recorded with your name, the channel used, and the time.</p>
    </div>
  </Modal>;
}
function DailyCollectionPage() {
  const d = useData();
  const canRecord = d.role === 'Caretaker';
  const [unitId, setUnitId] = useState(() => new URLSearchParams(window.location.search).get('unitId') || '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'mobile_money' | 'cash' | 'bank'>('mobile_money');
  const [reference, setReference] = useState('');
  const [filter, setFilter] = useState('');
  const [confirmed, setConfirmed] = useState<Payment | null>(null);
  const [reminderUnit, setReminderUnit] = useState<Unit | null>(null);
  const unpaid = (d.units || []).filter(u => u.tenantId != null && (u.balance > 0 || ['pending', 'late'].includes(u.status)))
    .filter(u => `${u.unitNumber} ${u.tenantName || ''}`.toLowerCase().includes(filter.toLowerCase()));
  const chosen = d.units?.find(u => String(u.id) === unitId);
  useEffect(() => {
    if (!unitId || amount) return;
    const unit = d.units?.find(item => String(item.id) === unitId);
    if (unit) setAmount(String(unit.balance || unit.rentAmount));
  }, [unitId, d.units, amount]);
  const resetForm = () => { setAmount(''); setReference(''); setUnitId(''); };
  const recordPayment = (input: PaymentInput) => {
    try {
      const payment = d.createPayment(input);
      setConfirmed(payment);
      d.notify('Payment recorded in this browser. Receipt added to the ledger.', () => { d.removePayment(payment.id); setConfirmed(null); });
      resetForm();
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Payment could not be saved in this browser.');
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canRecord || !unitId || !Number(amount)) return;
    recordPayment({
      unitId: Number(unitId),
      amount: Number(amount),
      method,
      recordedBy: 'Amina · Caretaker',
      ...(reference ? { reference } : {}),
    });
  };
  return <>
    <div className="collection-layout">
      {canRecord ? <section className="collection-form-panel">
        <div className="form-intro"><span className="form-icon"><Wallet size={19}/></span><div><h2>Record a payment</h2><p>Make a clear record, right when rent is received.</p></div></div>
        <form onSubmit={submit} className="form-stack">
          <Field label="Tenant or unit"><select required value={unitId} onChange={e => { setUnitId(e.target.value); const u = d.units.find(x => String(x.id) === e.target.value); setAmount(u ? String(u.balance || u.rentAmount) : ''); }} data-testid="select-payment-unit"><option value="">Choose a unit…</option>{d.units.filter(u => u.tenantId != null).map(u => <option key={u.id} value={u.id}>{u.unitNumber} · {u.tenantName}{u.balance ? ` · balance ${fmt(u.balance)}` : ''}</option>)}</select></Field>
          <Field label="Amount received"><div className="input-money"><span>UGX</span><input type="number" inputMode="numeric" min="1" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" data-testid="input-payment-amount"/></div></Field>
          {chosen && <div className="selected-unit-note"><span>Monthly rent <b>{fmt(chosen.rentAmount)}</b></span>{chosen.balance > 0 && <span>Outstanding <b className="text-danger">{fmt(chosen.balance)}</b></span>}</div>}
          <Field label="Payment method"><div className="method-options">{(['mobile_money', 'cash', 'bank'] as const).map(m => <button type="button" key={m} onClick={() => setMethod(m)} className={classes('method-option', method === m && 'active')} aria-pressed={method === m} data-testid={`method-${m}`}><span className={`method-symbol ${m}`}>{m === 'mobile_money' ? <Smartphone size={17}/> : m === 'cash' ? <Wallet size={17}/> : <Building2 size={17}/>}</span><span>{m === 'mobile_money' ? 'Mobile money' : m === 'cash' ? 'Cash' : 'Bank'}</span>{method === m && <Check size={14}/>}</button>)}</div></Field>
          {method === 'mobile_money' && <div className="mobile-provider"><span className="provider-badge mtn">MTN</span><span className="provider-badge airtel">airtel</span><span>MTN MoMo or Airtel Money</span></div>}
          <Field label={method === 'mobile_money' ? 'Transaction reference (optional)' : 'Receipt / reference (optional)'}><input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. 9826 4017" data-testid="input-payment-reference"/></Field>
          <button className="button button-primary full-button" data-testid="button-submit-payment"><Check size={17}/>Confirm payment</button>
          <p className="form-trust"><ShieldCheck size={14}/> A receipt is saved to this browser as soon as this entry is confirmed.</p>
        </form>
      </section> : <section className="collection-form-panel">
        <div className="form-intro"><span className="form-icon"><Wallet size={19}/></span><div><h2>Collection summary</h2><p>Read-only view of this month’s recorded rent.</p></div></div>
        <div className="collection-readonly-summary"><b>{fmt(d.dashboard.totalCollected)}</b><span>collected this month</span><div><strong>{d.dashboard.paidToday}</strong> payments recorded today</div><Link href="/payments" className="button button-quiet full-button">Open payment ledger <ArrowUpRight size={15}/></Link></div>
      </section>}
      <section className="unpaid-panel">
        <div className="unpaid-heading"><div><span className="eyebrow">COLLECTION FOLLOW-UP</span><h2>Still to collect</h2><p>Occupied homes with a balance or awaiting confirmation.</p></div><span className="count-bubble">{unpaid.length}</span></div>
        <label className="search-field"><Search size={16}/><input aria-label="Search unpaid units" placeholder="Search unit or tenant" value={filter} onChange={e => setFilter(e.target.value)}/></label>
        <div className="unpaid-list"><DataState rows={unpaid} title="A clear collection list" text="No outstanding unit balances. Nice work.">{unpaid.map(u => <div className="unpaid-row" key={u.id} data-testid={`unpaid-unit-${u.id}`}><span className={`unit-avatar ${u.status}`}>{u.unitNumber}</span><div className="unpaid-info"><b>{u.tenantName || 'Tenant'}</b><small>{u.unitNumber} · Monthly {fmt(u.rentAmount)}{u.daysLate != null ? ` · ${u.daysLate} day${u.daysLate === 1 ? '' : 's'} late` : ''}</small></div><div className="unpaid-amount"><b>{fmt(u.balance || u.rentAmount)}</b><Status value={u.status}/></div>{!canRecord && u.tenantId != null && <button className="button button-quiet unpaid-remind" onClick={() => setReminderUnit(u)} aria-label={`Send rent reminder to ${u.tenantName || 'tenant'} for unit ${u.unitNumber}`} data-testid={`button-unpaid-remind-${u.id}`}>Remind</button>}{canRecord && <button className="icon-button compact-icon" aria-label={`Record payment for ${u.unitNumber}`} onClick={() => { setUnitId(String(u.id)); setAmount(String(u.balance || u.rentAmount)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><ArrowDownLeft size={16}/></button>}</div>)}</DataState></div>
        <div className="offline-note"><ShieldCheck size={15}/><span><b>Saved in this browser</b><br/>The ledger works offline, but this data is not shared with another device or account.</span></div>
      </section>
    </div>
    {confirmed && <Modal open title="Payment recorded" close={() => setConfirmed(null)}><div className="receipt-confirmation"><div className="paid-stamp" aria-label="Payment paid">PAID</div><span className="eyebrow">RENTWISE RECEIPT</span><h3>{fmt(confirmed.amount)}</h3><p>Unit {confirmed.unitNumber} · {confirmed.tenantName}</p><div className="receipt-meta"><span>Recorded {dateFmt(confirmed.recordedAt)}</span><span>{confirmed.method === 'mobile_money' ? 'MTN / Airtel mobile money' : statusLabel(confirmed.method)}</span>{confirmed.reference && <span>Reference {confirmed.reference}</span>}</div><div className="receipt-actions"><button type="button" className="button button-quiet" onClick={() => window.print()}><ReceiptText size={15}/>Print</button><button type="button" className="button button-primary" onClick={async () => { const url = `${window.location.origin}${import.meta.env.BASE_URL}receipt/${confirmed.id}`; try { await navigator.clipboard.writeText(url); d.notify('Receipt link copied'); } catch { d.notify('Could not copy the receipt link on this device.'); } }}><ArrowUpRight size={15}/>Copy share link</button></div></div></Modal>}
    {reminderUnit && <ReminderModal unit={reminderUnit} close={() => setReminderUnit(null)}/>}
  </>;
}
function PaymentsPage() {
  const d = useData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);
  const records = (d.payments || [])
    .filter(payment => `${payment.tenantName} ${payment.unitNumber} ${payment.reference || ''}`.toLowerCase().includes(search.toLowerCase()))
    .filter(payment => status === 'all' || payment.status === status)
    .filter(payment => method === 'all' || payment.method === method)
    .filter(payment => !fromDate || payment.recordedAt.slice(0, 10) >= fromDate)
    .filter(payment => !toDate || payment.recordedAt.slice(0, 10) <= toDate)
    .filter(() => !dateRangeInvalid);
  const exportCsv = () => {
    const rows = [
      ['Date', 'Unit', 'Tenant', 'Amount (UGX)', 'Method', 'Status', 'Reference', 'Recorded by'],
      ...records.map(payment => [payment.recordedAt, payment.unitNumber, payment.tenantName, payment.amount, payment.method, payment.status, payment.reference || '', payment.recordedBy]),
    ];
    const csvValue = (value: unknown) => {
      let text = String(value);
      if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const csv = `\uFEFF${rows.map(row => row.map(csvValue).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'rentwise-payment-ledger.csv';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    d.notify('Payment ledger exported as CSV');
  };
  return <div className="page-stack">
    <section className="ledger-summary"><div><span>LEDGER BALANCE</span><b>{fmt((d.payments || []).reduce((total, payment) => total + payment.amount, 0))}</b><small>Recorded payment total</small></div><div className="summary-side"><span className="summary-mark"><ShieldCheck size={19}/></span><span>Every entry has a timestamp<br/>and a responsible recorder.</span></div></section>
    <div className="toolbar ledger-tools"><div className="filter-search"><Search size={17}/><input aria-label="Search payment ledger" placeholder="Search name, unit or reference" value={search} onChange={event => setSearch(event.target.value)} data-testid="search-payments"/></div>
      <div className="toolbar-right"><select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filter by status" data-testid="filter-payment-status"><option value="all">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option></select><select value={method} onChange={event => setMethod(event.target.value)} aria-label="Filter by method"><option value="all">All methods</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="bank">Bank</option></select><button className="button button-quiet" onClick={exportCsv} data-testid="button-export-csv"><Download size={16}/>Export CSV</button></div>
    </div>
    <div className="toolbar ledger-date-tools"><label>From <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} aria-label="Payments from date"/></label><label>To <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} aria-label="Payments to date"/></label>{(fromDate || toDate) && <button type="button" className="text-link" onClick={() => { setFromDate(''); setToDate(''); }}>Clear dates</button>}{dateRangeInvalid && <span role="alert" className="date-range-error">Choose a start date before the end date.</span>}</div>
    <div className="panel table-panel"><DataState rows={records} title="No matching payments" text={dateRangeInvalid ? 'The start date must be earlier than the end date.' : search ? 'Try a different name, unit or reference.' : 'Payments appear here after they are recorded.'}><div className="table-scroll"><table><thead><tr><th>Tenant & unit</th><th>Amount</th><th>Method</th><th>Recorded</th><th>By</th><th>Status</th><th>Reference</th><th>Receipt</th></tr></thead><tbody>{records.map(payment => <tr key={payment.id} data-testid={`payment-row-${payment.id}`}><td><div className="table-person"><span className="avatar mini">{initials(payment.tenantName)}</span><span><b>{payment.tenantName}</b><small>Unit {payment.unitNumber}</small></span></div></td><td className="money-cell">{fmt(payment.amount)}</td><td><span className="method-label"><Smartphone size={14}/>{payment.method === 'mobile_money' ? 'MTN / Airtel' : statusLabel(payment.method)}</span></td><td>{dateFmt(payment.recordedAt)}</td><td>{payment.recordedBy}</td><td><Status value={payment.status}/></td><td className="font-mono">{payment.reference || '—'}</td><td><Link href={`/receipt/${payment.id}`} className="receipt-cell-link" aria-label={`View receipt for ${payment.tenantName} payment of ${fmt(payment.amount)}`} data-testid={`receipt-link-${payment.id}`}><ReceiptText size={13}/>RW-{String(payment.id).padStart(6, '0')}</Link></td></tr>)}</tbody></table></div></DataState><div className="table-footer">{records.length} records <span>·</span> UGX amounts</div></div>
  </div>;
}
function TenantsPage() {
  const d = useData(); const [search, setSearch] = useState(''); const [revealed, setRevealed] = useState<number[]>([]); const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [unitId, setUnitId] = useState(''); const [rent, setRent] = useState('');
  const tenants = (d.tenants || []).filter(t => `${t.fullName} ${t.unitNumber || ''}`.toLowerCase().includes(search.toLowerCase()));
  const reveal = (id: number) => {
    if (revealed.includes(id)) { setRevealed(current => current.filter(item => item !== id)); return; }
    try {
      d.createContactReveal({ tenantId: id, actorRole: d.role });
      setRevealed(current => [...current, id]);
      d.notify('Phone reveal recorded in activity');
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not record the reveal. The phone number remains hidden.');
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      d.createTenant({ fullName: name, phone, unitId: unitId ? Number(unitId) : null, monthlyRent: rent ? Number(rent) : undefined });
      d.notify('Tenant profile created');
      setOpen(false);
      setName('');
      setPhone('');
      setUnitId('');
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not create tenant profile.');
    }
  };
  return <div className="page-stack"><div className="toolbar"><div className="filter-search"><Search size={17}/><input placeholder="Find a tenant or unit" aria-label="Search tenants" value={search} onChange={e => setSearch(e.target.value)} data-testid="search-tenants"/></div><button className="button button-primary" onClick={() => setOpen(true)} data-testid="button-add-tenant"><Plus size={16}/>Add tenant</button></div><div className="tenant-grid"><DataState rows={tenants} title="No tenant profiles found" text="Add a tenant profile to connect people with their home.">{tenants.map(t => <article className="tenant-card" key={t.id} data-testid={`tenant-card-${t.id}`}><div className="tenant-card-head"><span className="tenant-avatar">{initials(t.fullName)}</span><div><h2>{t.fullName}</h2><span>{t.unitNumber ? `Unit ${t.unitNumber}` : 'No unit assigned'}</span></div><button className="icon-button" aria-label={`Options for ${t.fullName}`}><MoreHorizontal size={18}/></button></div><div className="tenant-data-row"><span>Contact number</span><b className="masked-phone">{revealed.includes(t.id) ? t.phone : maskPhone(t.phone)}</b><button className="reveal-button" onClick={() => reveal(t.id)} aria-label={revealed.includes(t.id) ? 'Hide phone number' : 'Reveal phone number'} data-testid={`toggle-contact-${t.id}`}>{revealed.includes(t.id) ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div><div className="tenant-stat-row"><div><small>Outstanding</small><b className={t.balance > 0 ? 'text-danger' : ''}>{fmt(t.balance)}</b></div><div><small>Open requests</small><b>{t.openRequests}</b></div></div><div className="tenant-card-foot"><span>Agreement</span><b>{dateFmt(t.agreementStart)} <span>→</span> {dateFmt(t.agreementEnd)}</b></div></article>)}</DataState></div><div className="privacy-note"><ShieldCheck size={16}/><span>Contact details are masked by default. Reveal only when needed.</span></div>
     <Modal open={open} title="Add a tenant" close={() => setOpen(false)}><form onSubmit={submit} className="form-stack"><Field label="Full name"><input required value={name} onChange={e => setName(e.target.value)} placeholder="Tenant's name"/></Field><Field label="Phone number"><input required type="tel" minLength={7} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256 7…"/></Field><Field label="Assign a unit"><select value={unitId} onChange={e => setUnitId(e.target.value)}><option value="">No unit yet</option>{d.units.filter(u => !u.tenantId).map(u => <option value={u.id} key={u.id}>{u.unitNumber} · {fmt(u.rentAmount)}</option>)}</select></Field><Field label="Monthly rent (UGX, optional)"><input type="number" min="0" value={rent} onChange={e => setRent(e.target.value)}/></Field><ModalActions close={() => setOpen(false)}/></form></Modal>
  </div>;
}
function maskPhone(phone: string) { if (phone.length <= 4) return '••••••••'; return `${phone.slice(0, 4)} ••• •${phone.slice(-3)}`; }
async function resizePhotoToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('This image is over 10 MB. Choose a smaller photo.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('This browser could not prepare the photo.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => result ? resolve(result) : reject(new Error('This photo could not be compressed.')), 'image/jpeg', 0.72);
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('This photo could not be read.'));
    reader.onerror = () => reject(new Error('This photo could not be read.'));
    reader.readAsDataURL(blob);
  });
}
function RepairHistoryList({ repair }: { repair: Repair }) {
  const history = [...(repair.history ?? [])].reverse().slice(0, 3);
  if (!history.length) return null;
  return <div className="repair-history" aria-label="Repair update history">{history.map((entry, index) => <div key={`${entry.occurredAt}-${index}`}><b>{entry.detail}</b><small>{entry.actor} · {dateFmt(entry.occurredAt)}</small></div>)}</div>;
}
function RepairsPage() {
  const d = useData(); const [open, setOpen] = useState(false); const [unitId, setUnitId] = useState(() => new URLSearchParams(window.location.search).get('unitId') || ''); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      d.createRepair({ unitId: Number(unitId), title, description, reportedBy: 'Agnes M. · Landlord' });
      d.notify('Repair request added to the workflow');
      setOpen(false);
      setTitle('');
      setDescription('');
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not submit repair request.');
    }
  };
  return <div className="page-stack">
    <div className="toolbar"><div className="toolbar-meta"><b>{d.repairs.filter(r => r.status !== 'done').length} open requests</b><span>·</span><span>Keep repairs moving, step by step</span></div><button className="button button-primary" onClick={() => setOpen(true)} data-testid="button-new-repair"><Plus size={16}/>Log a repair</button></div>
    <div className="repair-columns">{(['reported','assigned','in_progress','done'] as const).map((status, idx) => {
      const items = d.repairs.filter(repair => repair.status === status);
      return <section className="repair-column" key={status}>
        <div className="repair-column-head"><span className={`repair-step step-${idx}`}>{String(idx + 1).padStart(2, '0')}</span><h2>{statusLabel(status)}</h2><b>{items.length}</b></div>
        <DataState rows={items} title="Nothing here yet" text="Requests move into this stage as work progresses."><div className="repair-stack">{items.map(repair => <article className="repair-card" key={repair.id} data-testid={`repair-card-${repair.id}`}>
          <div className="repair-card-top"><span className="repair-unit">UNIT {repair.unitNumber}</span><Status value={repair.status}/></div><h3>{repair.title}</h3><p>{repair.description}</p>
          {repair.photoDataUrl && <img className="repair-photo" src={repair.photoDataUrl} alt={`Photo attached to ${repair.title}`}/>}
          <div className="repair-by"><span className="avatar mini">{initials(repair.tenantName)}</span><span>{repair.tenantName}</span><time>{dateFmt(repair.reportedAt)}</time></div>
          {repair.cost != null && <div className="repair-cost"><span>Recorded cost</span><b>{fmt(repair.cost)}</b></div>}
          <RepairHistoryList repair={repair}/><RepairWorkflowActions repair={repair}/>
        </article>)}</div></DataState>
      </section>;
    })}</div>
    <Modal open={open} title="Log a repair" close={() => setOpen(false)}><form onSubmit={submit} className="form-stack"><Field label="Unit"><select required value={unitId} onChange={e => setUnitId(e.target.value)}><option value="">Choose a unit…</option>{d.units.map(u => <option key={u.id} value={u.id}>{u.unitNumber} · {u.tenantName || 'Vacant'}</option>)}</select></Field><Field label="What needs attention?"><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Kitchen tap leaking"/></Field><Field label="Details"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what is happening…"/></Field><ModalActions close={() => setOpen(false)}/></form></Modal>
  </div>;
}
function AgreementsPage() {
  const d = useData(); const [search, setSearch] = useState(''); const [signing, setSigning] = useState<Agreement | null>(null);
  const items = (d.agreements || []).filter(a => `${a.tenantName} ${a.unitNumber}`.toLowerCase().includes(search.toLowerCase()));
  const today = new Date();
  return <div className="page-stack">
    <div className="agreement-banner"><span><FileCheck2 size={20}/></span><div><b>Clear terms. A record everyone can return to.</b><p>Agreement dates and rent summaries at a glance.</p></div><div className="agreement-count"><b>{items.length}</b><small>AGREEMENTS</small></div></div>
    <div className="toolbar"><div className="filter-search"><Search size={17}/><input placeholder="Search tenant or unit" aria-label="Search agreements" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="toolbar-meta"><ShieldCheck size={16}/> Agreement summaries</div></div>
    <div className="agreement-grid"><DataState rows={items} title="No agreements found" text="Agreement summaries will appear here when available.">{items.map(a => {
      const daysLeft = daysUntilDate(a.endDate, today);
      const endingSoon = daysLeft >= 0 && daysLeft <= 60;
      return <article className="agreement-card" key={a.id} data-testid={`agreement-${a.id}`}>
        <div className="agreement-card-head"><span className="agreement-file"><FileCheck2 size={18}/></span><span className={a.signedAt ? 'signed-label' : 'unsigned-label'}>{a.signedAt ? 'Signed' : 'Awaiting signature'}</span></div>
        <span className="eyebrow">UNIT {a.unitNumber}</span><h2>{a.tenantName}</h2>
        <div className="agreement-rent">{fmt(a.monthlyRent)}<small>/ month</small></div>
        <div className="agreement-details"><div><span>Security deposit</span><b>{fmt(a.deposit)}</b></div><div><span>Agreement term</span><b>{dateFmt(a.startDate)} — {dateFmt(a.endDate)}</b></div><div><span>Next rent due</span><b className="due-date"><CalendarDays size={14}/>{dateFmt(a.nextDueDate)}</b></div></div>
        {endingSoon && <p className="agreement-expiring"><Clock3 size={14}/> Ends in {daysLeft} days</p>}
        {a.signatureDataUrl && <div className="agreement-signature"><img src={a.signatureDataUrl} alt={`Signature for ${a.signedBy || a.tenantName}`}/></div>}
        <div className="agreement-card-foot"><span>{a.signedAt ? `Signed ${dateFmt(a.signedAt)}${a.signedBy ? ` by ${a.signedBy}` : ''}` : 'A name and signature will be saved with the date.'}{!a.signedAt && <button type="button" className="button button-primary" onClick={() => setSigning(a)}>Sign agreement <ArrowUpRight size={14}/></button>}</span></div>
      </article>;
    })}</DataState></div>
    {signing && <AgreementSignatureModal agreement={signing} close={() => setSigning(null)}/>}
  </div>;
}
function SignaturePad({ onChange }: { onChange: (value: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const position = point(event);
    context.beginPath();
    context.moveTo(position.x, position.y);
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#1b5144';
    context.lineTo(position.x + 0.1, position.y + 0.1);
    context.stroke();
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const position = point(event);
    context.lineTo(position.x, position.y);
    context.stroke();
  };
  const finish = () => {
    const canvas = canvasRef.current;
    if (!drawing.current || !canvas) return;
    drawing.current = false;
    onChange(canvas.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };
  return <div className="signature-pad-wrap"><canvas ref={canvasRef} className="signature-pad" width={640} height={180} aria-label="Draw your signature here" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/><div className="signature-pad-footer"><small>Draw with a finger, stylus, or mouse. Typing your name also records your confirmation.</small><button type="button" className="text-link" onClick={clear}>Clear</button></div></div>;
}
function AgreementSignatureModal({ agreement, close }: { agreement: Agreement; close: () => void }) {
  const d = useData();
  const tenant = d.tenants.find(item => item.id === agreement.tenantId);
  const [name, setName] = useState(d.role === 'Tenant' ? tenant?.fullName ?? '' : '');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      d.signAgreement(agreement.id, { signedBy: name, signatureDataUrl });
      d.notify('Agreement signature saved with today’s date');
      close();
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'The signature could not be saved.');
    }
  };
  return <Modal open title={`Sign agreement · Unit ${agreement.unitNumber}`} close={close}>
    <form className="form-stack" onSubmit={submit}>
      <p className="wizard-intro">Review the summary before you confirm. Your name, signature, and signing date stay in this browser.</p>
      <div className="wizard-review"><div><span>Tenant</span><b>{agreement.tenantName}</b></div><div><span>Rent</span><b>{fmt(agreement.monthlyRent)} / month</b></div><div><span>Term</span><b>{dateFmt(agreement.startDate)} — {dateFmt(agreement.endDate)}</b></div></div>
      <Field label="Your full name"><input required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Name of the person signing"/></Field>
      <SignaturePad onChange={setSignatureDataUrl}/>
      <label className="signature-confirm"><input required type="checkbox"/> I have reviewed these agreement details and confirm this signature.</label>
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={close}>Cancel</button><button type="submit" className="button button-primary"><Check size={15}/>Save signature</button></div>
    </form>
  </Modal>;
}
function MorphingLineChart({ points, format }: { points: { label: string; collected: number; outstanding: number }[]; format: (n: number) => string }) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const [render, setRender] = useState(points);
  const prevRef = useRef(points);
  const pointsKey = points.map(p => `${p.label}|${Math.round(p.collected)}|${Math.round(p.outstanding)}`).join(',');
  useEffect(() => {
    const from = prevRef.current;
    if (reduced || from.length !== points.length || !points.length) { setRender(points); prevRef.current = points; return; }
    let frame = 0; const start = performance.now(); const duration = 640;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setRender(points.map((point, index) => ({
        label: point.label,
        collected: from[index].collected + (point.collected - from[index].collected) * eased,
        outstanding: from[index].outstanding + (point.outstanding - from[index].outstanding) * eased,
      })));
      if (t < 1) frame = requestAnimationFrame(tick); else prevRef.current = points;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pointsKey, reduced]);
  if (!render.length) return <div className="chart-area line-chart-area" data-testid="analytics-chart"><div className="chart-empty">Trend data will appear here once collection is recorded.</div></div>;
  const max = Math.max(1, ...render.map(point => point.collected + point.outstanding));
  const width = 600; const height = 205; const padX = 26; const padY = 18;
  const innerW = width - padX * 2; const innerH = height - padY * 2;
  const step = render.length > 1 ? innerW / (render.length - 1) : 0;
  const xFor = (index: number) => padX + index * step;
  const yFor = (value: number) => padY + innerH - (value / max) * innerH;
  const pathFor = (key: 'collected' | 'outstanding') => render.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(1)} ${yFor(point[key]).toFixed(1)}`).join(' ');
  const setFromPoint = (index: number) => setActive(prev => prev === index ? null : index);
  const activePoint = active != null ? render[active] : null;
  return <div className="chart-area line-chart-area" data-testid="analytics-chart">
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Collected and outstanding rent over time">
      {[0, 1, 2, 3].map(line => <line key={line} className="chart-grid-line" x1={padX} x2={width - padX} y1={padY + (innerH / 3) * line} y2={padY + (innerH / 3) * line}/>)}
      <path className="chart-line-collected" d={pathFor('collected')} fill="none" vectorEffect="non-scaling-stroke"/>
      <path className="chart-line-outstanding" d={pathFor('outstanding')} fill="none" vectorEffect="non-scaling-stroke"/>
      {render.map((point, index) => <g key={`${point.label}-${index}`}>
        <circle className="chart-point-collected" cx={xFor(index)} cy={yFor(point.collected)} r={4} vectorEffect="non-scaling-stroke"/>
        <circle className="chart-point-outstanding" cx={xFor(index)} cy={yFor(point.outstanding)} r={4} vectorEffect="non-scaling-stroke"/>
        <circle className="chart-point-hit" cx={xFor(index)} cy={padY + innerH / 2} r={Math.max(14, step / 2)} tabIndex={0} role="button" aria-label={`${point.label}: collected ${format(point.collected)}, outstanding ${format(point.outstanding)}`} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setFromPoint(index)}/>
      </g>)}
    </svg>
    {activePoint && <div className="chart-tooltip" role="status"><b>{activePoint.label}</b><span>Collected <strong>{format(activePoint.collected)}</strong></span><span>Outstanding <strong>{format(activePoint.outstanding)}</strong></span></div>}
    <div className="chart-x-labels">{render.map((point, index) => <button key={`${point.label}-label-${index}`} type="button" onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setFromPoint(index)}>{point.label}</button>)}</div>
  </div>;
}
function AnalyticsPage() {
  const d = useData();
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const analytics = d.getAnalytics(period);
  const collected = analytics.points.reduce((total, point) => total + point.collected, 0);
  const outstanding = analytics.points.reduce((total, point) => total + point.outstanding, 0);
  const exportAnalytics = () => {
    const lines = [
      ['Period', 'Collected (UGX)', 'Outstanding (UGX)'],
      ...analytics.points.map(point => [point.label, String(point.collected), String(point.outstanding)]),
    ].map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${lines}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rentwise-analytics-${period === 'month' ? 'monthly' : 'annual'}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    d.notify('Analytics exported as CSV');
  };

  return <div className="page-stack">
    <div className="toolbar"><div className="toolbar-meta"><span>Collection performance</span><span>·</span><span>Values in UGX</span></div><div className="toolbar-right"><div className="segmented"><button onClick={() => setPeriod('month')} className={period === 'month' ? 'selected' : ''} aria-pressed={period === 'month'}>Monthly</button><button onClick={() => setPeriod('year')} className={period === 'year' ? 'selected' : ''} aria-pressed={period === 'year'}>Yearly</button></div><button className="button button-quiet" onClick={exportAnalytics}><Download size={15}/>Export CSV</button></div></div>
    <div className="analytics-feature">
      <div className="analytics-copy"><span className="eyebrow">COLLECTION OVER TIME</span><h2>{period === 'month' ? 'A month, made visible.' : 'The year in perspective.'}</h2><p>{analytics.insight}</p><div className="chart-legend"><span><i className="legend-collected"/>Collected</span><span><i className="legend-outstanding"/>Outstanding</span></div></div>
      <MorphingLineChart points={analytics.points} format={fmt}/>
    </div>
    <div className="metrics-grid analytics-metrics"><Metric label="Collected this period" numeric={collected} format={compact} note="Recorded payments" icon={TrendingUp}/><Metric label="Outstanding this period" numeric={outstanding} format={compact} note="Still expected" icon={Clock3} tone="amber"/><Metric label="Collection trust" value={`${d.dashboard.trustPercent}%`} note="Verified records this month" icon={ShieldCheck}/><Metric label="Late units" value={String(d.dashboard.lateCount)} note="May need a follow-up" icon={CalendarDays} tone="blue"/></div>
    <div className="analytics-note"><span><ShieldCheck size={17}/></span><p><b>Numbers you can stand behind.</b><br/>Each figure comes from payment records made in this browser. Download your payment history from the Payment ledger.</p><Link href="/payments" className="text-link">Open ledger <ArrowUpRight size={14}/></Link></div>
  </div>;
}
function ReceiptPage() {
  const d = useData(); const [, params] = useRoute('/receipt/:id'); const payment = d.payments?.find(item => item.id === Number(params?.id));
  const isTenant = d.role === 'Tenant';
  const c = tenantCopy(d.language);
  const ownTenantUnit = getDemoTenant(d)?.unitId;
  const receiptIsVisible = d.role === 'Landlord'
    || (d.role === 'Tenant' && payment?.unitId === ownTenantUnit)
    || (d.role === 'Caretaker' && Boolean(payment && (payment.recordedBy.toLowerCase().includes('caretaker') || payment.recordedBy.toLowerCase().includes('amina'))));
  if (!receiptIsVisible) return <RoleGate allow={['Landlord']}><Empty title={isTenant ? c.receiptNotAvailable : 'Receipt not available'} text={isTenant ? c.receiptNotAvailableHint : 'This receipt is not part of the records available in your workspace.'} action={<Link href="/dashboard" className="button button-primary">{isTenant ? c.receiptReturn : 'Return to your workspace'}</Link>}/></RoleGate>;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); d.notify(isTenant ? c.receiptCopied : 'Receipt link copied'); }
    catch { d.notify(isTenant ? c.receiptCopyFailed : 'Could not copy the receipt link on this device.'); }
  };
  if (!payment) return <div className="receipt-page"><Empty title={isTenant ? c.receiptNotFound : 'Receipt not found'} text={isTenant ? c.receiptNotFoundHint : 'This payment record may have changed or is not available on this device.'} action={<Link href="/payments" className="button button-primary">{isTenant ? c.receiptBack : 'Open payment ledger'}</Link>}/></div>;
  return <div className="receipt-page"><div className="receipt-page-toolbar"><Link href="/payments" className="text-link"><ArrowLeft size={15}/>{isTenant ? c.receiptBack : 'Back to ledger'}</Link><div><button className="button button-quiet" onClick={() => window.print()}><ReceiptText size={15}/>{isTenant ? c.receiptPrint : 'Print receipt'}</button><button className="button button-primary" onClick={copyLink}><ArrowUpRight size={15}/>{isTenant ? c.receiptCopy : 'Copy share link'}</button></div></div><article className="receipt-page-card"><div className="receipt-brand"><span className="brand-mark"><House size={18}/></span><span><b>rentwise</b><small>PROPERTY LEDGER</small></span></div><div className="paid-stamp">{isTenant ? c.receiptPaidStamp : 'PAID'}</div><span className="eyebrow">{isTenant ? c.receiptOfficial : 'OFFICIAL RENT RECEIPT'}</span><h2>{fmt(payment.amount)}</h2><p>{isTenant ? c.receiptRecordedFor(payment.tenantName) : `Payment recorded for ${payment.tenantName}`}</p><div className="receipt-page-details"><div><span>{isTenant ? c.receiptUnitLabel : 'Unit'}</span><b>{payment.unitNumber}</b></div><div><span>{isTenant ? c.receiptRecordedOn : 'Recorded on'}</span><b>{dateFmt(payment.recordedAt)}</b></div><div><span>{isTenant ? c.receiptMethodLabel : 'Payment method'}</span><b>{payment.method === 'mobile_money' ? (isTenant ? c.receiptMethodMobile : 'Mobile money (MTN / Airtel)') : statusLabel(payment.method)}</b></div><div><span>{isTenant ? c.receiptRecordedByLabel : 'Recorded by'}</span><b>{payment.recordedBy}</b></div><div><span>{isTenant ? c.receiptReferenceLabel : 'Transaction reference'}</span><b>{payment.reference || (isTenant ? c.receiptNotProvided : 'Not provided')}</b></div><div><span>{isTenant ? c.receiptNumberLabel : 'Receipt number'}</span><b>RW-{String(payment.id).padStart(6, '0')}</b></div></div><div className="receipt-page-foot"><ShieldCheck size={16}/><span>{isTenant ? c.receiptFoot : 'This receipt reflects a payment recorded in the property ledger.'}</span></div></article></div>;
}
function UnitTimelinePage() {
  const d = useData();
  const [, params] = useRoute('/unit/:id');
  const unit = (d.units || []).find(item => item.id === Number(params?.id));
  const [, setLocation] = useLocation();
  if (!unit) return <div className="page-stack"><Empty title="Unit not found" text="This unit may have been removed, or the link is not valid on this device." action={<Link href="/properties" className="button button-primary">Back to properties</Link>}/></div>;
  const tenant = d.tenants?.find(item => item.id === unit.tenantId);
  const property = d.properties?.find(item => item.id === unit.propertyId);
  const payments = (d.payments || []).filter(item => item.unitId === unit.id);
  const repairs = (d.repairs || []).filter(item => item.unitId === unit.id);
  const agreement = (d.agreements || []).filter(item => item.unitId === unit.id).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  const reminderEntries = (d.reminders || []).filter(item => item.unitId === unit.id);
  const events: { key: string; occurredAt: string; type: string; icon: typeof Wallet; title: string; detail: string; actor: string; href?: string }[] = [
    ...payments.map(payment => ({
      key: `payment-${payment.id}`,
      occurredAt: payment.recordedAt,
      type: 'payment',
      icon: Wallet,
      title: `Payment of ${fmt(payment.amount)}`,
      detail: `${payment.method === 'mobile_money' ? 'Mobile money' : statusLabel(payment.method)}${payment.reference ? ` · Reference ${payment.reference}` : ''}`,
      actor: payment.recordedBy,
      href: `/receipt/${payment.id}`,
    })),
    ...repairs.flatMap(repair => (repair.history?.length ? repair.history : []).map((entry, index) => ({
      key: `repair-${repair.id}-${index}`,
      occurredAt: entry.occurredAt,
      type: 'repair',
      icon: Wrench,
      title: repair.title,
      detail: entry.detail + (repair.cost != null ? ` · Cost ${fmt(repair.cost)}` : ''),
      actor: entry.actor,
    }))),
    ...agreement ? [{
      key: `agreement-${agreement.id}`,
      occurredAt: agreement.signedAt ?? `${agreement.startDate}T00:00:00.000Z`,
      type: 'agreement',
      icon: FileCheck2,
      title: agreement.signedAt ? 'Agreement signed' : 'Agreement recorded',
      detail: `${fmt(agreement.monthlyRent)} / month · deposit ${fmt(agreement.deposit)} · ${dateFmt(agreement.startDate)} — ${dateFmt(agreement.endDate)}`,
      actor: agreement.signedBy ?? tenant?.fullName ?? 'Workspace team',
    }] : [],
    ...reminderEntries.map(reminder => ({
      key: `reminder-${reminder.id}`,
      occurredAt: reminder.sentAt,
      type: 'message',
      icon: Bell,
      title: 'Rent reminder sent',
      detail: reminder.channel === 'whatsapp' ? 'Opened in WhatsApp' : reminder.channel === 'sms' ? 'Opened in SMS' : 'Message copied',
      actor: reminder.sentBy,
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return <div className="page-stack unit-timeline-page">
    <div className="receipt-page-toolbar"><Link href="/properties" className="text-link"><ArrowLeft size={15}/>Back to properties</Link><div><button className="button button-quiet" onClick={() => setLocation(`/daily-collection?unitId=${unit.id}`)}><Wallet size={15}/>Collection</button><button className="button button-primary" onClick={() => setLocation('/repairs')}><Wrench size={15}/>Log repair</button></div></div>
    <section className="unit-record-hero">
      <div className="unit-record-identity"><span className={`unit-avatar large-unit-avatar ${unit.status}`}>{unit.unitNumber}</span><div><span className="eyebrow">UNIT RECORD · {property?.name ?? 'Property'}</span><h2>Unit {unit.unitNumber}</h2><p>{unit.bedrooms} bedroom{unit.bedrooms === 1 ? '' : 's'} · {fmt(unit.rentAmount)} / month</p></div></div>
      <div className="unit-record-facts"><div><Status value={unit.status}/>{unit.daysLate != null && <span className="unit-days-late">{unit.daysLate} day{unit.daysLate === 1 ? '' : 's'} late</span>}</div><div><small>Tenant</small><b>{tenant?.fullName ?? 'Vacant'}</b></div><div><small>Balance</small><b className={unit.balance > 0 ? 'text-danger' : ''}>{fmt(unit.balance)}</b></div></div>
    </section>
    <div className="unit-record-trust"><ShieldCheck size={15}/><span><b>Complete record.</b> Every entry below shows who recorded it and when. Entries are kept exactly as they were saved in this browser.</span></div>
    <section className="panel notifications-panel unit-timeline-panel"><div className="panel-head"><h2>Everything on record for Unit {unit.unitNumber}</h2><span className="toolbar-meta">{events.length} entries</span></div><DataState rows={events} title="Nothing recorded yet" text="Payments, repairs, agreements and reminders for this unit will appear here in order."><div className="timeline">
      {events.map((event, index) => { const Icon = event.icon; return <div className="timeline-entry" key={event.key} data-testid={`unit-event-${index}`}><div className="timeline-rail"><span className={`timeline-icon type-${event.type}`}><Icon size={16}/></span>{index < events.length - 1 && <i/>}</div><div className="timeline-body"><div className="timeline-title"><b>{event.title}</b><time>{dateFmt(event.occurredAt)}</time></div><p>{event.detail}</p><div className="timeline-meta"><span>Unit {unit.unitNumber}</span><span>Recorded by {event.actor}</span></div>{event.href && <Link className="receipt-link" href={event.href}><ReceiptText size={14}/>View receipt <ArrowUpRight size={13}/></Link>}</div></div>; })}
    </div></DataState></section>
  </div>;
}
function NotificationsPage() {
  const d = useData();
  const [filter, setFilter] = useState('all');
  const items = (d.activity || []).filter(activity => filter === 'all' || activity.type === filter);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);
  const groups = [
    { title: 'Today', items: items.filter(item => new Date(item.occurredAt) >= today) },
    { title: 'This week', items: items.filter(item => { const date = new Date(item.occurredAt); return date >= weekStart && date < today; }) },
    { title: 'Older', items: items.filter(item => new Date(item.occurredAt) < weekStart) },
  ];
  return <div className="page-stack">
    <div className="notification-intro"><span className="notification-emblem"><Bell size={22}/></span><div><h2>One dependable history.</h2><p>Payments, repairs and agreements in the order they happened.</p></div><button className="button button-quiet" onClick={d.refresh}><RefreshCw size={15}/>Refresh</button></div>
    <div className="toolbar notification-toolbar"><div className="toolbar-meta">{items.length} activity records</div><div className="filter-pills">{['all','payment','repair','agreement','message','contact_reveal'].map(type => <button aria-pressed={filter === type} className={filter === type ? 'active' : ''} key={type} onClick={() => setFilter(type)}>{type === 'all' ? 'All activity' : type === 'contact_reveal' ? 'Contact access' : statusLabel(type)}</button>)}</div></div>
    <section className="panel notifications-panel"><DataState rows={items} title="Your activity is up to date" text="New payment receipts and property activity will be listed here."><div className="timeline">
      {groups.filter(group => group.items.length > 0).map(group => <section className="timeline-group" key={group.title} aria-label={group.title}>
        <h2>{group.title}</h2>
        {group.items.map((item, index) => <div className="timeline-entry" key={item.id} data-testid={`activity-${item.id}`}><div className="timeline-rail"><span className={`timeline-icon type-${item.type}`}>{item.type === 'payment' ? <Wallet size={16}/> : item.type === 'repair' ? <Wrench size={16}/> : item.type === 'agreement' ? <FileCheck2 size={16}/> : <Bell size={16}/>}</span>{index < group.items.length - 1 && <i/>}</div><div className="timeline-body"><div className="timeline-title"><b>{item.title}</b><time>{dateFmt(item.occurredAt)}</time></div><p>{item.detail}</p><div className="timeline-meta"><span>{item.unitNumber === 'Tenant record' ? 'Tenant record' : `Unit ${item.unitNumber}`}</span><span>Recorded by {item.actor}</span></div>{item.type === 'payment' && <Link className="receipt-link" href={`/receipt/${item.id}`}><ReceiptText size={14}/>View receipt <ArrowUpRight size={13}/></Link>}</div></div>)}
      </section>)}
    </div></DataState></section>
  </div>;
}
function TenantPortalPage({ showDashboardSearch = false }: { showDashboardSearch?: boolean }) {
  const d = useData();
  const tenant = getDemoTenant(d);
  const unit = d.units.find(item => item.id === tenant?.unitId);
  const agreement = d.agreements.find(item => item.tenantId === tenant?.id);
  const allPayments = d.payments.filter(payment => payment.unitId === tenant?.unitId);
  const payments = allPayments.slice(0, 3);
  const repairs = d.repairs.filter(repair => repair.unitId === tenant?.unitId).slice(0, 3);
  const messages = (d.messages ?? []).filter(message => message.unitId === tenant?.unitId).slice(0, 2);
  const latestMessageContext = messages[0]?.context ?? 'general';
  const dueDate = agreement?.nextDueDate;
  const dueIn = dueDate ? daysUntilDate(dueDate, new Date()) : null;
  const balance = tenant?.balance ?? unit?.balance ?? 0;
  const propertyName = d.properties.find(property => property.id === unit?.propertyId)?.name || 'Your home';
  const [payOpen, setPayOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const c = tenantCopy(d.language);
  const reminderChannel = readReminderChannel();
  const changeLanguage = (value: TenantLanguage) => d.setLanguage(value);
  if (!tenant || !unit) return <div className="page-stack"><Empty title={c.homeUnlinked} text={c.homeUnlinkedHint}/></div>;

  const latestPayment = allPayments[0];
  const statusMonth = new Date(latestPayment?.recordedAt ?? dueDate ?? new Date().toISOString()).toLocaleDateString('en-UG', { month: 'long' });
  const statusConfirmed = balance <= 0;
  const statusPending = !statusConfirmed && latestPayment?.status === 'pending';
  const statusText = statusConfirmed
    ? c.statusConfirmed(statusMonth)
    : statusPending
      ? c.statusPending(statusMonth)
      : latestPayment
        ? c.statusPartial(statusMonth)
        : c.statusMissing(statusMonth);
  const statusPillText = statusConfirmed ? c.statusPillConfirmed : statusPending ? c.statusPillPending : c.statusPillDue;
  const dueLabel = dueIn == null
    ? c.dateNotRecorded
    : dueIn < 0 ? c.daysOverdue(Math.abs(dueIn)) : dueIn === 0 ? c.dueToday : dueIn === 1 ? c.dueTomorrow : c.dueInDays(dueIn);
  const reminderText = dueIn == null
    ? c.nextRentDue
    : dueIn > 0 ? c.reminderDueIn(dueIn) : dueIn === 0 ? c.reminderToday : c.reminderOverdue(Math.abs(dueIn));
  const reminderMessage = `Reminder: rent of ${fmt(balance || unit?.rentAmount || 0)} for ${propertyName} Unit ${unit?.unitNumber ?? ''}${dueDate ? ` is due on ${dateFmt(dueDate)}` : ''}.`;
  const reminderDigits = (tenant?.phone || '').replace(/\D/g, '');
  const reminderHref = reminderChannel === 'WhatsApp' && reminderDigits
    ? `https://wa.me/${reminderDigits}?text=${encodeURIComponent(reminderMessage)}`
    : `sms:${tenant?.phone || ''}?body=${encodeURIComponent(reminderMessage)}`;
  const logReminder = () => {
    if (!tenant || !unit) return;
    try {
      d.createReminder({ tenantId: tenant.id, unitId: unit.id, channel: reminderChannel === 'WhatsApp' ? 'whatsapp' : 'sms', message: reminderMessage, sentBy: `${tenant.fullName} · Tenant` });
      d.notify(`Reminder set by ${reminderChannel}`);
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'The reminder could not be saved.');
    }
  };

  const greetingName = tenant?.fullName?.split(' ')[0] || (d.language === 'Luganda' ? 'munange' : 'there');
  const greetingHour = new Date().getHours();
  const greetingText = greetingHour < 12 ? c.greetingMorning(greetingName) : greetingHour < 17 ? c.greetingAfternoon(greetingName) : c.greetingEvening(greetingName);

  return <div className="tenant-portal tenant-private-portal" data-testid="tenant-home-portal">
    <section className="portal-welcome">
      <div className="portal-brand"><span className="brand-mark"><House size={18}/></span>rentwise <span>{c.brandHome}</span></div>
      <div className="portal-head-actions"><span className="portal-protected"><ShieldCheck size={14}/> {c.privateView}</span><label className="portal-language"><span className="sr-only">{c.languageLabel}</span><select aria-label={c.languageLabel} data-testid="tenant-language" value={d.language} onChange={event => changeLanguage(event.target.value as TenantLanguage)}><option>English</option><option>Luganda</option></select></label></div>
      <span className="eyebrow">{c.heroEyebrow}</span>
      <h2>{greetingText}</h2>
      <p>{c.heroSubtitle}</p>
      <div className="portal-home-card has-corner-mark"><span className="portal-home-icon"><House size={20}/></span><div><b>{propertyName}</b><small>{unit?.unitNumber ? c.homeUnitLine(unit.unitNumber, unit.bedrooms) : c.propertySubLabel}</small></div><span className="portal-active">{c.activeTenancy}</span><span className="card-corner-mark" aria-hidden="true"><ArrowUpRight size={12}/></span></div>
    </section>
    <div className="portal-content">
      {showDashboardSearch && <DashboardSearch/>}
      <section className="portal-balance portal-balance-due has-corner-mark" aria-label={c.balanceAria}>
        <div><span className="eyebrow">{c.balanceEyebrow}</span><b>{fmt(balance)}</b><small>{balance > 0 ? c.balanceCheck : c.balanceUpToDate}</small></div>
        <div className="portal-due-detail"><span className="balance-icon"><CalendarDays size={20}/></span><span><small>{c.nextDue}</small><b>{dateFmt(dueDate)}</b><em>{dueLabel}</em></span></div>
        <div className="portal-balance-status" data-testid="tenant-payment-status"><span className={classes('status-pill', statusConfirmed ? 'status-paid' : 'status-pending')}><i/>{statusPillText}</span><span>{statusText}</span></div>
        <div className="portal-balance-actions">
          {balance > 0 && tenant && unit
            ? <button type="button" className="button button-primary" onClick={() => setPayOpen(true)} data-testid="button-pay-rent"><Smartphone size={16}/>{c.payRent}</button>
            : <span className="portal-balance-clear" data-testid="tenant-balance-clear"><CheckCircle2 size={16}/>{c.balanceUpToDate}</span>}
          <Link href="/payments" className="button button-quiet">{c.seeAllReceipts} <ArrowUpRight size={14}/></Link>
        </div>
        <span className="card-corner-mark" aria-hidden="true"><ArrowUpRight size={12}/></span>
      </section>
      <div className="portal-panels">
        <Panel title={c.panelPayments} action={<Link href="/payments" className="text-link" data-testid="link-tenant-payments">{c.seeAllReceipts} <ArrowUpRight size={14}/></Link>} cornerMark>
          <DataState rows={payments} title={c.noReceipts} text={c.noReceiptsHint} action={balance > 0 && tenant && unit ? <button type="button" className="button button-primary" onClick={() => setPayOpen(true)} data-testid="portal-empty-pay"><Smartphone size={15}/>{c.ctaPay}</button> : undefined}>
            <div className="portal-payment-list">{payments.map(payment => <div className="portal-payment" key={payment.id} data-testid={`portal-payment-${payment.id}`}><span className="payment-check"><Check size={15}/></span><span><b>{dateFmt(payment.recordedAt)} rent</b><small>{payment.method === 'mobile_money' ? 'MTN / Airtel mobile money' : statusLabel(payment.method)}{payment.reference ? ` · Ref ${payment.reference}` : ''}</small><span className={classes('status-pill', payment.status === 'paid' ? 'status-paid' : 'status-pending')}><i/>{payment.status === 'paid' ? c.statusPillConfirmed : c.statusPillPending}</span></span><strong>{fmt(payment.amount)}</strong><Link href={`/receipt/${payment.id}`} className="portal-receipt-link" aria-label={`${c.viewReceipt} · ${dateFmt(payment.recordedAt)}`}><ReceiptText size={16}/></Link></div>)}</div>
          </DataState>
        </Panel>
        <Panel title={c.panelCare} action={<Link href="/repairs" className="text-link" data-testid="link-tenant-repairs">{c.repairUpdates} <ArrowUpRight size={14}/></Link>} cornerMark>
          <DataState rows={repairs} title={c.noRepairs} text={c.noRepairsHint} action={tenant && unit ? <button type="button" className="button button-primary" onClick={() => setReportOpen(true)} data-testid="portal-empty-report"><Wrench size={15}/>{c.ctaReport}</button> : undefined}>
            <div className="portal-repairs">{repairs.map(repair => <div key={repair.id} className="portal-repair" data-testid={`portal-repair-${repair.id}`}><Wrench size={16}/><span><b>{repair.title}</b><small>{c.reportedOn(dateFmt(repair.reportedAt))}</small></span><Status value={repair.status}/></div>)}</div>
          </DataState>
        </Panel>
        <Panel title={c.panelAgreement} action={agreement ? <Link href="/agreements" className="text-link" data-testid="link-tenant-agreement">{c.quickAgreement} <ArrowUpRight size={14}/></Link> : undefined} cornerMark>
          {agreement
            ? <div className="portal-fact-list"><div><span>{c.monthlyRent}</span><b>{fmt(agreement.monthlyRent)}</b></div><div><span>{c.deposit}</span><b>{fmt(agreement.deposit)}</b></div><div><span>{c.termEnds}</span><b>{dateFmt(agreement.endDate)}</b></div><div><span>{c.nextRentDue}</span><b className="due-date">{dateFmt(agreement.nextDueDate)}</b></div></div>
            : <Empty title={c.quickAgreement} text={c.noAgreementHint} action={<Link href="/agreements" className="text-link" data-testid="portal-empty-agreement">{c.quickAgreement} <ArrowUpRight size={14}/></Link>}/>}
        </Panel>
        <Panel title={c.panelReminders} cornerMark>
          <div className="portal-reminder">
            <span className="portal-reminder-icon"><Bell size={18}/></span>
            <div><b>{reminderText}</b><small>{c.reminderChannel(reminderChannel)}</small></div>
            <a className="button button-quiet" href={reminderHref} onClick={logReminder} data-testid="button-tenant-remind"><Smartphone size={14}/>{c.remindMe}</a>
          </div>
        </Panel>
        <Panel title={c.panelMessages} action={<button type="button" className="text-link button-link" onClick={() => setMessageOpen(true)} data-testid="link-tenant-message">{c.writeMessage} <ArrowUpRight size={14}/></button>} cornerMark>
          <DataState rows={messages} title={c.noMessages} text={c.noMessagesHint} action={tenant && unit ? <button type="button" className="button button-primary" onClick={() => setMessageOpen(true)} data-testid="portal-empty-message"><MessageSquare size={15}/>{c.ctaMessage}</button> : undefined}>
            <div className="portal-messages">{messages.map(message => <div className="portal-message" key={message.id} data-testid={`portal-message-${message.id}`}><span className="portal-message-icon"><MessageSquare size={15}/></span><span><b>{message.from === 'tenant' ? 'You' : message.sentBy}</b><small>{dateFmt(message.sentAt)}</small><p>{message.body}</p></span></div>)}</div>
          </DataState>
        </Panel>
      </div>
      <div className="portal-quick-links">
        <button type="button" className="portal-quick-link" onClick={() => setReportOpen(true)} data-testid="link-tenant-report-quick"><Wrench size={17}/><span><b>{c.quickReport}</b><small>{c.quickReportHint}</small></span><ArrowUpRight size={15}/></button>
        <button type="button" className="portal-quick-link" onClick={() => setMessageOpen(true)} data-testid="link-tenant-message-quick"><MessageSquare size={17}/><span><b>{c.quickMessage}</b><small>{c.quickMessageHint}</small></span><ArrowUpRight size={15}/></button>
        <Link href="/agreements" className="portal-quick-link"><FileCheck2 size={17}/><span><b>{c.quickAgreement}</b><small>{c.quickAgreementHint}</small></span><ArrowUpRight size={15}/></Link>
        <Link href="/notifications" className="portal-quick-link"><Bell size={17}/><span><b>{c.quickActivity}</b><small>{c.quickActivityHint}</small></span><ArrowUpRight size={15}/></Link>
      </div>
      <div className="portal-privacy"><ShieldCheck size={17}/><p><b>{c.privacyTitle}</b> {c.privacyBody}</p></div>
    </div>
    {payOpen && tenant && unit && <PayRentModal tenant={tenant} unit={unit} agreement={agreement} close={() => setPayOpen(false)}/>}
    {reportOpen && tenant && unit && <QuickRepairModal tenant={tenant} unit={unit} close={() => setReportOpen(false)}/>}
    {messageOpen && tenant && unit && <MessageComposerModal tenant={tenant} unit={unit} initialContext={latestMessageContext} close={() => setMessageOpen(false)}/>}
  </div>;
}
function PayRentModal({ tenant, unit, agreement, close }: { tenant: Tenant; unit: Unit; agreement?: Agreement; close: () => void }) {
  const d = useData();
  const [, setLocation] = useLocation();
  const c = tenantCopy(d.language);
  const owed = tenant.balance > 0 ? tenant.balance : unit.rentAmount;
  const [amount, setAmount] = useState(String(owed));
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [phone, setPhone] = useState(tenant.phone);
  const [reference, setReference] = useState('');
  const [phase, setPhase] = useState<'form' | 'processing' | 'done'>('form');
  const [payment, setPayment] = useState<Payment | null>(null);
  const amountValue = Number(amount) || 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (amountValue <= 0) { d.notify(c.payAmountRequired); return; }
    let created: Payment;
    try {
      created = d.createPayment({ unitId: unit.id, amount: amountValue, method: 'mobile_money', recordedBy: `${tenant.fullName} · Tenant`, status: 'pending', ...(reference.trim() ? { reference } : {}) });
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'The payment could not be saved.');
      return;
    }
    setPayment(created);
    setPhase('processing');
    if (phone.trim() && phone.trim() !== tenant.phone) {
      try { d.updateTenant(tenant.id, { phone: phone.trim() }); } catch { /* phone update is best-effort */ }
    }
    d.notify(c.payConfirming(provider === 'mtn' ? 'MTN' : 'Airtel'));
    window.setTimeout(() => {
      d.confirmPayment(created.id);
      d.notify(c.payConfirmedToast);
      setPhase('done');
    }, 3000);
  };
  return <Modal open title={`${c.payModalTitle} · Unit ${unit.unitNumber}`} close={phase === 'processing' ? () => undefined : close}>
    {phase === 'form' && <form className="form-stack tenant-report-form pay-rent-form" onSubmit={submit}>
      <div className="pay-amount-note"><span>{c.nextRentDue}</span><b>{dateFmt(agreement?.nextDueDate)}</b><small>{c.balanceEyebrow}: <b>{fmt(owed)}</b></small></div>
      <Field label={c.amountLabel}><div className="input-money"><span>UGX</span><input type="number" inputMode="numeric" min="1" required value={amount} onChange={event => setAmount(event.target.value)} placeholder="0" data-testid="input-pay-amount"/></div></Field>
      <Field label={c.methodLabel}>
        <div className="method-options">
          <button type="button" className={classes('method-option', provider === 'mtn' && 'active')} aria-pressed={provider === 'mtn'} onClick={() => setProvider('mtn')} data-testid="provider-mtn"><span className="method-symbol mobile_money"><Smartphone size={17}/></span><span>MTN MoMo</span>{provider === 'mtn' && <Check size={14}/>}</button>
          <button type="button" className={classes('method-option', provider === 'airtel' && 'active')} aria-pressed={provider === 'airtel'} onClick={() => setProvider('airtel')} data-testid="provider-airtel"><span className="method-symbol mobile_money"><Smartphone size={17}/></span><span>Airtel Money</span>{provider === 'airtel' && <Check size={14}/>}</button>
        </div>
      </Field>
      <div className="mobile-provider"><span className="provider-badge mtn">MTN</span><span className="provider-badge airtel">airtel</span><span>{provider === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}</span></div>
      <Field label={c.phoneLabel}><input value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" placeholder="+256 7xx xxx xxx" data-testid="input-pay-phone"/></Field>
      <Field label={c.referenceLabel}><input value={reference} onChange={event => setReference(event.target.value)} placeholder={c.referencePlaceholder} data-testid="input-pay-reference"/></Field>
      <button className="button button-primary full-button tenant-report-submit" type="submit" disabled={!amountValue} data-testid="button-submit-pay"><Smartphone size={16}/>{c.payButton(fmt(amountValue))}</button>
      <p className="form-trust"><ShieldCheck size={14}/> {c.payTrust}</p>
    </form>}
    {phase === 'processing' && <div className="pay-processing" role="status" aria-live="polite" data-testid="pay-processing">
      <span className="pay-spinner" aria-hidden="true"/>
      <b>{c.processingTitle}</b>
      <p>{c.processingHint}</p>
      <div className="pay-processing-meta"><span>{provider === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}</span><span>{fmt(amountValue)}</span></div>
    </div>}
    {phase === 'done' && payment && <div className="receipt-confirmation" data-testid="pay-confirmed">
      <div className="paid-stamp" aria-label="Payment paid">PAID</div>
      <span className="eyebrow">{c.confirmedTitle}</span>
      <h3>{fmt(payment.amount)}</h3>
      <p>{c.receiptUnitLabel} {unit.unitNumber} · {tenant.fullName}</p>
      <div className="receipt-meta"><span>{c.receiptRecordedOn} {dateFmt(payment.recordedAt)}</span><span>{provider === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}</span>{payment.reference && <span>{c.receiptReferenceLabel} {payment.reference}</span>}</div>
      <div className="receipt-actions"><button type="button" className="button button-primary" onClick={() => { close(); setLocation(`/receipt/${payment.id}`); }} data-testid="button-open-new-receipt"><ReceiptText size={15}/>{c.viewReceipt}</button><button type="button" className="button button-quiet" onClick={close}>{c.backHome}</button></div>
    </div>}
  </Modal>;
}
function RepairReportForm({ tenant, unit, onSent, titleId, submitTestId = 'button-submit-repair' }: { tenant: Tenant; unit: Unit; onSent?: () => void; titleId?: string; submitTestId?: string }) {
  const d = useData();
  const c = tenantCopy(d.language);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const selectPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      setPhotoDataUrl(await resizePhotoToDataUrl(file));
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'This photo could not be prepared. Try another image.');
    } finally {
      setPhotoBusy(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      d.createRepair({ unitId: unit.id, title, description, reportedBy: tenant.fullName, photoDataUrl });
      d.notify(c.reportSent);
      onSent?.();
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'The repair request could not be saved on this device.');
    }
  };
  return <form className="form-stack tenant-report-form" onSubmit={submit}>
    <Field label={c.reportTitleLabel}><input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder={c.reportTitlePlaceholder} aria-label={c.reportTitleLabel} id={titleId}/></Field>
    <Field label={c.reportDetailsLabel}><textarea maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} placeholder={c.reportDetailsPlaceholder} aria-label={c.reportDetailsLabel}/></Field>
    <div className="tenant-photo-field">
      <span className="tenant-photo-label">{c.reportPhotoLabel} <small>{c.reportPhotoHint}</small></span>
      <label className="tenant-photo-upload">
        <span className="tenant-photo-icon"><ImagePlus size={20}/></span>
        <span className="tenant-photo-copy"><b>{photoBusy ? c.reportPhotoPreparing : photoDataUrl ? c.reportPhotoAttached : c.reportPhotoAdd}</b><small>{photoDataUrl ? c.reportPhotoReplace : c.reportPhotoShow}</small></span>
        <input type="file" accept="image/*" aria-label={c.reportPhotoAdd} onChange={selectPhoto} disabled={photoBusy}/>
      </label>
    </div>
    {photoDataUrl && <div className="repair-photo-preview"><img src={photoDataUrl} alt={c.reportPhotoAttached}/><button type="button" className="button button-quiet" onClick={() => setPhotoDataUrl(null)}>{c.reportRemovePhoto}</button></div>}
    <button className="button button-primary full-button tenant-report-submit" type="submit" disabled={photoBusy || !title.trim()} data-testid={submitTestId}><Wrench size={16}/>{c.reportSubmit}</button>
  </form>;
}
function QuickRepairModal({ tenant, unit, close }: { tenant: Tenant; unit: Unit; close: () => void }) {
  const d = useData();
  const c = tenantCopy(d.language);
  return <Modal open title={`${c.quickReport} · Unit ${unit.unitNumber}`} close={close}>
    <RepairReportForm tenant={tenant} unit={unit} onSent={close} submitTestId="button-submit-quick-repair"/>
  </Modal>;
}
function MessageComposerModal({ tenant, unit, close, initialContext = 'general' }: { tenant: Tenant; unit: Unit; close: () => void; initialContext?: MessageContext }) {
  const d = useData();
  const c = tenantCopy(d.language);
  const [context, setContext] = useState<MessageContext>(initialContext);
  const [body, setBody] = useState('');
  const latestPayment = d.payments.find(payment => payment.unitId === unit.id);
  const openRepair = d.repairs.find(repair => repair.unitId === unit.id && repair.status !== 'done');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) { d.notify(c.messageEmpty); return; }
    try {
      d.createMessage({
        unitId: unit.id,
        tenantId: tenant.id,
        from: 'tenant',
        sentBy: tenant.fullName,
        body,
        context,
        contextId: context === 'payment' ? latestPayment?.id ?? null : context === 'repair' ? openRepair?.id ?? null : null,
      });
      d.notify(c.sentTo);
      close();
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'The message could not be saved on this device.');
    }
  };
  return <Modal open title={`${c.writeMessage} · Unit ${unit.unitNumber}`} close={close}>
    <form className="form-stack tenant-report-form" onSubmit={submit}>
      <Field label={c.messageContext}>
        <select value={context} onChange={event => setContext(event.target.value as MessageContext)} aria-label={c.messageContext} data-testid="select-message-context">
          <option value="general">{c.messageGeneral}</option>
          <option value="payment">{c.messagePayment}</option>
          <option value="repair">{c.messageRepair}</option>
        </select>
      </Field>
      <Field label={c.messageBodyLabel}><textarea required maxLength={1000} value={body} onChange={event => setBody(event.target.value)} placeholder="Type your message…" aria-label={c.messageBodyLabel} data-testid="input-message-body"/></Field>
      <button className="button button-primary full-button tenant-report-submit" type="submit" disabled={!body.trim()} data-testid="button-send-message"><MessageSquare size={16}/>{c.sendMessage}</button>
      <p className="form-trust"><ShieldCheck size={14}/> {c.messageTrust(`Unit ${unit.unitNumber}`)}</p>
    </form>
  </Modal>;
}
function TenantMessagesPage() {
  const d = useData();
  const tenant = getDemoTenant(d);
  const unit = d.units.find(item => item.id === tenant?.unitId);
  const messages = (d.messages ?? []).filter(message => message.unitId === tenant?.unitId).slice().sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const c = tenantCopy(d.language);
  const [composing, setComposing] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);
  const hasUnread = messages.some(message => message.from === 'property' && !message.read);
  useEffect(() => {
    if (hasUnread) d.markMessagesRead(tenant?.unitId ?? undefined);
  }, [hasUnread, tenant?.unitId]);
  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);
  const contextLabel = (message: Message) => message.context === 'payment' ? c.messagePayment : message.context === 'repair' ? c.messageRepair : c.messageGeneral;
  return <div className="page-stack">
    <div className="role-page-intro"><span className="role-page-icon"><MessageSquare size={19}/></span><div><span className="eyebrow">{c.panelMessages.toUpperCase()} · UNIT {unit?.unitNumber ?? '—'}</span><h2>{c.panelMessages}</h2><p>{c.quickMessageHint}</p></div>{tenant && unit && <button type="button" className="button button-primary role-intro-action" onClick={() => setComposing(true)} data-testid="button-open-composer"><Plus size={15}/>{c.writeMessage}</button>}</div>
    <section className="panel role-record-panel"><DataState rows={messages} title={c.noMessages} text={c.noMessagesHint} action={tenant && unit ? <button type="button" className="button button-primary" onClick={() => setComposing(true)} data-testid="button-empty-compose"><MessageSquare size={15}/>{c.ctaMessage}</button> : undefined}>
      <div className="tenant-message-thread">{messages.map(message => <article className={classes('role-record-row', 'tenant-message-row', message.from === 'tenant' ? 'from-tenant' : 'from-property')} key={message.id} data-testid={`message-${message.id}`}>
        <span className="tenant-avatar">{message.from === 'tenant' ? initials(tenant?.fullName) : initials(message.sentBy)}</span>
        <div><b>{message.from === 'tenant' ? 'You' : message.sentBy}</b><small>{dateFmt(message.sentAt)} · {contextLabel(message)}{message.from === 'property' && !message.read ? ' · New' : ''}</small><p>{message.body}</p></div>
      </article>)}<div ref={threadEnd}/></div>
    </DataState></section>
    <p className="privacy-note"><ShieldCheck size={16}/><span>{c.messagesPrivacy}</span></p>
    {composing && tenant && unit && <MessageComposerModal tenant={tenant} unit={unit} initialContext={messages.length ? messages[messages.length - 1].context : 'general'} close={() => setComposing(false)}/>}
  </div>;
}
function SettingsPage({ theme, setTheme }: { theme: string; setTheme: (s: string) => void }) {
  const d = useData();
  const tenant = d.role === 'Tenant' ? getDemoTenant(d) : null;
  const [phone, setPhone] = useState(tenant?.phone ?? '');
  const isTenant = d.role === 'Tenant';
  const language = d.language;
  const c = tenantCopy(language);
  const [alerts, setAlerts] = useState(localStorage.getItem('ledger-alerts') !== 'off');
  const [saved, setSaved] = useState(false);
  const [channels, setChannels] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ledger-notification-channels') || '["sms"]');
      return Array.isArray(stored) ? stored.filter((item): item is string => ['sms', 'whatsapp', 'email'].includes(item)) : ['sms'];
    } catch { return ['sms']; }
  });
  const updateLanguage = (s: string) => {
    const value = s === 'Luganda' ? 'Luganda' : 'English';
    d.setLanguage(value);
    setSaved(true);
    d.notify(isTenant ? tenantCopy(value).settingsLanguageSaved : 'Language preference saved');
  };
  const savePhone = (event: FormEvent) => {
    event.preventDefault();
    if (!tenant) return;
    if (!phone.trim()) { d.notify(isTenant ? c.settingsPhoneEmpty : 'Enter a phone number before saving.'); return; }
    d.updateTenant(tenant.id, { phone });
    d.notify(isTenant ? c.settingsPhoneSaved : 'Phone number updated on this device');
  };
  const updateAlerts = () => { const n = !alerts; setAlerts(n); localStorage.setItem('ledger-alerts', n ? 'on' : 'off'); d.notify(n ? (isTenant ? c.settingsAlertEnabled : 'Notifications enabled') : (isTenant ? c.settingsAlertPaused : 'Notifications paused')); };
  const toggleChannel = (channel: string) => {
    const next = channels.includes(channel) ? channels.filter(item => item !== channel) : [...channels, channel];
    setChannels(next);
    localStorage.setItem('ledger-notification-channels', JSON.stringify(next));
    d.notify(isTenant ? c.settingsChannelSaved : 'Notification preferences saved on this device');
  };
  return <div className="settings-layout">
    <section className="settings-intro"><span className="settings-mark"><Settings size={21}/></span><div><h2>{isTenant ? c.settingsIntroTitle : 'A workspace that fits the way you work.'}</h2><p>{isTenant ? c.settingsIntroSub : 'These preferences are saved on this device.'}</p></div></section>
    {d.role === 'Landlord' && <section className="settings-section"><div className="settings-section-title"><span><UserRound size={18}/></span><div><h2>Demo workspace role</h2><p>Preview role-based screens. This does not create accounts or secure access.</p></div></div><div className="role-options">{(['Landlord','Caretaker','Tenant'] as Role[]).map(role => <button key={role} onClick={() => { d.setRole(role); d.notify(`${role} demo workspace selected`); }} className={classes('role-option', d.role === role && 'selected')} aria-pressed={d.role === role} data-testid={`role-${role.toLowerCase()}`}><span className="role-icon">{role === 'Landlord' ? <Building2 size={18}/> : role === 'Caretaker' ? <ClipboardList size={18}/> : <UserRound size={18}/>}</span><span><b>{role}</b><small>{role === 'Landlord' ? 'Portfolio overview and records' : role === 'Caretaker' ? 'Fast collection and repairs' : 'A simple tenant-facing portal'}</small></span>{d.role === role && <CheckCircle2 size={18} className="role-check"/>}</button>)}</div></section>}
    <section className="settings-section"><div className="settings-section-title"><span><Sun size={18}/></span><div><h2>{isTenant ? c.settingsAppearanceTitle : 'Appearance'}</h2><p>{isTenant ? c.settingsAppearanceSub : 'Choose a light or dark ledger.'}</p></div></div><div className="appearance-options"><button onClick={() => setTheme('light')} className={classes('appearance-choice', theme === 'light' && 'selected')} aria-pressed={theme === 'light'} data-testid="theme-light"><Sun size={18}/><span>{isTenant ? c.settingsLight : 'Light'}</span>{theme === 'light' && <Check size={15}/>}</button><button onClick={() => setTheme('dark')} className={classes('appearance-choice', theme === 'dark' && 'selected')} aria-pressed={theme === 'dark'} data-testid="theme-dark"><Moon size={18}/><span>{isTenant ? c.settingsDark : 'Dark'}</span>{theme === 'dark' && <Check size={15}/>}</button></div></section>
    <section className="settings-section"><div className="settings-section-title"><span><Bell size={18}/></span><div><h2>{isTenant ? c.settingsNotificationsTitle : 'Notifications'}</h2><p>{isTenant ? c.settingsNotificationsSub : 'Choose which activity reminders you want on this device.'}</p></div></div><button className="settings-toggle-row" role="switch" aria-checked={alerts} onClick={updateAlerts} data-testid="toggle-notifications"><span><b>{isTenant ? c.settingsAlertTitle : 'Activity and payment reminders'}</b><small>{isTenant ? c.settingsAlertSub : 'Receipts, collection follow-ups and repair updates'}</small></span><i className={classes('switch', alerts && 'on')}><em/></i></button><div className="notification-channel-options"><span>{isTenant ? c.settingsChannels : 'Preferred channels'}</span>{[['sms','SMS'],['whatsapp','WhatsApp'],['email','Email']].map(([key,label]) => <label key={key}><input type="checkbox" checked={channels.includes(key)} onChange={() => toggleChannel(key)}/>{label}</label>)}</div><p className="settings-hint">{isTenant ? c.settingsChannelsHint : 'These are saved preferences only. Sending SMS, WhatsApp, or email is not connected in this browser demo.'}</p></section>
    {d.role === 'Tenant' && tenant && <section className="settings-section"><div className="settings-section-title"><span><Smartphone size={18}/></span><div><h2>{c.settingsPhoneTitle}</h2><p>{c.settingsPhoneHint}</p></div></div><form className="phone-settings-row" onSubmit={savePhone}><input value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" aria-label={c.settingsPhoneTitle} placeholder="+256 7xx xxx xxx" data-testid="input-tenant-phone"/><button className="button button-primary" type="submit" data-testid="button-save-tenant-phone">{c.saveNumber}</button><span className="phone-mask">{maskPhone(phone)}</span></form></section>}
    <section className="settings-section"><div className="settings-section-title"><span><CircleHelp size={18}/></span><div><h2>{isTenant ? c.settingsLanguageTitle : 'Language'}</h2><p>{isTenant ? c.settingsLanguageSub : 'Language used for labels and date formats.'}</p></div></div><div className="language-row"><select value={language} onChange={event => updateLanguage(event.target.value)} aria-label={isTenant ? c.settingsLanguageTitle : 'Language preference'}><option>English</option><option>Luganda</option></select><span>{isTenant ? c.settingsCurrency : 'UGX · Uganda Shillings'}</span></div></section>
    <section className="settings-section role-summary"><div className="settings-section-title"><span><ShieldCheck size={18}/></span><div><h2>{isTenant ? c.settingsPrivacyTitle : 'Privacy and data'}</h2><p>{isTenant ? c.settingsPrivacySub : 'Rental records, contact details, role, and display preferences are saved in this browser only; they do not sync to other devices or users.'}</p></div></div><span className="privacy-check"><CheckCircle2 size={16}/> {isTenant ? c.settingsPrivacyCheck : 'Saved in this browser'}</span></section>{saved && <span className="sr-only">{isTenant ? c.settingsLanguageSaved : 'Language setting saved'}</span>}
  </div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="form-field"><span>{label}</span>{children}</label>; }

function Modal({ open, title, close, children }: { open: boolean; title: string; close: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? []);
    window.setTimeout(() => (focusables()[0] ?? node)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const firstItem = items[0]; const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [open, close]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-labelledby="active-modal-title">
      <div className="modal-head"><h2 id="active-modal-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={close}><X size={17}/></button></div>
      {children}
    </section>
  </div>;
}

function ModalActions({ close }: { close: () => void }) {
  return <div className="modal-actions"><button type="button" className="button button-quiet" onClick={close}>Cancel</button><button type="submit" className="button button-primary">Save</button></div>;
}

function Router() {
  const [path] = useLocation();
  if (path === '/' || path === '/signup') return <SignUpPage />;
  if (path === '/login' || path === '/create-account' || path === '/forgot-password') return <AuthPage />;
  return <WorkspaceData><AppShell /></WorkspaceData>;
}

export default function App() {
  return <WouterRouter><TooltipProvider><Router /><Toaster /></TooltipProvider></WouterRouter>;
}
