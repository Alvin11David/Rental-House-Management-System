import { useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bell, Building2, CheckCircle2,
  ChevronDown, ChevronLeft, Clock3, FileCheck2, House, LayoutDashboard, Plus,
  ReceiptText, Settings, ShieldCheck, Users, Wallet, Wrench,
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

export function DashboardFrame({ rounded = false }: { rounded?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`mock-dashboard${rounded ? ' is-rounded' : ''}${collapsed ? ' is-collapsed' : ''}`}>
      <aside className="mock-sidebar" aria-label="Rentwise workspace navigation">
        <div className="mock-brand">
          <span className="mock-brand-icon"><House size={19} /></span>
          <span className="mock-brand-copy"><b>rentwise</b><small>PROPERTY LEDGER</small></span>
          {rounded && (
            <button
              className="mock-collapse"
              type="button"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              onClick={() => setCollapsed(value => !value)}
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
        <p className="mock-label">MANAGEMENT DESK</p>
        <div className="mock-property" title="Kintu Court · All properties">
          <span className="mock-property-mark">K</span>
          <span className="mock-property-copy"><b>Kintu Court</b><small>All properties</small></span>
          <ChevronDown size={14} />
        </div>
        <nav className="mock-nav" aria-label="Main navigation">
          {navigation.map(group => (
            <div className="mock-nav-group" key={group.title}>
              <p>{group.title}</p>
              {group.items.map(({ label, icon: Icon }) => (
                <a
                  href="#"
                  key={label}
                  className={`mock-nav-link${label === 'Overview' ? ' active' : ''}`}
                  aria-label={label}
                  title={label}
                  onClick={event => event.preventDefault()}
                >
                  <Icon size={17} /><span>{label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="mock-sidebar-bottom">
          <div className="mock-sync" title="All changes synced"><span className="mock-sync-dot" /><span>All changes synced</span></div>
          <a href="#" className="mock-nav-link" title="Preferences" aria-label="Preferences" onClick={event => event.preventDefault()}><Settings size={17} /><span>Preferences</span></a>
          <div className="mock-user" title="Agnes M. · Landlord workspace"><span className="mock-avatar">AM</span><span className="mock-user-copy"><b>Agnes M.</b><small>Landlord workspace</small></span></div>
        </div>
      </aside>

      <main className="mock-main">
        <header className="mock-topbar">
          <div className="mock-breadcrumb"><span>Workspace</span><span>/</span><b>Overview</b></div>
          <div className="mock-top-actions"><span className="mock-online">●&nbsp; Online</span><span>↻</span><Bell size={16} /><span className="mock-avatar">AM</span><span>Agnes M.</span></div>
        </header>
        <div className="mock-content">
          <div className="mock-heading">
            <div><span className="mock-eyebrow">LANDLORD WORKSPACE · UGANDA</span><h1>Overview</h1><p>A clearer view of home, and everything that keeps it running.</p></div>
            <a className="mock-action" href="#" onClick={event => event.preventDefault()}><Plus size={15} /> Record payment</a>
          </div>

          <div className="mock-grid">
            <div className="mock-metrics">
              <Metric icon={Wallet} label="Collected this month" value="UGX 0" note="Across all active properties" />
              <Metric icon={Clock3} label="Outstanding" value="UGX 0" note="0 units need a follow-up" tone="amber" />
              <Metric icon={Building2} label="Occupancy" value="0 / 0" note="0% of homes occupied" tone="blue" />
              <Metric icon={CheckCircle2} label="Paid today" value="0 payments" note="Verified entries today" />
            </div>

            <section className="mock-card mock-hero">
              <div className="mock-hero-copy">
                <span className="mock-hero-label"><ShieldCheck size={14} /> THE LEDGER IS IN GOOD ORDER</span>
                <h2>Trust, built one<br /><em>record at a time.</em></h2>
                <p>Rent recorded clearly. Agreements kept close. Repairs never forgotten.</p>
                <a className="mock-action" href="#" onClick={event => event.preventDefault()}>Go to daily collection <ArrowUpRight size={14} /></a>
              </div>
              <div className="mock-seal"><ShieldCheck size={20} /><span>98%</span><small>RECORD<br />CONFIDENCE</small></div>
            </section>

            <section className="mock-card mock-panel attention">
              <div className="mock-panel-head"><h2>Needs your attention</h2></div>
              <div className="mock-attention"><CheckCircle2 size={17} />Nothing needs attention right now.</div>
              <div className="mock-panel-head"><a href="#" onClick={event => event.preventDefault()}>Review collection <ArrowRight size={13} /></a></div>
            </section>

            <section className="mock-card mock-panel units">
              <div className="mock-panel-head"><h2>Units at a glance</h2><a href="#" onClick={event => event.preventDefault()}>View all <ArrowUpRight size={13} /></a></div>
              <div className="mock-empty"><ClipboardIcon /><b>No units to show</b><span>Add a property and its units to see the monthly picture here.</span></div>
            </section>

            <section className="mock-card mock-panel activity">
              <div className="mock-panel-head"><h2>Recent activity</h2><a href="#" onClick={event => event.preventDefault()}>See activity <ArrowUpRight size={13} /></a></div>
              <div className="mock-empty"><Activity size={18} />Your recent home activity will appear here.</div>
            </section>
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

function ClipboardIcon() {
  return <span className="mock-metric-icon"><FileCheck2 size={17} /></span>;
}
