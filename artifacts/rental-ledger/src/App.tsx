import { type FormEvent, type ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';
import './rental.css';
import { MutationCache, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import SignUpPage from '@/pages/sign-up';
import AuthPage from '@/pages/auth';
import {
  useCreateProperty, useCreateUnit, useCreateTenant, useCreatePayment, useCreateRepair, useCreateContactReveal,
  useUpdateUnit, useUpdateRepair, useGetRentalDashboard, useGetProperties, useGetUnits,
  useGetTenants, useGetPayments, useGetRepairs, useGetAgreements, useGetRentalActivity,
  useGetRentalAnalytics, useSignAgreement, getGetRentalDashboardQueryKey, getGetPropertiesQueryKey,
  getGetUnitsQueryKey, getGetTenantsQueryKey, getGetPaymentsQueryKey, getGetRepairsQueryKey,
  getGetAgreementsQueryKey, getGetRentalActivityQueryKey, getGetRentalAnalyticsQueryKey,
} from '@workspace/api-client-react';
import type { Property, Unit, Tenant, Payment, PaymentInput, Repair, Agreement, Activity, Dashboard, Analytics } from '@workspace/api-client-react';
import {
  Activity as ActivityIcon, ArrowDownLeft, ArrowLeft, ArrowUpRight, Bell, Building2, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronLeft, CircleHelp, ClipboardList, Clock3, Download, FileCheck2,
  LayoutDashboard, List, LoaderCircle, Menu, Moon, MoreHorizontal,
  Plus, RefreshCw, Search, Settings, ShieldCheck, Sun, UserRound, Users, Wallet, Wrench, X,
  BarChart3, MapPin, Smartphone, Eye, EyeOff, WifiOff, ReceiptText, House, TrendingUp,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useRoute, Router as WouterRouter } from 'wouter';
import { motion } from 'framer-motion';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 20_000 } },
  mutationCache: new MutationCache({ onSuccess: () => {
    for (const queryKey of generatedQueryKeys) void queryClient.invalidateQueries({ queryKey });
  } }),
});
const generatedQueryKeys = [
  getGetRentalDashboardQueryKey(), getGetPropertiesQueryKey(), getGetUnitsQueryKey(),
  getGetTenantsQueryKey(), getGetPaymentsQueryKey(), getGetRepairsQueryKey(),
  getGetAgreementsQueryKey(), getGetRentalActivityQueryKey(),
  getGetRentalAnalyticsQueryKey({ period: 'month' }), getGetRentalAnalyticsQueryKey({ period: 'year' }),
];
type Role = 'Landlord' | 'Caretaker' | 'Tenant';
type QueuedPayment = { id: string; data: PaymentInput };
const loadQueuedPayments = (): QueuedPayment[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('rentwise-offline-payments') || '[]');
    return Array.isArray(stored) ? stored as QueuedPayment[] : [];
  } catch {
    return [];
  }
};
type DataContextValue = {
  dashboard?: Dashboard; properties?: Property[]; units?: Unit[]; tenants?: Tenant[];
  payments?: Payment[]; repairs?: Repair[]; agreements?: Agreement[]; activity?: Activity[];
  loading: boolean; errors: boolean; refresh: () => void; role: Role; setRole: (v: Role) => void;
  createProperty: ReturnType<typeof useCreateProperty>; createUnit: ReturnType<typeof useCreateUnit>;
  createTenant: ReturnType<typeof useCreateTenant>; createPayment: ReturnType<typeof useCreatePayment>;
  createContactReveal: ReturnType<typeof useCreateContactReveal>;
  createRepair: ReturnType<typeof useCreateRepair>; updateUnit: ReturnType<typeof useUpdateUnit>;
  updateRepair: ReturnType<typeof useUpdateRepair>; queuedPayments: QueuedPayment[];
  queuePayment: (payment: PaymentInput) => void; notify: (s: string) => void;
};
const DataContext = createContext<DataContextValue | null>(null);
const useData = () => {
  const value = useContext(DataContext);
  if (!value) throw new Error('Workspace data is unavailable');
  return value;
};

const navGroups = [
  { title: 'WORKSPACE', links: [
    ['/dashboard', 'Overview', LayoutDashboard], ['/properties', 'Properties', Building2],
    ['/daily-collection', 'Daily collection', Wallet], ['/payments', 'Payment ledger', ReceiptText],
  ] },
  { title: 'PEOPLE & OPERATIONS', links: [
    ['/tenants', 'Tenants', Users], ['/repairs', 'Repairs', Wrench], ['/agreements', 'Agreements', FileCheck2],
    ['/notifications', 'Activity & receipts', Bell],
  ] },
  { title: 'INSIGHTS', links: [['/analytics', 'Analytics', BarChart3], ['/tenant', 'Tenant portal', UserRound]] },
];
const fmt = (n?: number | null) => `UGX ${(n ?? 0).toLocaleString('en-UG')}`;
const compact = (n?: number) => `UGX ${(n ?? 0).toLocaleString('en-UG', { notation: 'compact', maximumFractionDigits: 1 })}`;
const dateFmt = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const due = new Date(`${value.slice(0, 10)}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
};
const initials = (name?: string | null) => (name || '—').split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();
const statusLabel = (s: string) => s.replaceAll('_', ' ');
const classes = (...args: (string | false | undefined | null)[]) => args.filter(Boolean).join(' ');
const playReceiptChime = async () => {
  if (localStorage.getItem('rentwise-receipt-sound') !== 'on' || !window.AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const start = context.currentTime;
  oscillator.type = 'sine';
  oscillator.frequency.value = 660;
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.17);
  oscillator.onended = () => { void context.close(); };
};

function WorkspaceData({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const dashboardQ = useGetRentalDashboard();
  const propertiesQ = useGetProperties();
  const unitsQ = useGetUnits();
  const tenantsQ = useGetTenants();
  const paymentsQ = useGetPayments();
  const repairsQ = useGetRepairs();
  const agreementsQ = useGetAgreements();
  const activityQ = useGetRentalActivity();
  const createProperty = useCreateProperty();
  const createUnit = useCreateUnit();
  const createTenant = useCreateTenant();
  const createPayment = useCreatePayment();
  const createContactReveal = useCreateContactReveal();
  const createRepair = useCreateRepair();
  const updateUnit = useUpdateUnit();
  const updateRepair = useUpdateRepair();
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('ledger-role') as Role) || 'Landlord');
  const [notice, setNotice] = useState('');
  const [queuedPayments, setQueuedPayments] = useState<QueuedPayment[]>(loadQueuedPayments);
  const notify = (s: string) => { setNotice(s); window.setTimeout(() => setNotice(''), 3600); };
  const queuePayment = (payment: PaymentInput) => {
    setQueuedPayments(current => [...current, { id: crypto.randomUUID(), data: payment }]);
    notify('Payment saved on this device. It will sync when you reconnect.');
  };
  const refresh = () => { void qc.invalidateQueries(); notify('Workspace refreshed'); };
  useEffect(() => { localStorage.setItem('ledger-role', role); }, [role]);
  useEffect(() => { localStorage.setItem('rentwise-offline-payments', JSON.stringify(queuedPayments)); }, [queuedPayments]);
  useEffect(() => {
    const syncPending = async () => {
      if (!navigator.onLine) return;
      const pending = loadQueuedPayments();
      if (!pending.length) return;
      const syncedIds: string[] = [];
      for (const item of pending) {
        try {
          await createPayment.mutateAsync({ data: item.data });
          syncedIds.push(item.id);
        } catch (error) {
          notify(error instanceof Error ? `Queued payment needs review: ${error.message}` : 'A queued payment needs review before it can sync.');
          break;
        }
      }
      if (syncedIds.length) {
        setQueuedPayments(current => current.filter(item => !syncedIds.includes(item.id)));
        notify(`${syncedIds.length} offline payment${syncedIds.length === 1 ? '' : 's'} synced`);
      }
    };
    window.addEventListener('online', syncPending);
    if (navigator.onLine) void syncPending();
    return () => window.removeEventListener('online', syncPending);
  }, []);
  const data: DataContextValue = {
    dashboard: dashboardQ.data, properties: propertiesQ.data, units: unitsQ.data, tenants: tenantsQ.data,
    payments: paymentsQ.data, repairs: repairsQ.data, agreements: agreementsQ.data, activity: activityQ.data,
    loading: [dashboardQ, propertiesQ, unitsQ, tenantsQ, paymentsQ, repairsQ, agreementsQ, activityQ].some(q => q.isLoading),
    errors: [dashboardQ, propertiesQ, unitsQ, tenantsQ, paymentsQ, repairsQ, agreementsQ, activityQ].some(q => q.isError),
    refresh, role, setRole, createProperty, createUnit, createTenant, createPayment, createContactReveal, createRepair, updateUnit, updateRepair, queuedPayments, queuePayment, notify,
  };
  // Generated query cache keys are refreshed by the mutation cache after successful mutations.
  return <DataContext.Provider value={data}>{children}{notice && <div role="status" className="toast-note" data-testid="status-feedback"><CheckCircle2 size={17}/>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16}/></button></div>}</DataContext.Provider>;
}

function AppShell() {
  const d = useData();
  const [path, setLocation] = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('rentwise-sidebar-collapsed') === 'true');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [theme, setTheme] = useState(() => localStorage.getItem('ledger-theme') || 'light');
  useEffect(() => {
    localStorage.setItem('rentwise-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ledger-theme', theme);
  }, [theme]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => {
    if (d.role === 'Tenant' && path !== '/tenant' && path !== '/settings') setLocation('/tenant');
  }, [d.role, path, setLocation]);
  const title = path.startsWith('/receipt/') ? 'Receipt' : (navGroups.flatMap(g => g.links).find(([href]) => href === path)?.[1] as string) || 'Overview';
  const sidebarGroups = d.role === 'Tenant'
    ? [{ title: 'MY HOME', links: [['/tenant', 'Tenant space', UserRound] as const] }]
    : navGroups;
  const collectionProgress = d.dashboard?.occupiedUnits
    ? Math.min(100, Math.round((d.dashboard.paidToday / d.dashboard.occupiedUnits) * 100))
    : 0;
  const sidebar = <aside id="workspace-sidebar" className={classes('sidebar', drawer && 'sidebar-open')} aria-label="Rentwise workspace sidebar">
    <div className="brand-lockup"><span className="brand-mark"><House size={19}/></span><span><b>rentwise</b><small>PROPERTY LEDGER</small></span><button className="sidebar-collapse-button" type="button" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!sidebarCollapsed} aria-controls="workspace-sidebar" title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} data-testid="button-sidebar-collapse"><ChevronLeft size={17}/></button><button className="sidebar-close" onClick={() => setDrawer(false)} aria-label="Close navigation"><X size={19}/></button></div>
    <div className="workspace-label">MANAGEMENT DESK</div>
    <div className="property-picker" title={`${d.dashboard?.propertyName || d.properties?.[0]?.name || 'Kintu Court'} · All properties`}><span className="property-symbol">K</span><span><b>{d.dashboard?.propertyName || d.properties?.[0]?.name || 'Kintu Court'}</b><small>All properties</small></span><ChevronDown size={15}/></div>
     <nav aria-label="Main navigation">{sidebarGroups.map(group => <div className="nav-group" key={group.title}><p>{group.title}</p>{group.links.map(([href, label, Icon]) => <Link key={href as string} href={href as string} onClick={() => setDrawer(false)} aria-label={label as string} title={label as string} className={classes('nav-item', path === href && 'active')} data-testid={`nav-${String(label).toLowerCase().replaceAll(' ', '-')}`}><Icon size={18}/><span>{label as string}</span>{href === '/daily-collection' && d.dashboard?.lateCount ? <em>{d.dashboard.lateCount}</em> : null}</Link>)}</div>)}</nav>
    <div className="sidebar-bottom"><div className="sync-card" title={d.queuedPayments.length ? `${d.queuedPayments.length} payment${d.queuedPayments.length === 1 ? '' : 's'} waiting to sync` : online ? 'All changes synced' : 'You are offline'}><span className={classes('sync-dot', d.queuedPayments.length > 0 && 'sync-pending')}/><div><b>{d.queuedPayments.length ? `${d.queuedPayments.length} payment${d.queuedPayments.length === 1 ? '' : 's'} waiting to sync` : online ? 'All changes synced' : 'You are offline'}</b><small>{d.queuedPayments.length ? 'Saved on this device' : online ? 'Updated just now' : 'Changes will sync when connected'}</small></div>{d.queuedPayments.length ? <RefreshCw size={15}/> : <Check size={15}/>}</div><Link href="/settings" aria-label="Preferences" title="Preferences" className={classes('nav-item', path === '/settings' && 'active')} data-testid="nav-settings"><Settings size={18}/><span>Preferences</span></Link><div className="user-mini" title={`Agnes M. · ${d.role} workspace`}><span className="avatar">AM</span><div><b>Agnes M.</b><small>{d.role} workspace</small></div><MoreHorizontal size={18}/></div></div>
  </aside>;
   return <div className="app-shell"><div className={classes('shell-layout', sidebarCollapsed && 'sidebar-is-collapsed')}>{sidebar}{drawer && <button className="scrim" onClick={() => setDrawer(false)} aria-label="Close menu"/>}<main className="main-area">
     <div className="collection-progress-track" role="img" aria-label={`Today's collection progress: ${collectionProgress}%`}><span style={{ width: `${collectionProgress}%`, backgroundColor: `hsl(${8 + collectionProgress * 1.25} 42% 46%)` }}/></div>
    <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu size={20}/></button><div className="crumb"><span>Workspace</span><span>/</span><b>{title}</b></div><div className="top-actions"><span className={classes('connection', !online && 'connection-offline')}><span/>{online ? 'Online' : 'Offline'}</span><button className="icon-button" aria-label="Refresh workspace" onClick={d.refresh} data-testid="button-refresh"><RefreshCw size={17}/></button><Link href="/notifications" className="icon-button notify-button" aria-label="Notifications"><Bell size={18}/><i/></Link><span className="top-divider"/><button className="profile-button" onClick={() => setLocation('/settings')} data-testid="button-profile"><span className="avatar small-avatar">AM</span><span>Agnes M.</span><ChevronDown size={14}/></button></div></header>
    <div className="content-area"><div className="page-heading"><div><div className="eyebrow">{title === 'Overview' ? `${d.role.toUpperCase()} WORKSPACE · UGANDA` : 'RENTWISE · UGANDA'}</div><h1>{title}</h1>{title === 'Overview' && <p className="heading-sub">{d.role === 'Caretaker' ? 'A practical view of today’s collection and the homes in your care.' : d.role === 'Tenant' ? 'A simple, clear record of home, rent and care.' : 'A clearer view of home, and everything that keeps it running.'}</p>}</div>{path === '/dashboard' && <Link href={d.role === 'Tenant' ? '/tenant' : '/daily-collection'} className="button button-primary" data-testid="button-collect-rent">{d.role === 'Tenant' ? <UserRound size={17} /> : <Plus size={17} />}{d.role === 'Tenant' ? 'Open tenant space' : 'Record payment'}</Link>}</div>
       {!online && <div className="offline-banner" role="status"><WifiOff size={16}/><span>You’re offline. Saved records remain available; new payments wait on this device until you reconnect.</span></div>}
      {d.errors && <div className="inline-alert" role="alert"><WifiOff size={18}/><span>Some records could not be reached. Your saved workspace is unchanged.</span><button onClick={d.refresh}>Try again</button></div>}
      {d.loading && <div className="loading-strip"><span/><span/><span/> Loading your ledger…</div>}
       <div className="page-enter">{d.role === 'Tenant' && !['/tenant', '/settings'].includes(path) ? <TenantPortalPage/> : <Switch>
        <Route path="/dashboard" component={DashboardPage}/><Route path="/properties" component={PropertiesPage}/><Route path="/daily-collection" component={DailyCollectionPage}/>
        <Route path="/payments" component={PaymentsPage}/><Route path="/tenants" component={TenantsPage}/><Route path="/repairs" component={RepairsPage}/>
        <Route path="/agreements" component={AgreementsPage}/><Route path="/analytics" component={AnalyticsPage}/><Route path="/notifications" component={NotificationsPage}/>
         <Route path="/tenant" component={TenantPortalPage}/><Route path="/receipt/:id" component={ReceiptPage}/><Route path="/settings" component={() => <SettingsPage theme={theme} setTheme={setTheme}/>}/>
        <Route component={NotFoundPage}/>
       </Switch>}</div>
      <footer className="footer"><span>Rentwise <i>·</i> A reliable record, for everyone under one roof.</span><span>UGX <i>·</i> Kampala, Uganda</span></footer>
    </div>
   </main></div><GuidedTour role={d.role} loading={d.loading} /></div>;
}

function GuidedTour({ role, loading }: { role: Role; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (loading || localStorage.getItem(`rentwise-tour-${role.toLowerCase()}`)) return;
    const timer = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, [loading, role]);
  useEffect(() => {
    const replay = () => { setStep(0); setOpen(true); };
    window.addEventListener('rentwise:open-tour', replay);
    return () => window.removeEventListener('rentwise:open-tour', replay);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const caretaker = role === 'Caretaker';
  const cards = caretaker
    ? [
        { title: 'Record rent in 30 seconds', text: 'Start with the unpaid list so you know who needs a follow-up.' },
        { title: 'Choose the home', text: 'Recent units stay easy to find. The expected balance appears when you select a unit.' },
        { title: 'Add the payment details', text: 'Choose MTN MoMo, Airtel Money, cash or bank, then add a reference when you have one.' },
        { title: 'Confirm and share', text: 'A receipt appears right away. If the signal drops, the entry waits on this device to sync.' },
      ]
    : [
        { title: 'Welcome to your rental ledger', text: role === 'Landlord' ? 'See collections, property needs and verified records in one overview.' : 'Your home, current rent and repair updates are gathered in one private view.' },
        { title: 'Find a home or its records', text: 'Use the property map, status filters and unit details to find the next thing to review.' },
        { title: 'Keep every change visible', text: 'Payments, repairs and agreements appear in a timeline with a recorder and date.' },
        { title: 'Choose how you work', text: 'Preferences include language, appearance and notification reminders. These demo settings stay on this device.' },
      ];
  const finish = () => {
    localStorage.setItem(`rentwise-tour-${role.toLowerCase()}`, 'done');
    setOpen(false);
  };
  if (!open) return null;
  const card = cards[step];
  return <div className="tour-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) finish(); }}>
    <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-copy" data-testid="guided-tour">
      <div className="tour-topline"><span className="tour-mark"><House size={19}/></span><span>{caretaker ? '30-SECOND WALKTHROUGH' : `${role.toUpperCase()} · QUICK TOUR`}</span><button className="icon-button" onClick={finish} aria-label="Skip tour"><X size={18}/></button></div>
      <div className="tour-progress" aria-label={`Tour card ${step + 1} of ${cards.length}`}>{cards.map((_, index) => <i key={index} className={index <= step ? 'complete' : ''}/>)}</div>
      <p className="eyebrow">A QUICK INTRODUCTION</p>
      <h2 id="tour-title">{card.title}</h2><p id="tour-copy">{card.text}</p>
      <div className="tour-actions"><button className="button button-quiet" onClick={finish} data-testid="button-skip-tour">Skip tour</button><div>{step > 0 && <button className="button button-quiet" onClick={() => setStep(index => index - 1)}>Back</button>}<button className="button button-primary" onClick={() => step === cards.length - 1 ? finish() : setStep(index => index + 1)} data-testid="button-tour-next">{step === cards.length - 1 ? 'Finish' : 'Next'} <ArrowUpRight size={15}/></button></div></div>
    </section>
  </div>;
}

function Metric({ label, value, note, icon: Icon, tone = 'green' }: { label: string; value: string; note: string; icon: typeof Wallet; tone?: string }) {
  const parsed = value.match(/^([^\d]*)([\d,.]+)(.*)$/);
  const prefix = parsed?.[1] || '';
  const target = parsed ? Number(parsed[2].replaceAll(',', '')) : 0;
  const suffix = parsed?.[3] || '';
  const decimals = parsed?.[2].includes('.') ? 1 : 0;
  const format = (number: number) => `${prefix}${number.toLocaleString('en-UG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  const [displayValue, setDisplayValue] = useState(() => parsed ? format(0) : value);
  useEffect(() => {
    if (!parsed || !Number.isFinite(target) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }
    const start = performance.now();
    const duration = 520;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(format(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <div className="metric-card" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17}/></span></div><strong>{displayValue}</strong><small>{note}</small></div>;
}
function Panel({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-head"><h2>{title}</h2>{action}</div>{children}</section>;
}
function Status({ value }: { value: string }) { return <span className={`status-pill status-${value.replaceAll('_', '-')}`}><i/>{statusLabel(value)}</span>; }
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><span className="empty-icon"><ClipboardList size={22}/></span><b>{title}</b><p>{text}</p>{action}</div>; }
function DataState({ rows, children, title = 'No records yet', text = 'When new activity is recorded, it will appear here.' }: { rows?: unknown[]; children: ReactNode; title?: string; text?: string }) {
  if (rows && rows.length === 0) return <Empty title={title} text={text}/>;
  return <>{children}</>;
}
function DashboardPage() {
  const d = useData(); const s = d.dashboard; const activities = d.activity || s?.activity || []; const [, setLocation] = useLocation();
  return <div className="dashboard-grid">
     <div className="metrics-grid"><Metric label="Collected this month" value={compact(s?.totalCollected)} note="Across all active properties" icon={Wallet}/><Metric label="Outstanding" value={compact(s?.outstanding)} note={`${s?.lateCount || 0} units need a follow-up`} icon={Clock3} tone="amber"/><Metric label="Occupancy" value={`${s?.occupiedUnits ?? 0} / ${s?.totalUnits ?? 0}`} note={`${s?.totalUnits ? Math.round((s.occupiedUnits / s.totalUnits) * 100) : 0}% of homes occupied`} icon={Building2} tone="blue"/><Metric label="Paid today" value={`${s?.paidToday ?? 0} payment${s?.paidToday === 1 ? '' : 's'}`} note="Verified entries today" icon={CheckCircle2} tone="green"/></div>
    <section className="collection-hero"><div className="hero-copy"><div className="hero-label"><ShieldCheck size={15}/> THE LEDGER IS IN GOOD ORDER</div><h2>Trust, built one<br/><em>record at a time.</em></h2><p>Rent recorded clearly. Agreements kept close. Repairs never forgotten.</p><Link href="/daily-collection" className="button button-cream">Go to daily collection <ArrowUpRight size={16}/></Link></div><div className="trust-seal"><div className="seal-ring"><ShieldCheck size={29}/><strong>{s?.trustPercent ?? 98}%</strong><small>RECORD<br/>CONFIDENCE</small></div><div className="seal-caption">Verified records<br/>this month</div></div><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/></section>
    <Panel title="Units at a glance" action={<Link href="/properties" className="text-link">View all <ArrowUpRight size={14}/></Link>} className="units-panel"><div className="unit-grid">{(s?.units || d.units || []).slice(0, 8).map(u => <UnitTile key={u.id} unit={u}/>)}</div>{!(s?.units || d.units)?.length && <Empty title="No units to show" text="Add a property and its units to see the monthly picture here." action={<Link className="text-link" href="/properties">Add a property</Link>}/>}</Panel>
     <Panel title="Needs your attention" className="attention-panel"><div className="attention-list">{(s?.attention || []).slice(0, 4).map((item, i) => <div key={`${item}-${i}`} className="attention-item"><span className={i === 0 ? 'attention-mark warn' : 'attention-mark'}>{i === 0 ? '!' : <ArrowUpRight size={14}/>}</span><span>{item}</span><button onClick={() => setLocation(i === 0 ? '/daily-collection' : '/repairs')} aria-label={`Review ${item}`}><ArrowUpRight size={15}/></button></div>)}{!(s?.attention || []).length && <div className="calm-empty"><CheckCircle2 size={18}/>Nothing needs attention right now.</div>}</div><Link href="/daily-collection" className="panel-foot-link">Review collection <ArrowUpRight size={14}/></Link></Panel>
    <Panel title="Recent activity" action={<Link href="/notifications" className="text-link">See activity <ArrowUpRight size={14}/></Link>} className="activity-panel"><DataState rows={activities}><div className="activity-list">{activities.slice(0, 5).map(a => <ActivityRow key={a.id} item={a}/>)}</div></DataState></Panel>
    <div className="mobile-money-note"><Smartphone size={17}/><span><b>Mobile money, made clear.</b> MTN MoMo and Airtel Money entries are recorded alongside every receipt.</span><Link href="/payments">View ledger</Link></div>
  </div>;
}
function UnitTile({ unit }: { unit: Unit }) {
  return <Link href="/properties" className={`unit-tile unit-${unit.status}`} data-testid={`unit-tile-${unit.id}`}><span>{unit.unitNumber}</span><i/><small>{unit.tenantName || statusLabel(unit.status)}</small><b>{unit.balance > 0 ? fmt(unit.balance) : fmt(unit.rentAmount)}</b></Link>;
}
function ActivityRow({ item }: { item: Activity }) {
  return <div className="activity-row"><span className={`activity-symbol activity-${item.type}`}><ActivityIcon size={16}/></span><div className="activity-content"><b>{item.title}</b><span>{item.detail}</span></div><time>{dateFmt(item.occurredAt)}</time></div>;
}
function PropertiesPage() {
  const d = useData(); const [mode, setMode] = useState<'plan' | 'list'>('plan'); const [open, setOpen] = useState(false); const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null); const [unitSearch, setUnitSearch] = useState(''); const [statusFilter, setStatusFilter] = useState('all');
  const [propertyId, setPropertyId] = useState<number | ''>(''); const [unitNo, setUnitNo] = useState(''); const [beds, setBeds] = useState('1'); const [rent, setRent] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null); const [dragTenantId, setDragTenantId] = useState<number | null>(null); const [hoveredUnitId, setHoveredUnitId] = useState<number | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<{ tenantId: number; unit: Unit } | null>(null);
  const activeTenantId = dragTenantId ?? selectedTenantId;
  const addUnit = (e: FormEvent) => { e.preventDefault(); const id = Number(propertyId || d.properties?.[0]?.id); if (!id) return; d.createUnit.mutate({ data: { propertyId: id, unitNumber: unitNo, bedrooms: Number(beds), rentAmount: Number(rent) } }, { onSuccess: () => { d.notify(`Unit ${unitNo} added`); setAddingUnit(false); setUnitNo(''); setRent(''); }, onError: () => d.notify('Could not add unit. Please try again.') }); };
  const saveAssignment = (tenantId: number, unit: Unit) => {
    d.updateUnit.mutate({ id: unit.id, data: { tenantId } }, {
      onSuccess: () => { d.notify(`Tenant assigned to unit ${unit.unitNumber}`); setSelectedTenantId(null); setPendingAssignment(null); },
      onError: () => { d.notify('The assignment could not be saved. No tenant was moved.'); setPendingAssignment(null); },
    });
  };
  const chooseUnitTarget = (unit: Unit, tenantId = activeTenantId) => {
    if (tenantId == null) { setSelectedUnit(unit); return; }
    if (unit.status === 'repair') { d.notify('A home under repair cannot be assigned.'); return; }
    if (unit.tenantId === tenantId) { d.notify('This tenant already lives in that unit.'); setSelectedTenantId(null); return; }
    if (unit.tenantId != null) { setPendingAssignment({ tenantId, unit }); return; }
    saveAssignment(tenantId, unit);
  };
  return <div className="page-stack"><div className="toolbar"><div className="toolbar-meta"><b>{d.properties?.length ?? 0} properties</b><span>·</span><span>{d.units?.length ?? 0} units tracked</span></div><div className="toolbar-right"><div className="segmented"><button className={mode === 'plan' ? 'selected' : ''} onClick={() => setMode('plan')} aria-pressed={mode === 'plan'} data-testid="toggle-floorplan"><LayoutDashboard size={15}/>Floor plan</button><button className={mode === 'list' ? 'selected' : ''} onClick={() => setMode('list')} aria-pressed={mode === 'list'} data-testid="toggle-list"><List size={16}/>List</button></div><button className="button button-primary" onClick={() => setOpen(true)} data-testid="button-add-property"><Plus size={16}/>Add property</button></div></div>
      {mode === 'plan' && !!d.tenants?.length && <section className="assignment-tray" aria-label="Tenant assignment">
        <div><b>Assign a tenant</b><small>Drag a name onto a unit, or tap a name and then a home.</small></div>
        <div className="assignment-people">{d.tenants.map(tenant => <button key={tenant.id} type="button" draggable onDragStart={event => { event.dataTransfer.setData('text/plain', String(tenant.id)); event.dataTransfer.effectAllowed = 'move'; setDragTenantId(tenant.id); }} onDragEnd={() => { setDragTenantId(null); setHoveredUnitId(null); }} onClick={() => setSelectedTenantId(current => current === tenant.id ? null : tenant.id)} className={classes('assignment-person', selectedTenantId === tenant.id && 'selected')} aria-pressed={selectedTenantId === tenant.id} data-testid={`assign-tenant-${tenant.id}`}><span className="tenant-avatar">{initials(tenant.fullName)}</span><span><b>{tenant.fullName}</b><small>{tenant.unitNumber ? `Unit ${tenant.unitNumber}` : 'Unassigned'}</small></span></button>)}</div>
        {selectedTenantId != null && <button className="button button-quiet assignment-cancel" onClick={() => setSelectedTenantId(null)}>Cancel assignment</button>}
      </section>}
     {mode === 'plan' && <div className="toolbar map-filter"><label className="filter-search"><Search size={16}/><input aria-label="Search units or tenants" placeholder="Search unit or tenant" value={unitSearch} onChange={e => setUnitSearch(e.target.value)} data-testid="search-units"/></label><select aria-label="Filter units by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="filter-unit-status"><option value="all">All unit states</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="late">Late</option><option value="vacant">Vacant</option><option value="repair">Under repair</option></select></div>}
    <DataState rows={d.properties} title="Your first property starts here" text="Create a property, then add units and keep every rent record in one place.">
        {mode === 'plan' ? <div className="property-plan-grid">{d.properties?.map((p, idx) => <section className="property-plan panel" key={p.id}><div className="property-plan-head"><div className={`building-icon building-${idx % 3}`}><Building2 size={20}/></div><div><h2>{p.name}</h2><span><MapPin size={13}/>{p.address}</span></div><button className="icon-button" aria-label={`More options for ${p.name}`}><MoreHorizontal size={18}/></button></div><p className="property-description">{p.description || 'Homes, managed with care.'}</p><div className="floorplan" data-testid={`floorplan-${p.id}`}><div className="floorplan-label">UNIT MAP <span>{activeTenantId != null ? 'Choose a home to assign' : 'Tap a home to review'}</span></div><div className="floorplan-units">{(d.units || []).filter(u => u.propertyId === p.id && (statusFilter === 'all' || u.status === statusFilter) && `${u.unitNumber} ${u.tenantName || ''}`.toLowerCase().includes(unitSearch.toLowerCase())).map(unit => <button key={unit.id} onClick={() => chooseUnitTarget(unit)} onDragOver={event => { event.preventDefault(); setHoveredUnitId(unit.id); event.dataTransfer.dropEffect = unit.status === 'repair' ? 'none' : 'move'; }} onDragLeave={() => setHoveredUnitId(current => current === unit.id ? null : current)} onDrop={event => { event.preventDefault(); const tenantId = Number(event.dataTransfer.getData('text/plain')) || dragTenantId; setHoveredUnitId(null); if (tenantId) chooseUnitTarget(unit, tenantId); }} className={classes('floor-unit', `floor-${unit.status}`, activeTenantId != null && hoveredUnitId === unit.id && 'assignment-hover', activeTenantId != null && unit.status === 'repair' && 'assignment-invalid')} aria-label={`Unit ${unit.unitNumber}, ${statusLabel(unit.status)}${activeTenantId != null ? '. Assign selected tenant here' : '. View details'}`} data-testid={`floor-unit-${unit.id}`}><span>{unit.unitNumber}</span><small>{unit.bedrooms} bed</small><i>{unit.status === 'paid' ? <Check size={12}/> : unit.status === 'late' ? 'Due' : statusLabel(unit.status)}</i>{activeTenantId != null && hoveredUnitId === unit.id && <em>{unit.status === 'repair' ? 'Not Allowed' : unit.tenantId != null && unit.tenantId !== activeTenantId ? 'Move · confirm' : 'Drop to Assign'}</em>}</button>)}</div><div className="floor-legend" aria-label="Unit status legend"><span><i className="paid-dot"/>Paid</span><span><i className="pending-dot"/>Pending</span><span><i className="late-dot"/>Late</span><span><i className="vacant-dot"/>Vacant</span><span><i className="repair-dot"/>Under repair</span></div></div><div className="property-foot"><span><b>{p.unitCount}</b> total units</span><button className="text-link" onClick={() => { setPropertyId(p.id); setAddingUnit(true); }}>Add unit <Plus size={14}/></button></div></section>)}</div> : <div className="panel table-panel"><table><thead><tr><th>Property</th><th>Address</th><th>Units</th><th>Occupancy</th><th>Actions</th></tr></thead><tbody>{d.properties?.map(p => { const units = (d.units || []).filter(u => u.propertyId === p.id); return <tr key={p.id}><td><b>{p.name}</b><small>{p.description}</small></td><td>{p.address}</td><td>{p.unitCount}</td><td>{units.filter(u => u.tenantId).length} occupied</td><td><button className="text-link" onClick={() => { setPropertyId(p.id); setAddingUnit(true); }}>Add unit <Plus size={14}/></button></td></tr>; })}</tbody></table></div>}
    </DataState>
    <PropertyWizardModal open={open} close={() => setOpen(false)}/>
    <Modal open={addingUnit} title="Add a unit" close={() => setAddingUnit(false)}><form onSubmit={addUnit} className="form-stack"><Field label="Property"><select value={propertyId || d.properties?.[0]?.id || ''} onChange={e => setPropertyId(Number(e.target.value))}>{d.properties?.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></Field><Field label="Unit number"><input required value={unitNo} onChange={e => setUnitNo(e.target.value)} placeholder="B-04"/></Field><div className="form-row"><Field label="Bedrooms"><input type="number" min="0" value={beds} onChange={e => setBeds(e.target.value)}/></Field><Field label="Monthly rent (UGX)"><input type="number" min="0" required value={rent} onChange={e => setRent(e.target.value)}/></Field></div><ModalActions close={() => setAddingUnit(false)} busy={d.createUnit.isPending}/></form></Modal>
      <Modal open={!!pendingAssignment} title="Move tenant to this home?" close={() => setPendingAssignment(null)}>{pendingAssignment && <div className="confirm-assignment"><p><b>{d.tenants?.find(tenant => tenant.id === pendingAssignment.tenantId)?.fullName}</b> will be assigned to unit {pendingAssignment.unit.unitNumber}.</p><p>{pendingAssignment.unit.tenantName ? `${pendingAssignment.unit.tenantName} will become unassigned from this unit.` : 'Their current unit will be marked vacant.'} This changes the demo ledger immediately.</p><div className="modal-actions"><button className="button button-quiet" onClick={() => setPendingAssignment(null)}>Cancel</button><button className="button button-primary" disabled={d.updateUnit.isPending} onClick={() => saveAssignment(pendingAssignment.tenantId, pendingAssignment.unit)}>{d.updateUnit.isPending ? <LoaderCircle size={15} className="spin"/> : <Check size={15}/>}Confirm move</button></div></div>}</Modal>
    <UnitDrawer unit={selectedUnit} onClose={() => setSelectedUnit(null)}/>
  </div>;
}
type PropertyDraft = {
  step: number; propertyName: string; address: string; description: string; unitNumber: string;
  bedrooms: string; rentAmount: string; tenantName: string; phone: string; startDate: string;
  endDate: string; deposit: string; propertyId?: number; unitId?: number;
};
const emptyPropertyDraft: PropertyDraft = {
  step: 0, propertyName: '', address: '', description: '', unitNumber: '', bedrooms: '1',
  rentAmount: '', tenantName: '', phone: '', startDate: '', endDate: '', deposit: '',
};
function PropertyWizardModal({ open, close }: { open: boolean; close: () => void }) {
  const d = useData();
  const [draft, setDraft] = useState<PropertyDraft>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rentwise-property-draft') || 'null') as PropertyDraft | null;
      return saved ? { ...emptyPropertyDraft, ...saved } : emptyPropertyDraft;
    } catch { return emptyPropertyDraft; }
  });
  useEffect(() => { localStorage.setItem('rentwise-property-draft', JSON.stringify(draft)); }, [draft]);
  const update = (key: keyof PropertyDraft, value: string | number) => setDraft(current => ({ ...current, [key]: value }));
  const reset = () => { localStorage.removeItem('rentwise-property-draft'); setDraft(emptyPropertyDraft); close(); };
  const saveStep = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (draft.step === 0) {
        const property = await d.createProperty.mutateAsync({ data: { name: draft.propertyName, address: draft.address, description: draft.description } });
        setDraft(current => ({ ...current, propertyId: property.id, step: 1 }));
        d.notify('Property saved. Continue with its units.');
      } else if (draft.step === 1) {
        if (!draft.propertyId) throw new Error('Save the property before adding a unit.');
        const unit = await d.createUnit.mutateAsync({ data: { propertyId: draft.propertyId, unitNumber: draft.unitNumber, bedrooms: Number(draft.bedrooms), rentAmount: Number(draft.rentAmount) } });
        setDraft(current => ({ ...current, unitId: unit.id, step: 2 }));
        d.notify(`Unit ${unit.unitNumber} saved`);
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
          await d.createTenant.mutateAsync({ data: {
            fullName: draft.tenantName,
            phone: draft.phone,
            unitId: draft.unitId,
            monthlyRent: Number(draft.rentAmount),
            deposit: Number(draft.deposit || 0),
            ...(draft.startDate ? { agreementStart: draft.startDate } : {}),
            ...(draft.endDate ? { agreementEnd: draft.endDate } : {}),
          } });
        }
        d.notify('Property setup is complete');
        reset();
      }
    } catch (error) {
      d.notify(error instanceof Error ? error.message : 'Could not save this step. Your draft is still on this device.');
    }
  };
  const steps = ['Property', 'Units', 'Tenants', 'Agreements', 'Review'];
  const busy = d.createProperty.isPending || d.createUnit.isPending || d.createTenant.isPending;
  return <Modal open={open} title="Set up a property" close={close}>
    <div className="wizard-progress" aria-label={`Step ${draft.step + 1} of ${steps.length}`}>
      {steps.map((label, index) => <div className={classes('wizard-progress-step', index < draft.step && 'done', index === draft.step && 'current')} key={label}><i>{index < draft.step ? <Check size={12}/> : index + 1}</i><span>{label}</span></div>)}
    </div>
    <form onSubmit={saveStep} className="form-stack wizard-step" key={draft.step}>
      {draft.step === 0 && <><p className="wizard-intro">Start with the details people use to identify this home.</p><Field label="Property name"><input required value={draft.propertyName} onChange={e => update('propertyName', e.target.value)} placeholder="e.g. Kintu Court" data-testid="input-property-name"/></Field><Field label="Address"><input required value={draft.address} onChange={e => update('address', e.target.value)} placeholder="Area, Kampala" data-testid="input-property-address"/></Field><Field label="Description"><textarea value={draft.description} onChange={e => update('description', e.target.value)} placeholder="A note about the property" data-testid="input-property-description"/></Field></>}
      {draft.step === 1 && <><p className="wizard-intro">Add the first unit and its monthly rent. You can add more from the property map later.</p><Field label="Unit number"><input required value={draft.unitNumber} onChange={e => update('unitNumber', e.target.value)} placeholder="A1"/></Field><div className="form-row"><Field label="Bedrooms"><input type="number" min="0" value={draft.bedrooms} onChange={e => update('bedrooms', e.target.value)}/></Field><Field label="Monthly rent (UGX)"><input type="number" min="1" required value={draft.rentAmount} onChange={e => update('rentAmount', e.target.value)}/></Field></div></>}
      {draft.step === 2 && <><p className="wizard-intro">Add a tenant now, or leave these fields blank and assign someone later.</p><Field label="Tenant name (optional)"><input value={draft.tenantName} onChange={e => update('tenantName', e.target.value)} placeholder="Full name"/></Field><Field label="Phone number (optional)"><input type="tel" value={draft.phone} onChange={e => update('phone', e.target.value)} placeholder="+256 7…"/></Field></>}
      {draft.step === 3 && <><p className="wizard-intro">Keep the agreement dates and deposit beside the rent record.</p><div className="form-row"><Field label="Agreement starts"><input type="date" value={draft.startDate} onChange={e => update('startDate', e.target.value)}/></Field><Field label="Agreement ends"><input type="date" value={draft.endDate} onChange={e => update('endDate', e.target.value)}/></Field></div><Field label="Security deposit (UGX)"><input type="number" min="0" value={draft.deposit} onChange={e => update('deposit', e.target.value)}/></Field><p className="wizard-hint">Dates and deposit are saved when you finish this setup.</p></>}
      {draft.step === 4 && <><p className="wizard-intro">Check the details before finishing.</p><div className="wizard-review"><div><span>Property</span><b>{draft.propertyName || '—'}</b><small>{draft.address}</small></div><div><span>First unit</span><b>{draft.unitNumber || '—'} · {draft.bedrooms} bedroom</b><small>{draft.rentAmount ? fmt(Number(draft.rentAmount)) : 'Rent not set'} / month</small></div><div><span>Tenant</span><b>{draft.tenantName || 'Add later'}</b><small>{draft.phone || 'No phone added'}</small></div><div><span>Agreement</span><b>{draft.startDate && draft.endDate ? `${dateFmt(draft.startDate)} — ${dateFmt(draft.endDate)}` : 'Add dates later'}</b><small>Deposit {fmt(Number(draft.deposit || 0))}</small></div></div></>}
      <div className="wizard-footer"><span>Draft autosaved on this device</span><div>{draft.step > 0 && <button type="button" className="button button-quiet" onClick={() => setDraft(current => ({ ...current, step: current.step - 1 }))}>Back</button>}<button type="submit" className="button button-primary" disabled={busy} data-testid="button-wizard-next">{busy ? <LoaderCircle size={15} className="spin"/> : draft.step === 4 ? <Check size={15}/> : <ArrowUpRight size={15}/>} {draft.step === 4 ? 'Finish setup' : 'Continue'}</button></div></div>
    </form>
  </Modal>;
}
function UnitDrawer({ unit, onClose }: { unit: Unit | null; onClose: () => void }) {
  const d = useData(); const [, setLocation] = useLocation(); const touchStartX = useRef<number | null>(null); const [phoneVisible, setPhoneVisible] = useState(false);
  useEffect(() => {
    if (!unit) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unit, onClose]);
  if (!unit) return null;
  const tenant = d.tenants?.find(t => t.id === unit.tenantId);
  const revealPhone = () => {
    if (phoneVisible) { setPhoneVisible(false); return; }
    if (!tenant) return;
    d.createContactReveal.mutate({ data: { tenantId: tenant.id, actorRole: d.role } }, {
      onSuccess: () => { setPhoneVisible(true); d.notify('Phone reveal recorded in activity'); },
      onError: () => d.notify('Could not record the reveal. The phone number remains hidden.'),
    });
  };
  const payments = (d.payments || []).filter(p => p.unitId === unit.id).slice(0, 5);
  const repairs = (d.repairs || []).filter(r => r.unitId === unit.id && r.status !== 'done');
  const timeline = (d.activity || []).filter(item => item.unitId === unit.id).slice(0, 6);
  return <div className="drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside className="unit-drawer" role="dialog" aria-modal="true" aria-labelledby="unit-drawer-title" onTouchStart={event => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => { const endX = event.changedTouches[0]?.clientX; if (touchStartX.current != null && endX != null && endX - touchStartX.current > 80) onClose(); touchStartX.current = null; }}>
    <div className="drawer-heading"><div><span className="eyebrow">UNIT RECORD</span><h2 id="unit-drawer-title">{unit.unitNumber}</h2><p>{d.properties?.find(p => p.id === unit.propertyId)?.name || 'Property'} · {unit.bedrooms} bedroom{unit.bedrooms === 1 ? '' : 's'}</p></div><button className="icon-button" aria-label="Close unit details" onClick={onClose}><X size={19}/></button></div>
    <div className="drawer-status-row"><Status value={unit.status}/><b>{fmt(unit.rentAmount)} <small>/ month</small></b></div>
    <section className="drawer-section"><div className="drawer-section-head"><h3>Tenant</h3>{tenant && <span className="privacy-check"><ShieldCheck size={14}/> Private</span>}</div>{tenant ? <div className="drawer-tenant"><span className="tenant-avatar">{initials(tenant.fullName)}</span><div><b>{tenant.fullName}</b><small>{phoneVisible ? tenant.phone : maskPhone(tenant.phone)}</small></div><button type="button" className="icon-button" aria-label={phoneVisible ? 'Hide tenant phone number' : 'Reveal tenant phone number'} disabled={d.createContactReveal.isPending} onClick={revealPhone}>{phoneVisible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div> : <p className="drawer-empty">This unit is currently vacant.</p>}</section>
    <section className="drawer-section"><div className="drawer-section-head"><h3>Recent payments</h3><Link href="/payments" className="text-link" onClick={onClose}>Ledger <ArrowUpRight size={13}/></Link></div>{payments.length ? <div className="drawer-list">{payments.map(payment => <div className="drawer-list-row" key={payment.id}><span><b>{fmt(payment.amount)}</b><small>{dateFmt(payment.recordedAt)} · {payment.method === 'mobile_money' ? 'Mobile money' : statusLabel(payment.method)}</small></span><Status value={payment.status}/></div>)}</div> : <p className="drawer-empty">No payments recorded yet.</p>}</section>
    <section className="drawer-section"><div className="drawer-section-head"><h3>Open repairs</h3><span className="count-bubble small-count">{repairs.length}</span></div>{repairs.length ? <div className="drawer-list">{repairs.map(repair => <div className="drawer-list-row" key={repair.id}><span><b>{repair.title}</b><small>{dateFmt(repair.reportedAt)}</small></span><Status value={repair.status}/></div>)}</div> : <p className="drawer-empty">No open repair requests.</p>}</section>
    <section className="drawer-section"><h3>Timeline ledger</h3>{timeline.length ? <div className="drawer-list">{timeline.map(item => <div className="drawer-timeline-row" key={item.id}><span className={`timeline-icon type-${item.type}`}><ActivityIcon size={14}/></span><span><b>{item.title}</b><small>{item.detail} · {dateFmt(item.occurredAt)}</small><small>Recorded by {item.actor}</small></span></div>)}</div> : <p className="drawer-empty">Unit activity will appear here.</p>}</section>
    <div className="drawer-quick-actions"><button className="button button-primary" disabled={!tenant} onClick={() => { onClose(); setLocation(`/daily-collection?unitId=${unit.id}`); }}><Wallet size={16}/>Record payment</button><button className="button button-quiet" onClick={() => { onClose(); setLocation(`/repairs?unitId=${unit.id}`); }}><Wrench size={16}/>Log repair</button></div>
  </aside></div>;
}
function DailyCollectionPage() {
  const d = useData(); const [unitId, setUnitId] = useState(() => new URLSearchParams(window.location.search).get('unitId') || ''); const [amount, setAmount] = useState(''); const [method, setMethod] = useState<'mobile_money' | 'cash' | 'bank'>('mobile_money'); const [reference, setReference] = useState(''); const [filter, setFilter] = useState(''); const [confirmed, setConfirmed] = useState<Payment | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<PaymentInput | null>(null);
  const today = new Date();
  const todayPayments = (d.payments || []).filter(payment => new Date(payment.recordedAt).toDateString() === today.toDateString());
  const collectedUnitIds = new Set(todayPayments.map(payment => payment.unitId));
  const dailyCollectedAmount = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const dailyUnitTotal = d.dashboard?.occupiedUnits ?? 0;
  const recentUnitIds = [...new Set((d.payments || []).map(payment => payment.unitId))];
  const collectionUnits = (d.units || []).filter(unit => unit.tenantId != null).sort((left, right) => {
    const leftRecent = recentUnitIds.indexOf(left.id); const rightRecent = recentUnitIds.indexOf(right.id);
    return (leftRecent < 0 ? Number.MAX_SAFE_INTEGER : leftRecent) - (rightRecent < 0 ? Number.MAX_SAFE_INTEGER : rightRecent);
  });
  const unpaid = (d.units || []).filter(u => u.tenantId != null && (u.balance > 0 || ['pending', 'late'].includes(u.status))).filter(u => `${u.unitNumber} ${u.tenantName || ''}`.toLowerCase().includes(filter.toLowerCase())).sort((a, b) => (a.status === 'late' ? 0 : 1) - (b.status === 'late' ? 0 : 1) || b.balance - a.balance);
  const chosen = d.units?.find(u => String(u.id) === unitId);
  useEffect(() => {
    if (!unitId || amount) return;
    const unit = d.units?.find(item => String(item.id) === unitId);
    if (unit) setAmount(String(unit.balance || unit.rentAmount));
  }, [unitId, d.units, amount]);
  const resetForm = () => { setAmount(''); setReference(''); setUnitId(''); };
  const savePayment = (data: PaymentInput, confirmDuplicate = false) => {
    const input = confirmDuplicate ? { ...data, confirmDuplicate: true } : data;
    if (!navigator.onLine) { d.queuePayment(input); setDuplicateNotice(null); resetForm(); return; }
    d.createPayment.mutate({ data: input }, {
      onSuccess: payment => { setConfirmed(payment); setDuplicateNotice(null); d.notify('Payment recorded. Receipt added to the ledger.'); void playReceiptChime(); resetForm(); },
      onError: error => {
        const message = error instanceof Error ? error.message : 'Payment could not be saved. Check your connection and retry.';
        if (/recorded recently|duplicate/i.test(message) && !confirmDuplicate) setDuplicateNotice(data);
        else d.notify(message);
      },
    });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!unitId) return;
    const data: PaymentInput = { unitId: Number(unitId), amount: Number(amount), method, recordedBy: 'Agnes M.', ...(reference ? { reference } : {}) };
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const previous = d.payments?.find(payment => payment.unitId === data.unitId && payment.amount === data.amount && Date.parse(payment.recordedAt) >= oneHourAgo);
    const queued = d.queuedPayments.some(item => item.data.unitId === data.unitId && item.data.amount === data.amount);
    if (previous || queued) { setDuplicateNotice(data); return; }
    savePayment(data);
  };
  return <><div className="collection-layout"><section className="collection-form-panel"><div className="form-intro"><span className="form-icon"><Wallet size={19}/></span><div><h2>Record a payment</h2><p>Make a clear record, right when rent is received.</p></div></div><form onSubmit={submit} className="form-stack"><Field label="Tenant or unit"><select required value={unitId} onChange={e => { setUnitId(e.target.value); const u = collectionUnits.find(x => String(x.id) === e.target.value); setAmount(u ? String(u.balance || u.rentAmount) : ''); }} data-testid="select-payment-unit"><option value="">Choose a unit…</option>{collectionUnits.map(u => <option key={u.id} value={u.id}>{u.unitNumber} · {u.tenantName || 'Tenant'}{u.balance ? ` · balance ${fmt(u.balance)}` : ''}</option>)}</select></Field><Field label="Amount received"><div className="input-money"><span>UGX</span><input type="number" inputMode="numeric" min="1" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" data-testid="input-payment-amount"/></div></Field>{chosen && <div className="selected-unit-note"><span>Monthly rent <b>{fmt(chosen.rentAmount)}</b></span>{chosen.balance > 0 && <span>Outstanding <b className="text-danger">{fmt(chosen.balance)}</b></span>}</div>}<Field label="Payment method"><div className="method-options">{(['mobile_money', 'cash', 'bank'] as const).map(m => <button type="button" key={m} onClick={() => setMethod(m)} className={classes('method-option', method === m && 'active')} aria-pressed={method === m} data-testid={`method-${m}`}><span className={`method-symbol ${m}`}>{m === 'mobile_money' ? <Smartphone size={17}/> : m === 'cash' ? <Wallet size={17}/> : <Building2 size={17}/>}</span><span>{m === 'mobile_money' ? 'Mobile money' : m === 'cash' ? 'Cash' : 'Bank'}</span>{method === m && <Check size={14}/>}</button>)}</div></Field>{method === 'mobile_money' && <div className="mobile-provider"><span className="provider-badge mtn">MTN</span><span className="provider-badge airtel">airtel</span><span>MTN MoMo or Airtel Money</span></div>}<Field label={method === 'mobile_money' ? 'Transaction reference (optional)' : 'Receipt / reference (optional)'}><input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. 9826 4017" data-testid="input-payment-reference"/></Field><button className="button button-primary full-button" disabled={d.createPayment.isPending} data-testid="button-submit-payment">{d.createPayment.isPending ? <LoaderCircle size={17} className="spin"/> : <Check size={17}/>}Confirm payment</button><p className="form-trust"><ShieldCheck size={14}/> A receipt is created as soon as this entry is saved.</p></form></section>
     <section className="unpaid-panel"><div className="running-balance" aria-live="polite"><div><span>TODAY’S COLLECTION</span><b>{collectedUnitIds.size} of {dailyUnitTotal} collected</b><small>{Math.max(0, dailyUnitTotal - collectedUnitIds.size)} occupied homes left to follow up</small></div><strong>{fmt(dailyCollectedAmount)}<small>so far today</small></strong></div><div className="unpaid-heading"><div><span className="eyebrow">COLLECTION FOLLOW-UP</span><h2>Still to collect</h2><p>Units with a balance or awaiting confirmation.</p></div><span className="count-bubble">{unpaid.length}</span></div><label className="search-field"><Search size={16}/><input aria-label="Search unpaid units" placeholder="Search unit or tenant" value={filter} onChange={e => setFilter(e.target.value)}/></label><div className="unpaid-list"><DataState rows={unpaid} title="A clear collection list" text="No outstanding unit balances. Nice work.">{unpaid.map(u => <div className="unpaid-row" key={u.id} data-testid={`unpaid-unit-${u.id}`}><span className={`unit-avatar ${u.status}`}>{u.unitNumber}</span><div className="unpaid-info"><b>{u.tenantName || 'Occupied unit'}</b><small>{u.unitNumber} · Monthly {fmt(u.rentAmount)}</small></div><div className="unpaid-amount"><b>{fmt(u.balance || u.rentAmount)}</b><Status value={u.status}/></div><button className="icon-button compact-icon" aria-label={`Record payment for ${u.unitNumber}`} onClick={() => { setUnitId(String(u.id)); setAmount(String(u.balance || u.rentAmount)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><ArrowDownLeft size={16}/></button></div>)}</DataState></div><div className="offline-note"><WifiOff size={15}/><span><b>{d.queuedPayments.length ? `${d.queuedPayments.length} payment${d.queuedPayments.length === 1 ? '' : 's'} saved for sync` : 'Connection-aware by design'}</b><br/>{d.queuedPayments.length ? 'Your entry is stored on this device until the connection returns.' : 'If the signal drops, a saved payment waits on this device and syncs when you reconnect.'}</span></div></section></div>
    {confirmed && <Modal open title="Payment recorded" close={() => setConfirmed(null)}><div className="receipt-confirmation"><div className="paid-stamp" aria-label="Payment paid">PAID</div><span className="eyebrow">RENTWISE RECEIPT</span><h3>{fmt(confirmed.amount)}</h3><p>Unit {confirmed.unitNumber} · {confirmed.tenantName}</p><div className="receipt-meta"><span>Recorded {dateFmt(confirmed.recordedAt)}</span><span>{confirmed.method === 'mobile_money' ? 'MTN / Airtel mobile money' : statusLabel(confirmed.method)}</span>{confirmed.reference && <span>Reference {confirmed.reference}</span>}</div><div className="receipt-actions"><button type="button" className="button button-quiet" onClick={() => window.print()}><ReceiptText size={15}/>Print</button><button type="button" className="button button-primary" onClick={async () => { const url = `${window.location.origin}${import.meta.env.BASE_URL}receipt/${confirmed.id}`; try { await navigator.clipboard.writeText(url); d.notify('Receipt link copied'); } catch { d.notify('Could not copy the receipt link on this device.'); } }}><ArrowUpRight size={15}/>Copy share link</button></div></div></Modal>}
     {duplicateNotice && <Modal open title="Possible duplicate payment" close={() => setDuplicateNotice(null)}><div className="duplicate-warning"><span className="attention-mark warn">!</span><p>A payment for this unit and amount was recorded in the last hour. Check the ledger or transaction reference before continuing.</p><div className="receipt-meta"><span>Unit {d.units?.find(unit => unit.id === duplicateNotice.unitId)?.unitNumber || '—'}</span><span>{fmt(duplicateNotice.amount)}</span><span>{duplicateNotice.reference ? `Reference ${duplicateNotice.reference}` : 'No reference entered'}</span></div><div className="modal-actions"><button className="button button-quiet" onClick={() => setDuplicateNotice(null)}>Review details</button><button className="button button-primary" disabled={d.createPayment.isPending} onClick={() => savePayment(duplicateNotice, true)}>Record anyway</button></div></div></Modal>}
  </>;
}
function PaymentsPage() {
  const d = useData(); const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [method, setMethod] = useState('all'); const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState('');
  const records = (d.payments || []).filter(p => `${p.tenantName} ${p.unitNumber} ${p.reference || ''}`.toLowerCase().includes(search.toLowerCase())).filter(p => status === 'all' || p.status === status).filter(p => method === 'all' || p.method === method).filter(p => (!fromDate || p.recordedAt.slice(0, 10) >= fromDate) && (!toDate || p.recordedAt.slice(0, 10) <= toDate));
  const exportCsv = () => { const lines = [['Date','Unit','Tenant','Amount (UGX)','Method','Status','Reference','Recorded by'], ...records.map(p => [p.recordedAt,p.unitNumber,p.tenantName,p.amount,p.method,p.status,p.reference || '',p.recordedBy])].map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'); const url = URL.createObjectURL(new Blob([lines], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'rentwise-payment-ledger.csv'; a.click(); URL.revokeObjectURL(url); d.notify('Payment ledger exported as CSV'); };
  const printLedger = () => { const cleanup = () => document.body.classList.remove('printing-ledger'); document.body.classList.add('printing-ledger'); window.addEventListener('afterprint', cleanup, { once: true }); window.print(); };
  return <div className="page-stack"><section className="ledger-summary"><div><span>LEDGER BALANCE</span><b>{fmt((d.payments || []).reduce((a, p) => a + p.amount, 0))}</b><small>Recorded payment total</small></div><div className="summary-side"><span className="summary-mark"><ShieldCheck size={19}/></span><span>Every entry has a timestamp<br/>and a responsible recorder.</span></div></section><div className="toolbar ledger-tools"><div className="filter-search"><Search size={17}/><input aria-label="Search payment ledger" placeholder="Search name, unit or reference" value={search} onChange={e => setSearch(e.target.value)} data-testid="search-payments"/></div><div className="toolbar-right date-filter"><label>From <input type="date" aria-label="Payments from date" value={fromDate} onChange={e => setFromDate(e.target.value)}/></label><label>To <input type="date" aria-label="Payments to date" min={fromDate || undefined} value={toDate} onChange={e => setToDate(e.target.value)}/></label></div><div className="toolbar-right"><select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status" data-testid="filter-payment-status"><option value="all">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option></select><select value={method} onChange={e => setMethod(e.target.value)} aria-label="Filter by method"><option value="all">All methods</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="bank">Bank</option></select><button className="button button-quiet" onClick={exportCsv} data-testid="button-export-csv"><Download size={16}/>Export CSV</button><button className="button button-quiet" onClick={printLedger} data-testid="button-print-ledger"><ReceiptText size={16}/>Print / PDF</button></div></div><div className="panel table-panel"><DataState rows={records} title="No matching payments" text={search ? 'Try a different name, unit or reference.' : 'Payments appear here after they are recorded.'}><div className="table-scroll"><table><thead><tr><th>Tenant & unit</th><th>Amount</th><th>Method</th><th>Recorded</th><th>By</th><th>Status</th><th>Reference</th></tr></thead><tbody>{records.map(p => <tr key={p.id} data-testid={`payment-row-${p.id}`}><td><div className="table-person"><span className="avatar mini">{initials(p.tenantName)}</span><span><b>{p.tenantName}</b><small>Unit {p.unitNumber}</small></span></div></td><td className="money-cell">{fmt(p.amount)}</td><td><span className="method-label"><Smartphone size={14}/>{p.method === 'mobile_money' ? 'MTN / Airtel' : p.method}</span></td><td>{dateFmt(p.recordedAt)}</td><td>{p.recordedBy}</td><td><Status value={p.status}/></td><td className="font-mono">{p.reference || '—'}</td></tr>)}</tbody></table></div></DataState><div className="table-footer">{records.length} records <span>·</span> UGX amounts</div></div></div>;
}
function TenantsPage() {
  const d = useData(); const [search, setSearch] = useState(''); const [revealed, setRevealed] = useState<number[]>([]); const [open, setOpen] = useState(false); const [profile, setProfile] = useState<Tenant | null>(null); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [unitId, setUnitId] = useState(''); const [rent, setRent] = useState('');
  const tenants = (d.tenants || []).filter(t => `${t.fullName} ${t.unitNumber || ''}`.toLowerCase().includes(search.toLowerCase()));
  const reveal = (id: number) => {
    if (revealed.includes(id)) { setRevealed(current => current.filter(item => item !== id)); return; }
    d.createContactReveal.mutate({ data: { tenantId: id, actorRole: d.role } }, {
      onSuccess: () => { setRevealed(current => [...current, id]); d.notify('Phone reveal recorded in activity'); },
      onError: () => d.notify('Could not record the reveal. The phone number remains hidden.'),
    });
  };
  const submit = (e: FormEvent) => { e.preventDefault(); d.createTenant.mutate({ data: { fullName: name, phone, unitId: unitId ? Number(unitId) : null, monthlyRent: rent ? Number(rent) : undefined } }, { onSuccess: () => { d.notify('Tenant profile created'); setOpen(false); setName(''); setPhone(''); setUnitId(''); }, onError: () => d.notify('Could not create tenant profile.') }); };
  return <div className="page-stack"><div className="toolbar"><div className="filter-search"><Search size={17}/><input placeholder="Find a tenant or unit" aria-label="Search tenants" value={search} onChange={e => setSearch(e.target.value)} data-testid="search-tenants"/></div><button className="button button-primary" onClick={() => setOpen(true)} data-testid="button-add-tenant"><Plus size={16}/>Add tenant</button></div><div className="tenant-grid"><DataState rows={tenants} title="No tenant profiles found" text="Add a tenant profile to connect people with their home.">{tenants.map((t, index) => <article className="tenant-card" key={t.id} style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }} data-testid={`tenant-card-${t.id}`}><div className="tenant-card-head"><span className="tenant-avatar">{initials(t.fullName)}</span><div><h2>{t.fullName}</h2><span>{t.unitNumber ? `Unit ${t.unitNumber}` : 'No unit assigned'}</span></div><button className="icon-button" aria-label={`Options for ${t.fullName}`}><MoreHorizontal size={18}/></button></div><div className="tenant-data-row"><span>Contact number</span><b className="masked-phone">{revealed.includes(t.id) ? t.phone : maskPhone(t.phone)}</b><button className="reveal-button" onClick={() => reveal(t.id)} aria-label={revealed.includes(t.id) ? 'Hide phone number' : 'Reveal phone number'} data-testid={`toggle-contact-${t.id}`}>{revealed.includes(t.id) ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div><div className="tenant-stat-row"><div><small>Outstanding</small><b className={t.balance > 0 ? 'text-danger' : ''}>{fmt(t.balance)}</b></div><div><small>Open requests</small><b>{t.openRequests}</b></div></div><div className="tenant-card-foot"><span>Agreement</span><b>{dateFmt(t.agreementStart)} <span>→</span> {dateFmt(t.agreementEnd)}</b></div><button className="tenant-profile-link" onClick={() => setProfile(t)} data-testid={`button-profile-${t.id}`}>View payment history & requests <ArrowUpRight size={14}/></button></article>)}</DataState></div><div className="privacy-note"><ShieldCheck size={16}/><span>Contact details are masked by default. Reveal only when needed; each reveal is recorded.</span></div>
    <Modal open={open} title="Add a tenant" close={() => setOpen(false)}><form onSubmit={submit} className="form-stack"><Field label="Full name"><input required value={name} onChange={e => setName(e.target.value)} placeholder="Tenant's name"/></Field><Field label="Phone number"><input required type="tel" minLength={7} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256 7…"/></Field><Field label="Assign a unit"><select value={unitId} onChange={e => setUnitId(e.target.value)}><option value="">No unit yet</option>{d.units?.filter(u => !u.tenantId).map(u => <option value={u.id} key={u.id}>{u.unitNumber} · {fmt(u.rentAmount)}</option>)}</select></Field><Field label="Monthly rent (UGX, optional)"><input type="number" min="0" value={rent} onChange={e => setRent(e.target.value)}/></Field><ModalActions close={() => setOpen(false)} busy={d.createTenant.isPending}/></form></Modal>
      <Modal open={!!profile} title={profile?.fullName || 'Tenant profile'} close={() => setProfile(null)}>{profile && (() => { const tenantUnit = d.units?.find(unit => unit.id === profile.unitId); const tenantPayments = (d.payments || []).filter(payment => payment.unitId === profile.unitId); const tenantRepairs = (d.repairs || []).filter(repair => repair.unitId === profile.unitId); const tenantAgreement = d.agreements?.find(item => item.tenantName === profile.fullName && item.unitNumber === profile.unitNumber); return <div className="tenant-profile-detail"><div className="drawer-tenant"><span className="tenant-avatar">{initials(profile.fullName)}</span><div><b>{profile.fullName}</b><small>{revealed.includes(profile.id) ? profile.phone : maskPhone(profile.phone)}</small></div><button className="icon-button" aria-label={revealed.includes(profile.id) ? 'Hide tenant phone number' : 'Reveal tenant phone number'} onClick={() => reveal(profile.id)}>{revealed.includes(profile.id) ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div><div className="profile-detail-grid"><div><span>Home</span><b>{tenantUnit?.unitNumber || 'Not assigned'}</b></div><div><span>Monthly rent</span><b>{fmt(tenantAgreement?.monthlyRent ?? tenantUnit?.rentAmount)}</b></div><div><span>Agreement starts</span><b>{dateFmt(profile.agreementStart)}</b></div><div><span>Agreement renews</span><b>{dateFmt(profile.agreementEnd)}</b></div></div><section><h3>Payment history</h3>{tenantPayments.length ? <div className="profile-ledger">{tenantPayments.map(payment => <div key={payment.id}><span><b>{fmt(payment.amount)}</b><small>{dateFmt(payment.recordedAt)} · {statusLabel(payment.method)}</small></span><Link className="text-link" href={`/receipt/${payment.id}`} onClick={() => setProfile(null)}>Receipt <ArrowUpRight size={13}/></Link></div>)}</div> : <p className="drawer-empty">No payments have been recorded.</p>}</section><section><h3>Repair requests</h3>{tenantRepairs.length ? <div className="profile-ledger">{tenantRepairs.map(repair => <div key={repair.id}><span><b>{repair.title}</b><small>{dateFmt(repair.reportedAt)}</small></span><Status value={repair.status}/></div>)}</div> : <p className="drawer-empty">No repair requests have been recorded.</p>}</section></div>; })()}</Modal>
  </div>;
}
function maskPhone(phone: string) { if (phone.length <= 4) return '••••••••'; return `${phone.slice(0, 4)} ••• •${phone.slice(-3)}`; }
function RepairsPage() {
  const d = useData(); const [open, setOpen] = useState(false); const [unitId, setUnitId] = useState(() => new URLSearchParams(window.location.search).get('unitId') || ''); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); d.createRepair.mutate({ data: { unitId: Number(unitId), title, description } }, { onSuccess: () => { d.notify('Repair request added to the workflow'); setOpen(false); setTitle(''); setDescription(''); }, onError: () => d.notify('Could not submit repair request.') }); };
  const nextStatus = (r: Repair) => r.status === 'reported' ? 'assigned' : r.status === 'assigned' ? 'in_progress' : 'done';
  const actLabel = (r: Repair) => r.status === 'reported' ? 'Assign' : r.status === 'assigned' ? 'Start work' : r.status === 'in_progress' ? 'Mark complete' : 'Completed';
  return <div className="page-stack"><div className="toolbar"><div className="toolbar-meta"><b>{d.repairs?.filter(r => r.status !== 'done').length ?? 0} open requests</b><span>·</span><span>Keep repairs moving, step by step</span></div><button className="button button-primary" onClick={() => setOpen(true)} data-testid="button-new-repair"><Plus size={16}/>Log a repair</button></div><div className="repair-columns">{(['reported','assigned','in_progress','done'] as const).map((status, idx) => <section className="repair-column" key={status}><div className="repair-column-head"><span className={`repair-step step-${idx}`}>{String(idx + 1).padStart(2, '0')}</span><h2>{statusLabel(status)}</h2><b>{d.repairs?.filter(r => r.status === status).length || 0}</b></div><DataState rows={(d.repairs || []).filter(r => r.status === status)} title="Nothing here yet" text="Requests move into this stage as work progresses."><div className="repair-stack">{(d.repairs || []).filter(r => r.status === status).map(r => <article className="repair-card" key={r.id} data-testid={`repair-card-${r.id}`}><div className="repair-card-top"><span className="repair-unit">UNIT {r.unitNumber}</span><Status value={r.status}/></div><h3>{r.title}</h3><p>{r.description}</p><div className="repair-by"><span className="avatar mini">{initials(r.tenantName)}</span><span>{r.tenantName}</span><time>{dateFmt(r.reportedAt)}</time></div>{r.cost != null && <div className="repair-cost"><span>Recorded cost</span><b>{fmt(r.cost)}</b></div>}<button className={classes('repair-action', status === 'done' && 'done')} disabled={status === 'done' || d.updateRepair.isPending} onClick={() => d.updateRepair.mutate({ id: r.id, data: { status: nextStatus(r) } }, { onSuccess: () => d.notify(`Repair moved to ${statusLabel(nextStatus(r))}`), onError: () => d.notify('Could not update repair status.') })} data-testid={`advance-repair-${r.id}`}>{status === 'done' ? <><Check size={14}/>Complete</> : <>{actLabel(r)} <ArrowUpRight size={14}/></>}</button></article>)}</div></DataState></section>)}</div>
    <Modal open={open} title="Log a repair" close={() => setOpen(false)}><form onSubmit={submit} className="form-stack"><Field label="Unit"><select required value={unitId} onChange={e => setUnitId(e.target.value)}><option value="">Choose a unit…</option>{d.units?.map(u => <option key={u.id} value={u.id}>{u.unitNumber} · {u.tenantName || 'Vacant'}</option>)}</select></Field><Field label="What needs attention?"><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Kitchen tap leaking"/></Field><Field label="Details"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what is happening…"/></Field><ModalActions close={() => setOpen(false)} busy={d.createRepair.isPending}/></form></Modal>
  </div>;
}
function AgreementsPage() {
  const d = useData(); const [search, setSearch] = useState(''); const signMutation = useSignAgreement(); const [signTarget, setSignTarget] = useState<Agreement | null>(null); const [signerName, setSignerName] = useState(''); const [signError, setSignError] = useState('');
  const items = (d.agreements || []).filter(a => `${a.tenantName} ${a.unitNumber}`.toLowerCase().includes(search.toLowerCase()));
  const submitSignature = (event: FormEvent) => {
    event.preventDefault();
    if (!signTarget) return;
    setSignError('');
    signMutation.mutate({ id: signTarget.id, data: { signerName: signerName.trim() } }, {
      onSuccess: () => { d.notify('Typed acknowledgement recorded with a timestamp'); setSignTarget(null); setSignerName(''); },
      onError: error => setSignError(error instanceof Error ? error.message : 'Could not record this acknowledgement.'),
    });
  };
  return <div className="page-stack"><div className="agreement-banner"><span><FileCheck2 size={20}/></span><div><b>Clear terms. A record everyone can return to.</b><p>Agreement dates and rent summaries at a glance.</p></div><div className="agreement-count"><b>{items.length}</b><small>AGREEMENTS</small></div></div><div className="toolbar"><div className="filter-search"><Search size={17}/><input placeholder="Search tenant or unit" aria-label="Search agreements" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="toolbar-meta"><ShieldCheck size={16}/> Agreement summaries</div></div><div className="agreement-grid"><DataState rows={items} title="No agreements found" text="Agreement summaries will appear here when available.">{items.map(a => {
    const remaining = daysUntil(a.endDate);
    const expiring = remaining != null && remaining >= 0 && remaining <= 60;
    const expired = remaining != null && remaining < 0;
    return <article className={classes('agreement-card', expiring && 'agreement-expiring', expired && 'agreement-expired')} key={a.id} data-testid={`agreement-${a.id}`}><div className="agreement-card-head"><span className="agreement-file"><FileCheck2 size={18}/></span><span className={a.signedAt ? 'signed-label' : 'unsigned-label'}>{a.signedAt ? 'Signed' : 'Awaiting signature'}</span><button className="icon-button" aria-label={`Options for ${a.tenantName}`}><MoreHorizontal size={18}/></button></div><span className="eyebrow">UNIT {a.unitNumber}</span><h2>{a.tenantName}</h2><div className="agreement-rent">{fmt(a.monthlyRent)}<small>/ month</small></div><div className="agreement-details"><div><span>Security deposit</span><b>{fmt(a.deposit)}</b></div><div><span>Agreement term</span><b>{dateFmt(a.startDate)} — {dateFmt(a.endDate)}</b></div><div><span>Next rent due</span><b className="due-date"><CalendarDays size={14}/>{dateFmt(a.nextDueDate)}</b></div></div>{remaining != null && (expiring || expired) && <p className={classes('agreement-expiry-note', expired && 'expired')}>{expired ? `Expired ${Math.abs(remaining)} days ago` : `Renewal due in ${remaining} days · within 60 days`}</p>}<div className="agreement-card-foot"><span>{a.signedAt ? `Signed ${dateFmt(a.signedAt)}` : 'Keep a signed copy on file'}</span>{!a.signedAt && <button className="text-link" onClick={() => { setSignTarget(a); setSignerName(''); setSignError(''); }} data-testid={`button-sign-agreement-${a.id}`}>Type signature <ArrowUpRight size={14}/></button>}</div></article>;
  })}</DataState></div>
    <Modal open={!!signTarget} title="Type a tenant signature" close={() => { setSignTarget(null); setSignError(''); }}><form className="form-stack" onSubmit={submitSignature}>{signTarget && <div className="signature-summary"><span>AGREEMENT · UNIT {signTarget.unitNumber}</span><b>{signTarget.tenantName}</b><small>{fmt(signTarget.monthlyRent)} / month · {dateFmt(signTarget.startDate)} — {dateFmt(signTarget.endDate)}</small></div>}<Field label="Tenant's full name"><input required minLength={2} value={signerName} onChange={event => setSignerName(event.target.value)} placeholder={signTarget?.tenantName || 'Type the tenant name'} autoComplete="name" data-testid="input-agreement-signature"/></Field><p className="signature-disclaimer">This demo records a typed name and timestamp. It does not verify identity or create a legally authenticated electronic signature.</p>{signError && <div className="inline-alert" role="alert">{signError}</div>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setSignTarget(null)}>Cancel</button><button type="submit" className="button button-primary" disabled={signMutation.isPending}>{signMutation.isPending ? <LoaderCircle size={15} className="spin"/> : <Check size={15}/>}Acknowledge agreement</button></div></form></Modal>
  </div>;
}
function smoothChartPaths(points: Analytics['points'], maximum: number, key: 'collected' | 'outstanding') {
  if (!points.length) return { line: '', area: '' };
  const samples = Array.from({ length: 12 }, (_, index) => {
    const position = points.length === 1 ? 0 : index / 11 * (points.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(points.length - 1, lower + 1);
    const amount = points[lower][key] + (points[upper][key] - points[lower][key]) * (position - lower);
    return { x: 32 + index * 536 / 11, y: 182 - amount / maximum * 146 };
  });
  const line = samples.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L 568 190 L 32 190 Z`;
  return { line, area };
}

function AnalyticsPage() {
  const d = useData();
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const q = useGetRentalAnalytics({ period }, { query: { queryKey: getGetRentalAnalyticsQueryKey({ period }) } });
  const a = q.data as Analytics | undefined;
  const points = a?.points || [];
  const maximum = Math.max(1, ...points.map(point => Math.max(point.collected, point.outstanding)));
  const collectedPaths = smoothChartPaths(points, maximum, 'collected');
  const outstandingPaths = smoothChartPaths(points, maximum, 'outstanding');
  const exportCsv = () => {
    const rows = [['Period', 'Collected (UGX)', 'Outstanding (UGX)'], ...points.map(point => [point.label, point.collected, point.outstanding])];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rentwise-${period}-analytics.csv`;
    link.click();
    URL.revokeObjectURL(url);
    d.notify('Analytics exported as CSV');
  };
  const xAt = (index: number) => points.length < 2 ? 300 : 32 + index * 536 / (points.length - 1);
  const yAt = (amount: number) => 182 - amount / maximum * 146;
  return <div className="page-stack">
    <div className="toolbar"><div className="toolbar-meta"><span>Collection performance</span><span>·</span><span>Values in UGX</span></div><div className="toolbar-right"><div className="segmented"><button onClick={() => { setPeriod('month'); setActivePoint(null); }} className={period === 'month' ? 'selected' : ''} aria-pressed={period === 'month'} data-testid="analytics-month">Monthly</button><button onClick={() => { setPeriod('year'); setActivePoint(null); }} className={period === 'year' ? 'selected' : ''} aria-pressed={period === 'year'} data-testid="analytics-year">Yearly</button></div><button className="button button-quiet" onClick={exportCsv} disabled={!points.length} data-testid="button-export-analytics"><Download size={16}/>Export CSV</button></div></div>
    <div className="analytics-feature">
      <div className="analytics-copy"><span className="eyebrow">COLLECTION OVER TIME</span><h2>{period === 'month' ? 'A month, made visible.' : 'The year in perspective.'}</h2><p>{a?.insight || 'Collected and outstanding amounts, side by side.'}</p><div className="chart-legend"><span><i className="legend-collected"/>Collected</span><span><i className="legend-outstanding"/>Outstanding</span></div></div>
      <div className="chart-area line-chart-area" data-testid="analytics-chart">
        {q.isLoading ? <div className="skeleton-chart" aria-label="Loading collection chart"/> : q.isError ? <div className="chart-empty" role="alert">Trend data could not be loaded. <button className="text-link" onClick={() => void q.refetch()}>Try again</button></div> : !points.length ? <div className="chart-empty">Trend data will appear here once collection is recorded.</div> : <>
          {activePoint != null && points[activePoint] && <div className="chart-tooltip" role="status" aria-live="polite"><b>{points[activePoint].label}</b><span>Collected <strong>{fmt(points[activePoint].collected)}</strong></span><span>Outstanding <strong>{fmt(points[activePoint].outstanding)}</strong></span></div>}
          <svg className="line-chart" viewBox="0 0 600 220" role="img" aria-label={`${period === 'month' ? 'Monthly' : 'Annual'} rent collection and outstanding balances in Uganda shillings`}>
            <defs><linearGradient id="collection-area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="hsl(164 36% 32%)" stopOpacity=".2"/><stop offset="100%" stopColor="hsl(164 36% 32%)" stopOpacity="0"/></linearGradient></defs>
            {[36, 82, 128, 174].map(y => <line key={y} x1="32" x2="568" y1={y} y2={y} className="chart-grid-line"/>)}
            <motion.path d={collectedPaths.area} fill="url(#collection-area-fill)" initial={false} animate={{ d: collectedPaths.area }} transition={{ duration: .5, ease: 'easeInOut' }}/>
            <motion.path d={collectedPaths.line} fill="none" className="chart-line-collected" initial={false} animate={{ d: collectedPaths.line }} transition={{ duration: .5, ease: 'easeInOut' }}/>
            <motion.path d={outstandingPaths.line} fill="none" className="chart-line-outstanding" initial={false} animate={{ d: outstandingPaths.line }} transition={{ duration: .5, ease: 'easeInOut' }}/>
            {points.map((point, index) => <g key={`${point.label}-${index}`} onPointerEnter={() => setActivePoint(index)} onPointerLeave={() => setActivePoint(null)} onPointerUp={() => setActivePoint(index)} onFocus={() => setActivePoint(index)} onBlur={() => setActivePoint(null)}>
              <circle cx={xAt(index)} cy={yAt(point.collected)} r="7" className="chart-point-hit" tabIndex={0} role="button" aria-label={`${point.label}, collected ${fmt(point.collected)}; outstanding ${fmt(point.outstanding)}`}/>
              <circle cx={xAt(index)} cy={yAt(point.collected)} r="3.5" className="chart-point-collected"/>
              <circle cx={xAt(index)} cy={yAt(point.outstanding)} r="7" className="chart-point-hit" tabIndex={0} role="button" aria-label={`${point.label}, outstanding ${fmt(point.outstanding)}; collected ${fmt(point.collected)}`}/>
              <circle cx={xAt(index)} cy={yAt(point.outstanding)} r="3.5" className="chart-point-outstanding"/>
            </g>)}
          </svg>
          <div className="chart-x-labels">{points.map((point, index) => <button key={`${point.label}-${index}`} onMouseEnter={() => setActivePoint(index)} onMouseLeave={() => setActivePoint(null)} onFocus={() => setActivePoint(index)} onBlur={() => setActivePoint(null)} onClick={() => setActivePoint(current => current === index ? null : index)} aria-label={`Show exact collection values for ${point.label}`}>{point.label}</button>)}</div>
        </>}
      </div>
    </div>
    <div className="metrics-grid analytics-metrics"><Metric label="Collected this period" value={compact(points.reduce((n, p) => n + p.collected, 0))} note="Verified rent records" icon={TrendingUp}/><Metric label="Outstanding this period" value={compact(points.reduce((n, p) => n + p.outstanding, 0))} note="Still expected" icon={Clock3} tone="amber"/><Metric label="Collection trust" value={`${d.dashboard?.trustPercent ?? 0}%`} note="Verified records this month" icon={ShieldCheck}/><Metric label="Late units" value={String(d.dashboard?.lateCount ?? 0)} note="May need a follow-up" icon={CalendarDays} tone="blue"/></div>
    <div className="analytics-note"><span><ShieldCheck size={17}/></span><p><b>Numbers you can stand behind.</b><br/>Each figure comes from payment records made in the ledger. Export the data as CSV or print the payment ledger.</p><Link href="/payments" className="text-link">Open ledger <ArrowUpRight size={14}/></Link></div>
  </div>;
}
function ReceiptPage() {
  const d = useData(); const [, params] = useRoute('/receipt/:id'); const payment = d.payments?.find(item => item.id === Number(params?.id));
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); d.notify('Receipt link copied'); }
    catch { d.notify('Could not copy the receipt link on this device.'); }
  };
  if (d.loading && !payment) return <div className="receipt-page"><div className="skeleton-chart" aria-label="Loading receipt"/></div>;
  if (!payment) return <div className="receipt-page"><Empty title="Receipt not found" text="This payment record may have changed or is not available on this device." action={<Link href="/payments" className="button button-primary">Open payment ledger</Link>}/></div>;
  return <div className="receipt-page"><div className="receipt-page-toolbar"><Link href="/payments" className="text-link"><ArrowLeft size={15}/>Back to ledger</Link><div><button className="button button-quiet" onClick={() => window.print()}><ReceiptText size={15}/>Print receipt</button><button className="button button-primary" onClick={copyLink}><ArrowUpRight size={15}/>Copy share link</button></div></div><article className="receipt-page-card"><div className="receipt-brand"><span className="brand-mark"><House size={18}/></span><span><b>rentwise</b><small>PROPERTY LEDGER</small></span></div><div className="paid-stamp">PAID</div><span className="eyebrow">OFFICIAL RENT RECEIPT</span><h2>{fmt(payment.amount)}</h2><p>Payment recorded for {payment.tenantName}</p><div className="receipt-page-details"><div><span>Unit</span><b>{payment.unitNumber}</b></div><div><span>Recorded on</span><b>{dateFmt(payment.recordedAt)}</b></div><div><span>Payment method</span><b>{payment.method === 'mobile_money' ? 'Mobile money (MTN / Airtel)' : statusLabel(payment.method)}</b></div><div><span>Recorded by</span><b>{payment.recordedBy}</b></div><div><span>Transaction reference</span><b>{payment.reference || 'Not provided'}</b></div><div><span>Receipt number</span><b>RW-{String(payment.id).padStart(6, '0')}</b></div></div><div className="receipt-page-foot"><ShieldCheck size={16}/><span>This receipt reflects a payment recorded in the property ledger.</span></div></article></div>;
}
function NotificationsPage() {
  const d = useData(); const [filter, setFilter] = useState('all'); const items = (d.activity || []).filter(a => filter === 'all' || a.type === filter);
  const now = new Date(); const today = new Date(now); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
  const grouped = [
    { title: 'Today', list: items.filter(item => new Date(item.occurredAt) >= today) },
    { title: 'This Week', list: items.filter(item => { const date = new Date(item.occurredAt); return date < today && date >= weekStart; }) },
    { title: 'Older', list: items.filter(item => new Date(item.occurredAt) < weekStart) },
  ].filter(group => group.list.length);
  const actionFor = (item: Activity) => item.type === 'payment' ? `/receipt/${item.id}` : item.type === 'repair' ? `/repairs?unitId=${item.unitId}` : item.type === 'agreement' ? '/agreements' : '/properties';
  return <div className="page-stack"><div className="notification-intro"><span className="notification-emblem"><Bell size={22}/></span><div><h2>One dependable history.</h2><p>Payments, repairs and agreements in the order they happened.</p></div><button className="button button-quiet" onClick={d.refresh}><RefreshCw size={15}/>Refresh</button></div><div className="toolbar notification-toolbar"><div className="toolbar-meta">{items.length} activity records</div><div className="filter-pills">{['all','payment','repair','agreement','message','contact_reveal'].map(x => <button className={filter === x ? 'active' : ''} key={x} onClick={() => setFilter(x)}>{x === 'all' ? 'All activity' : x === 'contact_reveal' ? 'Contact access' : x}</button>)}</div></div><section className="panel notifications-panel"><DataState rows={items} title="Your activity is up to date" text="New payment receipts and property activity will be listed here."><div className="timeline-groups">{grouped.map(group => <section className="timeline-group" key={group.title}><h2>{group.title}</h2><div className="timeline">{group.list.map((item, i) => <div className="timeline-entry" key={item.id} data-testid={`activity-${item.id}`}><div className="timeline-rail"><span className={`timeline-icon type-${item.type}`}>{item.type === 'payment' ? <Wallet size={16}/> : item.type === 'repair' ? <Wrench size={16}/> : item.type === 'agreement' ? <FileCheck2 size={16}/> : <Bell size={16}/>}</span>{i < group.list.length - 1 && <i/>}</div><div className="timeline-body"><div className="timeline-title"><b>{item.title}</b><time>{dateFmt(item.occurredAt)}</time></div><p>{item.detail}</p><div className="timeline-meta"><span>{item.unitNumber === 'Tenant record' ? 'Tenant record' : `Unit ${item.unitNumber}`}</span><span>Recorded by {item.actor}</span></div><Link className="receipt-link" href={actionFor(item)}>{item.type === 'payment' ? <><ReceiptText size={14}/>View receipt</> : <><ArrowUpRight size={14}/>Open related record</>} <ArrowUpRight size={13}/></Link></div></div>)}</div></section>)}</div></DataState></section></div>;
}
function TenantPortalPage() {
  const d = useData();
  const tenant = d.tenants?.[0];
  const unit = d.units?.find(u => u.id === tenant?.unitId);
  const payments = (d.payments || []).filter(p => p.unitId === tenant?.unitId).slice(0, 4);
  const repairs = (d.repairs || []).filter(r => r.unitId === tenant?.unitId && r.status !== 'done').slice(0, 3);
  const agreement = d.agreements?.find(item => item.tenantName === tenant?.fullName && item.unitNumber === unit?.unitNumber);
  const dueIn = daysUntil(agreement?.nextDueDate);
  const balance = tenant?.balance ?? unit?.balance ?? 0;
  const [language, setLanguage] = useState(localStorage.getItem('ledger-language') || 'English');
  const [reportOpen, setReportOpen] = useState(false);
  const [repairTitle, setRepairTitle] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const luganda = language === 'Luganda';
  const reportRepair = (event: FormEvent) => {
    event.preventDefault();
    if (!unit) return;
    d.createRepair.mutate({ data: { unitId: unit.id, title: repairTitle, description: repairDescription } }, {
      onSuccess: () => { d.notify('Your repair request was recorded'); setReportOpen(false); setRepairTitle(''); setRepairDescription(''); },
      onError: () => d.notify('Could not send the repair request. Please retry.'),
    });
  };
  return <div className="tenant-portal"><section className="portal-welcome"><div className="portal-brand"><span className="brand-mark"><House size={18}/></span>rentwise <span>· TENANT SPACE</span></div><div className="portal-actions"><span className="portal-protected"><ShieldCheck size={14}/> Demo tenant view · sign-in not connected</span><label className="portal-language"><span className="sr-only">Portal language</span><select value={language} onChange={event => { setLanguage(event.target.value); localStorage.setItem('ledger-language', event.target.value); }} aria-label="Portal language"><option>English</option><option>Luganda</option></select></label></div><span className="eyebrow">{luganda ? 'ENNYUMBA YO · RENTWISE' : 'YOUR HOME, CLEARLY RECORDED'}</span><h2>{luganda ? `Gyebale ko, ${tenant?.fullName?.split(' ')[0] || 'omupangisa'}.` : `Good day, ${tenant?.fullName?.split(' ')[0] || 'there'}.`}</h2><p>{luganda ? 'Ebisale byo n’okulabirira awaka mu kifo kimu.' : 'Your rent, your home and the things being taken care of.'}</p><div className="portal-home-card"><span className="portal-home-icon"><House size={20}/></span><div><b>{d.properties?.find(p => p.id === unit?.propertyId)?.name || 'Your home'}</b><small>{unit?.unitNumber ? `Unit ${unit.unitNumber} · ${unit.bedrooms} bedroom${unit.bedrooms === 1 ? '' : 's'}` : 'Your rented home'}</small></div><span className="portal-active">ACTIVE TENANCY</span></div></section><div className="portal-content"><div className="portal-balance"><div><span className="eyebrow">{luganda ? 'EBISIGADDE KU BUPANGISA' : 'CURRENT RENT BALANCE'}</span><b>{fmt(balance)}</b><small>{balance ? (luganda ? 'Buuza omukuumi w’ennyumba singa obalirira si kituufu.' : 'Please contact the caretaker if this does not look right.') : (luganda ? 'Ebisale byo biri bulungi.' : 'Your account is up to date.')}{dueIn != null && <span className="portal-due-countdown">{dueIn < 0 ? ` · ${Math.abs(dueIn)} days overdue` : dueIn === 0 ? ' · Due today' : ` · Due in ${dueIn} days`}</span>}</small></div><div className="balance-icon"><Wallet size={21}/></div></div><div className="portal-panels"><Panel title={luganda ? 'Ebisale ebyasasulwa' : 'Recent payments'}><DataState rows={payments} title="No payments recorded yet" text="Your rent receipts will be shown here."><div className="portal-payment-list">{payments.map(p => <div className="portal-payment" key={p.id}><span className="payment-check"><Check size={15}/></span><span><b>{dateFmt(p.recordedAt)} rent</b><small>{p.method === 'mobile_money' ? 'Mobile money' : p.method}{p.reference ? ` · Ref ${p.reference}` : ''}</small></span><strong>{fmt(p.amount)}</strong><Link className="portal-receipt-link" href={`/receipt/${p.id}`} aria-label={`Open receipt for ${fmt(p.amount)}`}><ReceiptText size={16}/></Link></div>)}</div></DataState></Panel><Panel title={luganda ? 'Okulabirira awaka' : 'Home care'} action={<button className="text-link" onClick={() => setReportOpen(true)} disabled={!unit} data-testid="button-tenant-report-repair"><Plus size={14}/>{luganda ? 'Laga obuzibu' : 'Report a problem'}</button>}><DataState rows={repairs} title="No open repair requests" text="There are no current requests for your unit."><div className="portal-repairs">{repairs.map(r => <div key={r.id} className="portal-repair"><Wrench size={16}/><span><b>{r.title}</b><small>Reported {dateFmt(r.reportedAt)}</small></span><Status value={r.status}/></div>)}</div></DataState></Panel></div><div className="portal-privacy"><ShieldCheck size={17}/><p><b>Know what is on record.</b> Rent and repair entries here are shared by your property manager. If something is incorrect, please speak with the caretaker. This preview displays one demo tenant; it does not enforce account-level data access.</p></div></div>
    <Modal open={reportOpen} title={luganda ? 'Report a home problem' : 'Report a repair'} close={() => setReportOpen(false)}><form className="form-stack" onSubmit={reportRepair}><p className="wizard-intro">{unit ? `Unit ${unit.unitNumber} · Your property team will see this request.` : 'A unit must be linked to your demo profile.'}</p><Field label={luganda ? 'Kiki ekirina okutereezebwa?' : 'What needs attention?'}><input required minLength={3} maxLength={100} value={repairTitle} onChange={event => setRepairTitle(event.target.value)} placeholder="e.g. Kitchen tap is leaking"/></Field><Field label={luganda ? 'Ebisingawo (optional)' : 'Details (optional)'}><textarea maxLength={500} value={repairDescription} onChange={event => setRepairDescription(event.target.value)} placeholder="Add a short description"/></Field><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setReportOpen(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={d.createRepair.isPending || !unit}>{d.createRepair.isPending ? <LoaderCircle size={15} className="spin"/> : <Check size={15}/>}Send request</button></div></form></Modal>
  </div>;
}
function SettingsPage({ theme, setTheme }: { theme: string; setTheme: (s: string) => void }) {
  const d = useData(); const [language, setLanguage] = useState(localStorage.getItem('ledger-language') === 'Luganda' ? 'Luganda' : 'English'); const [alerts, setAlerts] = useState(localStorage.getItem('ledger-alerts') !== 'off'); const [saved, setSaved] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('rentwise-receipt-sound') === 'on');
  const [channels, setChannels] = useState(() => ({ sms: localStorage.getItem('rentwise-channel-sms') === 'on', whatsapp: localStorage.getItem('rentwise-channel-whatsapp') === 'on', email: localStorage.getItem('rentwise-channel-email') === 'on' }));
  const updateLanguage = (s: string) => { setLanguage(s); localStorage.setItem('ledger-language', s); setSaved(true); d.notify('Language preference saved'); };
  const updateAlerts = () => { const n = !alerts; setAlerts(n); localStorage.setItem('ledger-alerts', n ? 'on' : 'off'); d.notify(n ? 'Notifications enabled' : 'Notifications paused'); };
  const updateSound = () => { const next = !soundEnabled; setSoundEnabled(next); localStorage.setItem('rentwise-receipt-sound', next ? 'on' : 'off'); d.notify(next ? 'Receipt sound enabled on this device' : 'Receipt sound muted'); };
  const updateChannel = (channel: keyof typeof channels) => setChannels(current => {
    const next = { ...current, [channel]: !current[channel] };
    localStorage.setItem(`rentwise-channel-${channel}`, next[channel] ? 'on' : 'off');
    d.notify(`${channel === 'whatsapp' ? 'WhatsApp' : channel.toUpperCase()} preference saved on this device`);
    return next;
  });
  const permissionRows = [
    ['View the property ledger', d.role !== 'Tenant', d.role === 'Tenant' ? 'Only your demo home appears' : 'Property and unit records are visible'],
    ['Record rent payments', d.role !== 'Tenant', d.role === 'Tenant' ? 'Not available in the tenant view' : 'Payment records can be added'],
    ['Manage repair work', d.role !== 'Tenant', d.role === 'Tenant' ? 'You can report a problem' : 'Requests can be assigned and updated'],
    ['Reveal tenant contacts', d.role === 'Landlord' || d.role === 'Caretaker', d.role === 'Landlord' || d.role === 'Caretaker' ? 'A reveal is added to the activity history' : 'Contact details stay hidden'],
  ] as const;
  return <div className="settings-layout">
    <section className="settings-intro"><span className="settings-mark"><Settings size={21}/></span><div><h2>A workspace that fits the way you work.</h2><p>Preferences are saved on this device. Authentication and notification delivery are not connected in this demo.</p></div><button className="button button-quiet" onClick={() => window.dispatchEvent(new Event('rentwise:open-tour'))}><CircleHelp size={15}/>Replay quick tour</button></section>
    <section className="settings-section"><div className="settings-section-title"><span><UserRound size={18}/></span><div><h2>Workspace role</h2><p>Choose a role-based demo view. It does not grant secure account permissions.</p></div></div><div className="role-options">{(['Landlord','Caretaker','Tenant'] as Role[]).map(role => <button key={role} onClick={() => { d.setRole(role); d.notify(`${role} demo workspace selected`); }} className={classes('role-option', d.role === role && 'selected')} aria-pressed={d.role === role} data-testid={`role-${role.toLowerCase()}`}><span className="role-icon">{role === 'Landlord' ? <Building2 size={18}/> : role === 'Caretaker' ? <ClipboardList size={18}/> : <UserRound size={18}/>}</span><span><b>{role}</b><small>{role === 'Landlord' ? 'Portfolio overview and records' : role === 'Caretaker' ? 'Fast collection and repairs' : 'A simple tenant-facing portal'}</small></span>{d.role === role && <CheckCircle2 size={18} className="role-check"/>}</button>)}</div></section>
    <section className="settings-section"><div className="settings-section-title"><span><ShieldCheck size={18}/></span><div><h2>What this demo role can do</h2><p>Plain-language screen access for the selected workspace.</p></div></div><div className="permission-list">{permissionRows.map(([label, allowed, explanation]) => <div className="permission-row" key={label}><span className={classes('permission-indicator', allowed && 'enabled')}>{allowed ? <Check size={13}/> : <X size={13}/>}</span><span><b>{label}</b><small>{explanation}</small></span><strong>{allowed ? 'On' : 'Off'}</strong></div>)}</div><p className="permission-disclaimer">These are demo display rules only. The API has no sign-in or server-side role checks.</p></section>
    <section className="settings-section"><div className="settings-section-title"><span><Sun size={18}/></span><div><h2>Appearance</h2><p>Choose a light or dark ledger.</p></div></div><div className="appearance-options"><button onClick={() => setTheme('light')} className={classes('appearance-choice', theme === 'light' && 'selected')} aria-pressed={theme === 'light'} data-testid="theme-light"><Sun size={18}/><span>Light</span>{theme === 'light' && <Check size={15}/>}</button><button onClick={() => setTheme('dark')} className={classes('appearance-choice', theme === 'dark' && 'selected')} aria-pressed={theme === 'dark'} data-testid="theme-dark"><Moon size={18}/><span>Dark</span>{theme === 'dark' && <Check size={15}/>}</button></div></section>
    <section className="settings-section"><div className="settings-section-title"><span><Bell size={18}/></span><div><h2>Notifications</h2><p>Choose reminder preferences for this device. No messages are sent yet.</p></div></div><button className="settings-toggle-row" role="switch" aria-checked={alerts} onClick={updateAlerts} data-testid="toggle-notifications"><span><b>Activity and payment reminders</b><small>Receipts, collection follow-ups and repair updates</small></span><i className={classes('switch', alerts && 'on')}><em/></i></button><div className="notification-channels">{([['sms', 'SMS', 'Text reminders to a phone'], ['whatsapp', 'WhatsApp', 'Updates in WhatsApp'], ['email', 'Email', 'Receipts and activity summaries']] as const).map(([key, label, detail]) => <button className="settings-toggle-row channel-row" role="switch" aria-checked={channels[key]} onClick={() => updateChannel(key)} key={key} data-testid={`toggle-channel-${key}`}><span><b>{label}</b><small>{detail}</small></span><i className={classes('switch', channels[key] && 'on')}><em/></i></button>)}</div><button className="settings-toggle-row" role="switch" aria-checked={soundEnabled} onClick={updateSound} data-testid="toggle-receipt-sound"><span><b>Payment confirmation sound</b><small>Optional soft chime after a receipt is recorded; muted by default</small></span><i className={classes('switch', soundEnabled && 'on')}><em/></i></button></section>
    <section className="settings-section"><div className="settings-section-title"><span><CircleHelp size={18}/></span><div><h2>Language</h2><p>Core tenant portal labels support English and Luganda.</p></div></div><div className="language-row"><select value={language} onChange={e => updateLanguage(e.target.value)} aria-label="Language preference"><option>English</option><option>Luganda</option></select><span>UGX · Uganda Shillings</span></div></section>
    <section className="settings-section role-summary"><div className="settings-section-title"><span><ShieldCheck size={18}/></span><div><h2>Privacy and data</h2><p>Personal contacts are masked by default in the tenant list. Role and display preferences stay on this device. Real account-level privacy still needs authentication and server checks.</p></div></div><span className="privacy-check"><CheckCircle2 size={16}/> Local preferences saved</span></section>
    {saved && <span className="sr-only" role="status">Language setting saved</span>}
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="form-field"><span>{label}</span>{children}</label>; }
function Modal({ open, close, title, children }: { open: boolean; close: () => void; title: string; children: ReactNode }) {
  useEffect(() => { if (!open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [open, close]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={18}/></button></div>{children}</section></div>;
}
function ModalActions({ close, busy }: { close: () => void; busy: boolean }) { return <div className="modal-actions"><button type="button" className="button button-quiet" onClick={close}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin"/> : <Check size={16}/>}Save record</button></div>; }
function NotFoundPage() { return <div className="not-found"><span className="empty-icon"><Search size={23}/></span><h2>This page is not in the ledger.</h2><p>It may have moved or the address may be mistyped.</p><Link href="/dashboard" className="button button-primary"><ArrowLeft size={16}/>Return to overview</Link></div>; }
function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function Router() {
  const [path] = useLocation();
  if (path === '/' || path === '/signup') return <RoutedErrorBoundary><SignUpPage/></RoutedErrorBoundary>;
  if (path === '/login' || path === '/create-account' || path === '/forgot-password') return <RoutedErrorBoundary><AuthPage/></RoutedErrorBoundary>;
  return <RoutedErrorBoundary><WorkspaceData><AppShell/></WorkspaceData></RoutedErrorBoundary>;
}
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router/></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>; }
export default App;
