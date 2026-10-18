import { useEffect, useState, type ReactNode } from "react";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import "./_group.css";

type Unit = {
  id: number;
  unitNumber: string;
  status: "paid" | "pending" | "late" | "vacant" | "repair";
  tenantName: string | null;
  balance: number;
  rentAmount: number;
};

type Agreement = {
  id: number;
  tenantName: string;
  unitNumber: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  nextDueDate: string;
};

type Activity = {
  id: number;
  title: string;
  detail: string;
  type: string;
  occurredAt: string;
};

type Dashboard = {
  totalCollected: number;
  outstanding: number;
  occupiedUnits: number;
  totalUnits: number;
  paidToday: number;
  trustPercent: number;
  lateCount: number;
  units: Unit[];
  attention: string[];
  activity: Activity[];
};

const fmt = (n?: number | null) => `UGX ${(n ?? 0).toLocaleString("en-UG")}`;
const compact = (n?: number) =>
  `UGX ${(n ?? 0).toLocaleString("en-UG", {
    notation: "compact",
    maximumFractionDigits: 1,
  })}`;
const dateFmt = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-UG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
const daysUntilDate = (value: string, today: Date) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const targetDay = Date.UTC(year, month - 1, day);
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetDay - todayDay) / 86_400_000);
};
const statusLabel = (status: string) => status.replaceAll("_", " ");
const classes = (...args: (string | false | undefined | null)[]) =>
  args.filter(Boolean).join(" ");

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function createDashboardDemo() {
  const now = new Date();
  const units: Unit[] = [
    { id: 1, unitNumber: "A1", status: "paid", tenantName: "Grace Nabirye", balance: 0, rentAmount: 450000 },
    { id: 2, unitNumber: "A2", status: "late", tenantName: "Daniel Okello", balance: 180000, rentAmount: 600000 },
    { id: 3, unitNumber: "A3", status: "paid", tenantName: "Ruth Namusoke", balance: 0, rentAmount: 520000 },
    { id: 4, unitNumber: "B1", status: "pending", tenantName: "Peter Ssemanda", balance: 90000, rentAmount: 380000 },
    { id: 5, unitNumber: "B2", status: "paid", tenantName: "Miriam Atim", balance: 0, rentAmount: 475000 },
    { id: 6, unitNumber: "B3", status: "vacant", tenantName: null, balance: 0, rentAmount: 410000 },
    { id: 7, unitNumber: "C1", status: "repair", tenantName: "Joan Achieng", balance: 0, rentAmount: 550000 },
    { id: 8, unitNumber: "C2", status: "paid", tenantName: "Isaac Kato", balance: 0, rentAmount: 490000 },
  ];
  const agreements: Agreement[] = [
    { id: 1, tenantName: "Grace Nabirye", unitNumber: "A1", monthlyRent: 450000, startDate: "2024-05-01", endDate: "2027-12-31", nextDueDate: localDateKey(addDays(now, 2)) },
    { id: 2, tenantName: "Daniel Okello", unitNumber: "A2", monthlyRent: 600000, startDate: "2024-03-01", endDate: "2026-11-30", nextDueDate: localDateKey(addDays(now, 5)) },
    { id: 3, tenantName: "Miriam Atim", unitNumber: "B2", monthlyRent: 475000, startDate: "2025-01-01", endDate: "2027-01-01", nextDueDate: localDateKey(addDays(now, 9)) },
  ];
  const activity: Activity[] = [
    { id: 1, title: "Payment recorded", detail: "UGX 450,000 · mobile money", type: "payment", occurredAt: addDays(now, -1).toISOString() },
    { id: 2, title: "Kitchen tap is leaking", detail: "Repair update · Unit A2", type: "repair", occurredAt: addDays(now, -1).toISOString() },
    { id: 3, title: "Agreement signed", detail: "Grace Nabirye · Unit A1", type: "agreement", occurredAt: addDays(now, -2).toISOString() },
    { id: 4, title: "Payment recorded", detail: "UGX 520,000 · Airtel Money", type: "payment", occurredAt: addDays(now, -3).toISOString() },
    { id: 5, title: "Porch light replacement", detail: "Repair reported · Unit C1", type: "repair", occurredAt: addDays(now, -4).toISOString() },
  ];
  const dashboard: Dashboard = {
    totalCollected: 3_845_000,
    outstanding: 735_000,
    occupiedUnits: 7,
    totalUnits: 8,
    paidToday: 3,
    trustPercent: 98,
    lateCount: 2,
    units,
    attention: ["2 rent payments overdue", "2 repairs need attention"],
    activity,
  };
  return { dashboard, units, agreements, activity };
}

const demo = createDashboardDemo();

function Link({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} className={className} onClick={(event) => event.preventDefault()}>
      {children}
    </a>
  );
}

function useCountUp(target: number, duration = 850) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function DashboardSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  return (
    <div className="dashboard-search">
      <label className="dashboard-search-box" htmlFor="dashboard-search-input">
        <span className="dashboard-search-icon"><Search size={18} /></span>
        <input
          id="dashboard-search-input"
          type="search"
          role="combobox"
          aria-label="Search this workspace"
          aria-expanded={open}
          placeholder="Search homes, people, payments or repairs"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        />
        {query ? (
          <button
            className="dashboard-search-clear"
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            ×
          </button>
        ) : (
          <kbd className="dashboard-search-shortcut"><span>⌘</span><span>K</span></kbd>
        )}
        <span className="dashboard-search-divider" />
        <span className="dashboard-search-hint">Quick find</span>
      </label>
      {open && (
        <div className="dashboard-search-popover">
          <div className="dashboard-search-popover-heading">
            <span>{query ? "MATCHING RECORDS" : "QUICK JUMPS"}</span>
            <small>{query ? "1 result" : "4 results"}</small>
          </div>
          {["Properties", "Daily collection", "Payment ledger", "Repairs"]
            .filter((item) => !query || item.toLowerCase().includes(query.toLowerCase()))
            .map((item) => (
              <button
                className="dashboard-search-result"
                type="button"
                key={item}
                onClick={() => setOpen(false)}
              >
                <span className="dashboard-result-icon"><Search size={16} /></span>
                <span className="dashboard-result-copy"><b>{item}</b><small>WORKSPACE</small></span>
                <ArrowUpRight size={15} className="dashboard-result-arrow" />
              </button>
            ))}
          <div className="dashboard-search-footer">Searches only records visible to your role</div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  numeric,
  format,
  note,
  icon: Icon,
  tone = "green",
  cornerMark = false,
}: {
  label: string;
  value?: string;
  numeric?: number;
  format?: (n: number) => string;
  note: string;
  icon: typeof Wallet;
  tone?: string;
  cornerMark?: boolean;
}) {
  const animated = useCountUp(numeric ?? 0);
  const display = numeric != null && format ? format(animated) : value;
  return (
    <div className={classes("metric-card", cornerMark && "has-corner-mark")}>
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
      </div>
      <strong>{display}</strong>
      <small>{note}</small>
      {cornerMark && <span className="card-corner-mark" aria-hidden="true"><ArrowUpRight size={13} /></span>}
    </div>
  );
}

function Panel({
  title,
  action,
  children,
  className = "",
  cornerMark = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  cornerMark?: boolean;
}) {
  return (
    <section className={classes("panel", className, cornerMark && "has-corner-mark")}>
      <div className="panel-head"><h2>{title}</h2>{action}</div>
      {children}
      {cornerMark && <span className="card-corner-mark" aria-hidden="true"><ArrowUpRight size={12} /></span>}
    </section>
  );
}

function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Building2 size={22} /></span>
      <b>{title}</b><p>{text}</p>{action}
    </div>
  );
}

function UpcomingRentPanel({ agreements, cornerMark = false }: { agreements: Agreement[]; cornerMark?: boolean }) {
  const today = new Date();
  const todayKey = localDateKey(today);
  const upcoming = (agreements || [])
    .filter((item) => item.startDate <= todayKey && item.endDate >= todayKey && item.nextDueDate >= todayKey)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate) || a.unitNumber.localeCompare(b.unitNumber))
    .slice(0, 3);
  const renderState = (icon: ReactNode, text: string) => (
    <div className="upcoming-rent-state">{icon}<span>{text}</span></div>
  );
  return (
    <Panel
      title="Upcoming rent"
      action={<Link href="/agreements" className="text-link">View agreements <ArrowUpRight size={14} /></Link>}
      className="upcoming-rent-panel"
      cornerMark={cornerMark}
    >
      {upcoming.length ? (
        <div className="upcoming-rent-list">
          {upcoming.map((item) => {
            const days = daysUntilDate(item.nextDueDate, today);
            const dueLabel = days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : days < 7 ? `Due in ${days} days` : dateFmt(item.nextDueDate);
            return (
              <div className="upcoming-rent-item" key={item.id}>
                <span className="upcoming-rent-icon"><CalendarDays size={16} /></span>
                <span className="upcoming-rent-tenant"><b>{item.tenantName}</b><small>Unit {item.unitNumber}</small></span>
                <span className="upcoming-rent-amount"><b>{compact(item.monthlyRent)}</b><small>{dueLabel}</small></span>
              </div>
            );
          })}
        </div>
      ) : renderState(<CalendarDays size={18} />, "No upcoming rent due dates are recorded.")}
    </Panel>
  );
}

function UnitTile({ unit }: { unit: Unit }) {
  return (
    <Link href="/properties" className={`unit-tile unit-${unit.status}`}>
      <span>{unit.unitNumber}</span><i />
      <small>{unit.tenantName || statusLabel(unit.status)}</small>
      <b>{unit.balance > 0 ? fmt(unit.balance) : fmt(unit.rentAmount)}</b>
    </Link>
  );
}

function ActivityRow({ item }: { item: Activity }) {
  return (
    <div className="activity-row">
      <span className={`activity-symbol activity-${item.type}`}><ActivityIcon size={16} /></span>
      <div className="activity-content"><b>{item.title}</b><span>{item.detail}</span></div>
      <time>{dateFmt(item.occurredAt)}</time>
    </div>
  );
}

function DashboardPage() {
  const d = demo;
  const s = d.dashboard;
  const activities = d.activity || s?.activity || [];
  const setLocation = (_path: string) => undefined;
  return (
    <div className="page-stack dashboard-page">
      <DashboardSearch />
      <div className="dashboard-grid">
        <div className="metrics-grid">
          <Metric label="Collected this month" numeric={s?.totalCollected ?? 0} format={compact} note="Across all active properties" icon={Wallet} cornerMark />
          <Metric label="Outstanding" numeric={s?.outstanding ?? 0} format={compact} note={`${s?.lateCount || 0} units need a follow-up`} icon={Clock3} tone="amber" cornerMark />
          <Metric label="Occupancy" value={`${s?.occupiedUnits ?? 0} / ${s?.totalUnits ?? 0}`} note={`${s?.totalUnits ? Math.round((s.occupiedUnits / s.totalUnits) * 100) : 0}% of homes occupied`} icon={Building2} tone="blue" cornerMark />
          <Metric label="Paid today" numeric={s?.paidToday ?? 0} format={(n) => `${Math.round(n)} payment${Math.round(n) === 1 ? "" : "s"}`} note="Verified entries today" icon={CheckCircle2} tone="green" cornerMark />
        </div>
        <section className="collection-hero">
          <div className="hero-copy">
            <div className="hero-label"><ShieldCheck size={15} /> THE LEDGER IS IN GOOD ORDER</div>
            <h2>Trust, built one<br /><em>record at a time.</em></h2>
            <p>Rent recorded clearly. Agreements kept close. Repairs never forgotten.</p>
            <Link href="/daily-collection" className="button button-cream">Go to daily collection <ArrowUpRight size={16} /></Link>
          </div>
          <div className="trust-seal">
            <div className="seal-ring"><ShieldCheck size={29} /><strong>{s?.trustPercent ?? 98}%</strong><small>RECORD<br />CONFIDENCE</small></div>
            <div className="seal-caption">Verified records<br />this month</div>
          </div>
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        </section>
        <Panel title="Needs your attention" className="attention-panel" cornerMark>
          <div className="attention-list">
            {(s?.attention || []).slice(0, 4).map((item, i) => (
              <div key={`${item}-${i}`} className="attention-item">
                <span className={i === 0 ? "attention-mark warn" : "attention-mark"}>
                  {i === 0 ? "!" : <ArrowUpRight size={14} />}
                </span>
                <span>{item}</span>
                <button onClick={() => setLocation(i === 0 ? "/daily-collection" : "/repairs")} aria-label={`Review ${item}`}>
                  <ArrowUpRight size={15} />
                </button>
              </div>
            ))}
            {!(s?.attention || []).length && <div className="calm-empty"><CheckCircle2 size={18} />Nothing needs attention right now.</div>}
          </div>
          <Link href="/daily-collection" className="panel-foot-link">Review collection <ArrowUpRight size={14} /></Link>
        </Panel>
        <Panel title="Units at a glance" action={<Link href="/properties" className="text-link">View all <ArrowUpRight size={14} /></Link>} className="units-panel" cornerMark>
          <div className="unit-grid">{(s?.units || d.units || []).slice(0, 8).map((unit) => <UnitTile key={unit.id} unit={unit} />)}</div>
          {!(s?.units || d.units)?.length && <Empty title="No units to show" text="Add a property and its units to see the monthly picture here." action={<Link className="text-link" href="/properties">Add a property</Link>} />}
        </Panel>
        <UpcomingRentPanel agreements={d.agreements} cornerMark />
        <Panel title="Recent activity" action={<Link href="/notifications" className="text-link">See activity <ArrowUpRight size={14} /></Link>} className="activity-panel" cornerMark>
          <div className="activity-list">{activities.slice(0, 5).map((item) => <ActivityRow key={item.id} item={item} />)}</div>
        </Panel>
        <div className="mobile-money-note">
          <Smartphone size={17} />
          <span><b>Mobile money, made clear.</b> MTN MoMo and Airtel Money entries are recorded alongside every receipt.</span>
          <Link href="/payments">View ledger</Link>
        </div>
      </div>
    </div>
  );
}

export function Current() {
  return (
    <div className="rental-overview">
      <div className="app-shell">
        <div className="shell-layout">
          <aside className="sidebar" aria-label="Rentwise workspace sidebar">
            <div className="brand-lockup">
              <span className="brand-mark"><House size={19} /></span>
              <span><b>rentwise</b><small>PROPERTY LEDGER</small></span>
            </div>
            <div className="workspace-label">MANAGEMENT DESK</div>
            <div className="property-picker">
              <span className="property-symbol">M</span>
              <span><b>Mirembe Court</b><small>All properties</small></span>
              <ChevronDown size={15} />
            </div>
            <nav aria-label="Main navigation">
              <div className="nav-group">
                <p>WORKSPACE</p>
                <a className="nav-item active" href="#overview"><LayoutDashboard size={18} /><span>Overview</span></a>
                <a className="nav-item" href="#properties"><Building2 size={18} /><span>Properties</span></a>
                <a className="nav-item" href="#collection"><Wallet size={18} /><span>Daily collection</span><em>2</em></a>
                <a className="nav-item" href="#payments"><ReceiptText size={18} /><span>Payment ledger</span></a>
              </div>
              <div className="nav-group">
                <p>PEOPLE &amp; OPERATIONS</p>
                <a className="nav-item" href="#tenants"><Users size={18} /><span>Tenants</span></a>
                <a className="nav-item" href="#repairs"><Wrench size={18} /><span>Repairs</span></a>
                <a className="nav-item" href="#agreements"><FileCheck2 size={18} /><span>Agreements</span></a>
                <a className="nav-item" href="#activity"><Bell size={18} /><span>Activity &amp; receipts</span></a>
              </div>
              <div className="nav-group">
                <p>INSIGHTS</p>
                <a className="nav-item" href="#analytics"><BarChart3 size={18} /><span>Analytics</span></a>
              </div>
            </nav>
            <div className="sidebar-bottom">
              <div className="sync-card"><span className="sync-dot" /><div><b>Saved on this device</b><small>Local storage · no account sync</small></div><Check size={15} /></div>
              <a className="nav-item" href="#preferences"><Settings size={18} /><span>Preferences</span></a>
              <section className="sidebar-account">
                <div className="sidebar-account-kicker"><span>WORKSPACE PROFILE</span><i>DEMO</i></div>
                <div className="sidebar-account-identity"><span className="avatar sidebar-account-avatar">AM</span><span className="sidebar-account-copy"><b>Agnes M.</b><small>Landlord workspace</small></span></div>
                <div className="sidebar-account-property"><span className="sidebar-account-property-icon"><Building2 size={14} /></span><span><small>CURRENT PROPERTY</small><b>Mirembe Court</b></span></div>
                <button type="button" className="sidebar-signout"><LogOut size={15} /><span>Sign out</span><small>Leave workspace</small></button>
              </section>
            </div>
          </aside>
          <main className="main-area">
            <header className="topbar">
              <div className="crumb"><span>Workspace</span><span>/</span><b>Overview</b></div>
              <div className="top-actions">
                <span className="connection"><span />Browser-only</span>
                <button className="icon-button" aria-label="Refresh workspace"><RefreshCw size={17} /></button>
                <a href="#activity" className="icon-button notify-button" aria-label="Receipts and activity"><Bell size={18} /><i /></a>
                <span className="top-divider" />
                <button className="profile-button"><span className="avatar small-avatar">AM</span><span>Agnes M.</span><ChevronDown size={14} /></button>
              </div>
            </header>
            <div className="content-area">
              <div className="page-heading">
                <div><div className="eyebrow">LANDLORD WORKSPACE · UGANDA</div><h1>Overview</h1><p className="heading-sub">A clearer view of home, and everything that keeps it running.</p></div>
                <Link href="/daily-collection" className="button button-primary"><Wallet size={17} />View collection</Link>
              </div>
              <div className="page-enter"><DashboardPage /></div>
              <footer className="footer"><span>Rentwise <i>·</i> A reliable record, for everyone under one roof.</span><span>UGX <i>·</i> Kampala, Uganda</span></footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
