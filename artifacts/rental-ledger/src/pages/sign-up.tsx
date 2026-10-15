import { ArrowRight, ArrowUpRight, Check, ChevronRight, Clock3, House, Menu, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import homesHero from '@assets/generated_images/rentwise-houses-hero.jpg';
import './sign-up.css';

const homes = [
  { label: 'Townhomes', position: 'left center' },
  { label: 'Family homes', position: 'center center' },
  { label: 'Modern homes', position: 'right center' },
];

export default function SignUpPage() {
  return (
    <main className="signup-page">
      <div className="signup-frame">
        <aside className="signup-rail" aria-label="Welcome navigation">
          <Link className="signup-round-button signup-menu-button" href="/dashboard" aria-label="Open the demo workspace" data-testid="link-signup-menu">
            <Menu size={19} />
          </Link>
          <Link className="signup-round-button signup-next-button" href="/dashboard" aria-label="Explore the workspace" data-testid="link-signup-explore">
            <ChevronRight size={20} />
          </Link>
          <span className="signup-rail-caption">FIND HOME. FEEL AT HOME.</span>
        </aside>

        <section className="signup-stage" aria-label="Welcome to Rentwise">
          <div className="signup-photo-main">
            <img src={homesHero} alt="Contemporary homes in a leafy residential compound beneath a bright blue sky" />
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

          <div className="signup-home-thumbs" aria-label="Explore homes">
            <span>Find your place</span>
            <div>
              {homes.map(home => (
                <span
                  className="signup-home-thumb"
                  key={home.label}
                  role="img"
                  aria-label={home.label}
                  style={{ backgroundImage: `url("${homesHero}")`, backgroundPosition: home.position }}
                />
              ))}
            </div>
          </div>

          <section className="signup-story">
            <span className="signup-eyebrow">RENTWISE · UGANDA</span>
            <h1>Find a place<br />to <strong>feel at home.</strong></h1>
            <p>A better way to manage rent, care for your home and keep everything in one clear place.</p>
          </section>

          <section className="signup-join-card" aria-label="Get started with Rentwise">
            <span className="signup-join-kicker">HOME, MADE SIMPLER</span>
            <Link className="signup-join-button" href="/dashboard" data-testid="link-signup-join">
              JOIN TODAY <ArrowRight size={16} />
            </Link>
            <small>Explore the demo workspace</small>
          </section>
        </section>

        <footer className="signup-footer">
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
