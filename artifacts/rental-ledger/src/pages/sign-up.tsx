import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Clock3, House, Menu, ShieldCheck, X } from 'lucide-react';
import { Link } from 'wouter';
import homesHero from '@assets/generated_images/rentwise-houses-hero.jpg';
import './sign-up.css';

const homes = [
  {
    label: 'Townhomes',
    position: '18% center',
    title: 'A better place',
    highlight: 'to settle in.',
    description: 'Find the right space, keep the details together and make every move feel simpler.',
  },
  {
    label: 'Family homes',
    position: '50% center',
    title: 'Find a place',
    highlight: 'to feel at home.',
    description: 'A better way to manage rent, care for your home and keep everything in one clear place.',
  },
  {
    label: 'Modern homes',
    position: '82% center',
    title: 'Make space',
    highlight: "for what's next.",
    description: 'From first keys to everyday upkeep, keep your home life moving in the right direction.',
  },
];

export default function SignUpPage() {
  const [activeHomeIndex, setActiveHomeIndex] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const activeHome = homes[activeHomeIndex];

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !menuPanelRef.current?.contains(event.target) &&
        !menuTriggerRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const showNextHome = () => setActiveHomeIndex(index => (index + 1) % homes.length);

  return (
    <main className="signup-page">
      <div className="signup-frame">
        <aside className="signup-rail" aria-label="Welcome navigation">
          <button
            ref={menuTriggerRef}
            type="button"
            className="signup-round-button signup-menu-button"
            aria-label={menuOpen ? 'Close welcome menu' : 'Open welcome menu'}
            aria-expanded={menuOpen}
            aria-controls="signup-menu-panel"
            onClick={() => setMenuOpen(open => !open)}
            data-testid="button-signup-menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={19} />}
          </button>
          <button
            type="button"
            className="signup-round-button signup-next-button"
            onClick={showNextHome}
            aria-label={`Show ${homes[(activeHomeIndex + 1) % homes.length].label}`}
            title="See another home style"
            data-testid="button-signup-next-home"
          >
            <ChevronRight size={20} />
          </button>
          <span className="signup-rail-caption">FIND HOME. FEEL AT HOME.</span>
        </aside>

        <section className="signup-stage" aria-label="Welcome to Rentwise">
          <div className="signup-photo-main">
            <img
              key={activeHomeIndex}
              src={homesHero}
              alt={`A bright, leafy residential setting — ${activeHome.label.toLowerCase()}`}
              style={{ objectPosition: activeHome.position }}
            />
            <div className="signup-photo-wash" />
          </div>
          <div className="signup-photo-rail">
            <img src={homesHero} alt="" />
            <span className="signup-photo-rail-tag"><House size={14} /> YOUR NEXT CHAPTER</span>
          </div>

          <Link href="/dashboard" className="signup-brand" aria-label="Rentwise home" data-testid="link-signup-brand">
            <span className="signup-brand-mark"><House size={18} strokeWidth={2.5} /></span>
            <span><b>rentwise</b><small>PROPERTY LEDGER</small></span>
          </Link>
          <span className="signup-protected"><ShieldCheck size={14} /> A clearer way to rent</span>

          <svg className="signup-orbit" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
            <ellipse cx="500" cy="292" rx="207" ry="252" transform="rotate(-17 500 292)" />
            <path d="M246 430H810M302 166H725" />
            <circle cx="246" cy="430" r="6" />
            <circle cx="810" cy="430" r="6" />
            <circle cx="725" cy="166" r="6" />
          </svg>

          <span className="signup-photo-note signup-photo-note-top">HOMES THAT FIT<br />THE WAY YOU LIVE</span>
          <span className="signup-photo-note signup-photo-note-left">A PLACE TO<br />PUT DOWN ROOTS</span>
          <span className="signup-photo-note signup-photo-note-right">ROOM TO GROW<br />ROOM TO BREATHE</span>
          <span className="signup-location-pin" aria-hidden="true"><House size={21} /></span>

          <nav
            ref={menuPanelRef}
            id="signup-menu-panel"
            className="signup-menu-panel"
            aria-label="Rentwise welcome menu"
            hidden={!menuOpen}
          >
            <span className="signup-menu-heading">Welcome to Rentwise</span>
            <span className="signup-menu-copy">A clearer way to care for the places you call home.</span>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
              Explore the workspace <ArrowUpRight size={15} />
            </Link>
            <a href="#signup-footer" onClick={() => setMenuOpen(false)}>
              Learn about Rentwise <ChevronRight size={15} />
            </a>
          </nav>

          <div className="signup-home-thumbs" aria-label="Explore homes">
            <span>Find your place</span>
            <div>
              {homes.map((home, index) => (
                <button
                  className={`signup-home-thumb${activeHomeIndex === index ? ' is-active' : ''}`}
                  key={home.label}
                  type="button"
                  aria-label={`Show ${home.label}`}
                  aria-pressed={activeHomeIndex === index}
                  title={home.label}
                  onClick={() => setActiveHomeIndex(index)}
                  style={{ backgroundImage: `url("${homesHero}")`, backgroundPosition: home.position }}
                />
              ))}
            </div>
          </div>

          <section className="signup-story" key={activeHomeIndex}>
            <span className="signup-eyebrow" aria-live="polite">RENTWISE · UGANDA · {activeHome.label.toUpperCase()}</span>
            <h1>{activeHome.title}<br /><strong>{activeHome.highlight}</strong></h1>
            <p>{activeHome.description}</p>
          </section>

          <section className="signup-join-card" aria-label="Get started with Rentwise">
            <span className="signup-join-kicker">HOME, MADE SIMPLER</span>
            <Link className="signup-join-button" href="/dashboard" data-testid="link-signup-join">
              JOIN TODAY <ArrowRight size={16} />
            </Link>
            <small>Explore the demo workspace</small>
          </section>
        </section>

        <footer className="signup-footer" id="signup-footer">
          <div className="signup-footer-note">
            <span className="signup-footer-icon"><Check size={13} /></span>
            <span><b>A clearer record for every home.</b><small>Rent, repairs and the details that matter — together.</small></span>
          </div>
          <div className="signup-footer-community">
            <span>MADE FOR PEOPLE &amp; PLACES</span>
            <div className="signup-avatar-stack" aria-label="Landlords, caretakers and tenants">
              <span>AM</span><span>JK</span><span>SN</span><span className="signup-avatar-plus">+</span>
            </div>
          </div>
          <div className="signup-footer-hours"><Clock3 size={16} /><span>BUILT FOR HOME. READY WHEN YOU ARE.</span><Link href="/dashboard" aria-label="Open the Rentwise workspace"><ArrowUpRight size={15} /></Link></div>
        </footer>
      </div>
    </main>
  );
}
