import { useState, type ReactNode } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bell, Building2, CalendarDays, CheckCircle2,
  ChevronDown, ChevronLeft, Clock3, FileCheck2, House, LayoutDashboard, Plus, ReceiptText,
  Settings, ShieldCheck, Smartphone, Users, Wallet, Wrench,
} from 'lucide-react';

const navigation = [
  { title: 'WORKSPACE', items: [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Properties', icon: Building2 },
    { label: 'Daily collection', icon: Wallet },
    { label: 'Payment ledger', icon: ReceiptText },
  ] },
  { title: 'PEOPLE & OPERATIONS', items: [
    { label: 'Tenants', icon: Users },
    { label: 'Repairs', icon: Wrench },
    { label: 'Agreements', icon: FileCheck2 },
    { label: 'Activity & receipts', icon: Bell },
  ] },
  { title: 'INSIGHTS', items: [
    { label: 'Analytics', icon: BarChart3 },
    { label: 'Tenant portal', icon: House },
  ] },
];

const units = [
  { number: 'A1', tenant: 'Grace Nabirye', status: 'Paid', amount: 'UGX 450,000', tone: 'paid' },
  { number: 'A2', tenant: 'Daniel Okello', status: 'Late', amount: 'UGX 350,000', tone: 'late' },
  { number: 'B1', tenant: 'Vacant', status: 'Vacant', amount: 'UGX 350,000', tone: 'vacant' },
];

const rentDue = [
  { tenant: 'Grace Nabirye', unit: 'A1', amount: 'UGX 450,000', date: 'Due 1 Jun' },
  { tenant: 'Daniel Okello', unit: 'A2', amount: 'UGX 600,000', date: 'Due 1 Jun' },
];

const activities = [
  { title: 'Payment recorded', detail: 'UGX 450,000 · mobile money', date: 'Today, 10:42', kind: 'payment' },
  { title: 'Replace porch light', detail: 'Repair reported · Unit A1', date: 'Today, 04:42', kind: 'repair' },
  { title: 'Kitchen tap is leaking', detail: 'Repair in progress · Unit A2', date: '2 days ago', kind: 'repair' },
  { title: 'Payment recorded', detail: 'UGX 250,000 · cash', date: 'Yesterday', kind: 'payment' },
  { title: 'Agreement signed', detail: 'Grace Nabirye · Unit A1', date: '8 months ago', kind: 'agreement' },
];

function StubLink({ children, className = '', 'aria-label': ariaLabel }: { children: ReactNode; className?: string; 'aria-label'?: string }) {
  return <a href="#" aria-label={ariaLabel} className={className} onClick={event => event.preventDefault()}>{children}</a>;
}

export function DashboardFrame({ rounded = false, refined = false }: { rounded?: boolean; refined?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`mock-dashboard${rounded ? ' is-rounded' : ''}${refined ? ' is-refined' : ''}${collapsed ? ' is-collapsed' : ''}`}>
      <aside className="mock-sidebar" aria-label="Rentwise workspace navigation">
        <div className="mock-brand">
          <span className="mock-brand-icon"><House size={19} /></span>
          <span className="mock-brand-copy"><b>rentwise</b><small>PROPERTY LEDGER</small></span>
          {rounded && <button className="mock-collapse" type="button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}><ChevronLeft size={16} /></button>}
        </div>
        <p className="mock-label">MANAGEMENT DESK</p>
        <div className="mock-property"><span className="mock-property-mark">M</span><span className="mock-property-copy"><b>Mirembe Court</b><small>All properties</small></span><ChevronDown size={14} /></div>
        <nav className="mock-nav" aria-label="Main navigation">
          {navigation.map(group => <div className="mock-nav-group" key={group.title}>
            <p>{group.title}</p>
            {group.items.map(({ label, icon: Icon }) => <StubLink key={label} className={`mock-nav-link${label === 'Overview' ? ' active' : ''}`}><Icon size={17} /><span>{label}</span></StubLink>)}
          </div>)}
        </nav>
        <div className="mock-sidebar-bottom">
          <div className="mock-sync"><span className="mock-sync-dot" /><span>Saved on this device</span></div>
          <StubLink className="mock-nav-link"><Settings size={17} /><span>Preferences</span></StubLink>
          <div className="mock-user"><span className="mock-avatar">AM</span><span className="mock-user-copy"><b>Agnes M.</b><small>Landlord workspace</small></span></div>
        </div>
      </aside>
      <main className="mock-main">
        <header className="mock-topbar">
          <div className="mock-breadcrumb"><span>Workspace</span><span>/</span><b>Overview</b></div>
          <div className="mock-top-actions"><span className="mock-online"><i /> Browser-only</span><span className="mock-top-refresh">↻</span><Bell size={16} /><span className="mock-avatar">AM</span><span>Agnes M.</span></div>
        </header>
        <div className="mock-content">
          <div className="mock-heading">
            <div><span className="mock-eyebrow">LANDLORD WORKSPACE · UGANDA</span><h1>Overview</h1><p>A clearer view of home, and everything that keeps it running.</p></div>
            <StubLink className="mock-action"><Plus size={15} /> Record payment</StubLink>
          </div>
          <div className="mock-grid">
            <div className="mock-metrics">
              <Metric icon={Wallet} label="Collected this month" value="UGX 700K" note="Across all active properties" />
              <Metric icon={Clock3} label="Outstanding" value="UGX 350K" note="1 unit needs a follow-up" tone="amber" />
              <Metric icon={Building2} label="Occupancy" value="2 / 3" note="67% of homes occupied" tone="blue" />
              <Metric icon={CheckCircle2} label="Paid today" value="1 payment" note="Verified entries today" />
            </div>
            <section className="mock-card mock-hero">
              <div className="mock-hero-copy">
                <span className="mock-hero-label"><ShieldCheck size={14} /> THE LEDGER IS IN GOOD ORDER</span>
                <h2>Trust, built one<br /><em>record at a time.</em></h2>
                <p>Rent recorded clearly. Agreements kept close. Repairs never forgotten.</p>
                <StubLink className="mock-action">Go to daily collection <ArrowUpRight size={14} /></StubLink>
              </div>
              <div className="mock-seal"><ShieldCheck size={20} /><span>64%</span><small>RECORD<br />CONFIDENCE</small></div>
              <i className="mock-orbit orbit-a" /><i className="mock-orbit orbit-b" />
            </section>
            <div className="mock-side-stack">
              <section className="mock-card mock-panel attention">
                <div className="mock-panel-head"><h2>Needs your attention</h2></div>
                <div className="mock-attention-list">
                  <div className="mock-attention-item"><span className="mock-attention-mark warn">!</span><span>1 rent payment overdue</span><StubLink aria-label="Review overdue payment"><ArrowUpRight size={14} /></StubLink></div>
                  <div className="mock-attention-item"><span className="mock-attention-mark"><Wrench size={14} /></span><span>2 repairs need attention</span><StubLink aria-label="Review repairs"><ArrowUpRight size={14} /></StubLink></div>
                </div>
                <div className="mock-panel-foot"><StubLink>Review collection <ArrowRight size={13} /></StubLink></div>
              </section>
              <section className="mock-card mock-panel upcoming">
                <div className="mock-panel-head"><h2>Upcoming rent</h2><StubLink>View agreements <ArrowUpRight size={12} /></StubLink></div>
                <div className="mock-rent-list">{rentDue.map(item => <div className="mock-rent-item" key={item.unit}>
                  <span className="mock-rent-icon"><CalendarDays size={15} /></span>
                  <span className="mock-rent-tenant"><b>{item.tenant}</b><small>Unit {item.unit}</small></span>
                  <span className="mock-rent-amount"><b>{item.amount}</b><small>{item.date}</small></span>
                </div>)}</div>
              </section>
            </div>
            <section className="mock-card mock-panel units">
              <div className="mock-panel-head"><h2>Units at a glance</h2><StubLink>View all <ArrowUpRight size={13} /></StubLink></div>
              <div className="mock-units">{units.map(unit => <StubLink className={`mock-unit ${unit.tone}`} key={unit.number}>
                <span className="mock-unit-top"><b>{unit.number}</b><i>{unit.status}</i></span><small>{unit.tenant}</small><strong>{unit.amount}</strong>
              </StubLink>)}</div>
            </section>
            <section className="mock-card mock-panel activity">
              <div className="mock-panel-head"><h2>Recent activity</h2><StubLink>See activity <ArrowUpRight size={13} /></StubLink></div>
              <div className="mock-activity-list">{activities.map(item => <div className="mock-activity-row" key={`${item.title}-${item.detail}-${item.date}`}>
                <span className={`mock-activity-icon ${item.kind}`}><Activity size={15} /></span><span className="mock-activity-copy"><b>{item.title}</b><small>{item.detail}</small></span><time>{item.date}</time>
              </div>)}</div>
            </section>
            <div className="mock-money-note"><Smartphone size={17} /><span><b>Mobile money, made clear.</b> MTN MoMo and Airtel Money entries are recorded alongside every receipt.</span><StubLink>View ledger</StubLink></div>
          </div>
          <footer className="mock-footer"><span>Rentwise · A reliable record, for everyone under one roof.</span><span>UGX · Kampala, Uganda</span></footer>
        </div>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note, tone = 'green' }: { icon: typeof Wallet; label: string; value: string; note: string; tone?: string }) {
  return <section className="mock-card mock-metric"><div className="mock-metric-label"><span>{label}</span><span className={`mock-metric-icon ${tone}`}><Icon size={16} /></span></div><strong>{value}</strong><small>{note}</small></section>;
}
