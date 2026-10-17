import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  House,
  ReceiptText,
  ShieldCheck,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/local-data';
import './OnboardingTour.css';

type TourStep = {
  label: string;
  title: string;
  text: string;
  visual: {
    label: string;
    title: string;
    detail: string;
  };
  icon: LucideIcon;
};

const stepsByRole: Record<Role, TourStep[]> = {
  Landlord: [
    {
      label: 'YOUR PORTFOLIO',
      title: 'Every property, in clear view',
      text: 'See rent, occupancy and open repairs together, then start with the home that needs your attention first.',
      visual: { label: 'PROPERTY OVERVIEW', title: 'A whole-home picture', detail: 'Rent · occupancy · repairs' },
      icon: Building2,
    },
    {
      label: 'A STRONG FOUNDATION',
      title: 'Set up each property once',
      text: 'Add a property, create its units, then connect each tenant and agreement so the details stay together.',
      visual: { label: 'PROPERTY DETAILS', title: 'Keep the details together', detail: 'Homes · people · agreements' },
      icon: House,
    },
    {
      label: 'RENT & RECEIPTS',
      title: 'Follow every payment',
      text: 'Record cash, bank or mobile money, then trace each receipt to its unit, date and transaction reference.',
      visual: { label: 'PAYMENT LEDGER', title: 'One reliable rent trail', detail: 'Unit · date · reference' },
      icon: ReceiptText,
    },
    {
      label: 'NEXT STEPS',
      title: 'Stay ahead of what’s next',
      text: 'Use rent due dates, repair updates and portfolio summaries to decide what needs action across your homes.',
      visual: { label: 'PROPERTY ACTIVITY', title: 'Know where to look next', detail: 'Due dates · repairs · insights' },
      icon: Bell,
    },
  ],
  Caretaker: [
    {
      label: 'YOUR DAY',
      title: 'Know what needs attention today',
      text: 'Start with unpaid units and open repairs, all close at hand in a practical view of the homes you care for.',
      visual: { label: 'TODAY AT A GLANCE', title: 'A clearer start to the day', detail: 'Collections · follow-ups · repairs' },
      icon: ClipboardList,
    },
    {
      label: 'DAILY COLLECTION',
      title: 'Record rent with confidence',
      text: 'Choose an occupied unit, enter the amount and payment method, then add an MTN or Airtel reference when available.',
      visual: { label: 'PAYMENT RECORDED', title: 'Every collection has a trail', detail: 'Cash · bank · mobile money' },
      icon: Wallet,
    },
    {
      label: 'REPAIRS',
      title: 'Keep repair work moving',
      text: 'Update the repair stage, note who is handling it and add a cost when you know it, so progress stays clear.',
      visual: { label: 'REPAIR FOLLOW-UP', title: 'The next step is clear', detail: 'Status · person · cost' },
      icon: Wrench,
    },
    {
      label: 'A CLEAR HANDOVER',
      title: 'Leave a useful activity trail',
      text: 'Recorded payments and repair updates stay together, making it easier to follow up and hand work over.',
      visual: { label: 'RECENT ACTIVITY', title: 'The full story, in one place', detail: 'Payments · receipts · updates' },
      icon: CheckCircle2,
    },
  ],
  Tenant: [
    {
      label: 'YOUR HOME',
      title: 'Your home, in one place',
      text: 'See your rent balance, due date, receipts, and repair updates for your own unit.',
      visual: { label: 'MY HOME', title: 'The details you need', detail: 'Rent · due date · home' },
      icon: House,
    },
    {
      label: 'RENT & RECEIPTS',
      title: 'Every payment, easy to prove',
      text: 'Open a receipt to check the payment details, print a copy or keep a link handy on this browser.',
      visual: { label: 'PAYMENT RECEIPTS', title: 'Your record, ready to use', detail: 'View · print · copy link' },
      icon: ReceiptText,
    },
    {
      label: 'HOME REPAIRS',
      title: 'Report a repair and follow it through',
      text: 'Tell the property team what needs attention, add a photo if useful and check back for each update.',
      visual: { label: 'REPAIR UPDATES', title: 'Know what’s happening', detail: 'Report · update · follow up' },
      icon: Wrench,
    },
    {
      label: 'AGREEMENT & DETAILS',
      title: 'Your agreement, within reach',
      text: 'Check your rent, tenancy dates and home details whenever you need a clear reminder.',
      visual: { label: 'HOME SUMMARY', title: 'Important details together', detail: 'Rent · agreement · dates' },
      icon: FileCheck2,
    },
  ],
};

const roleStory: Record<Role, { eyebrow: string; headline: string }> = {
  Landlord: { eyebrow: 'FOR EVERY PROPERTY YOU MANAGE', headline: 'The whole portfolio,\nin clear view.' },
  Caretaker: { eyebrow: 'FOR THE PEOPLE WHO KEEP HOMES RUNNING', headline: 'A smoother day\nfor every home.' },
  Tenant: { eyebrow: 'A CLEARER WAY TO KEEP UP WITH HOME', headline: 'Your home,\nin one clear place.' },
};

const roleStartLabel: Record<Role, string> = {
  Landlord: 'Open my properties',
  Caretaker: 'Open my day',
  Tenant: 'View my home',
};

function TourArtwork({ role, step, index }: { role: Role; step: TourStep; index: number }) {
  const Icon = step.icon;
  const story = roleStory[role];

  return (
    <aside className="role-tour-art" aria-hidden="true">
      <span className="role-tour-art-orbit role-tour-art-orbit-one"/>
      <span className="role-tour-art-orbit role-tour-art-orbit-two"/>
      <div className="role-tour-brand">
        <span className="role-tour-brand-mark"><House size={17} strokeWidth={2.1}/></span>
        <span><b>RENTWISE</b><small>HOME, MADE CLEAR</small></span>
      </div>
      <div className="role-tour-art-story">
        <span>{story.eyebrow}</span>
        <h3>{story.headline}</h3>
      </div>
      <div className="role-tour-art-scene">
        <div className="role-tour-icon-tile"><Icon size={58} strokeWidth={1.55}/></div>
        <span className="role-tour-art-spark role-tour-art-spark-one"><Building2 size={19}/></span>
        <span className="role-tour-art-spark role-tour-art-spark-two"><CheckCircle2 size={19}/></span>
        <div className="role-tour-feature-card">
          <span className="role-tour-feature-icon"><Icon size={16}/></span>
          <span className="role-tour-feature-copy"><small>{step.visual.label}</small><b>{step.visual.title}</b></span>
          <CheckCircle2 className="role-tour-feature-check" size={16}/>
        </div>
      </div>
      <div className="role-tour-art-foot">
        <span><i/> BUILT FOR RENTAL HOMES IN UGANDA</span>
        <b>0{index + 1} <i/> 04</b>
      </div>
    </aside>
  );
}

function OnboardingDialog({
  role,
  stepIndex,
  setStepIndex,
  onFinish,
  closeRef,
  titleId,
  descriptionId,
}: {
  role: Role;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  onFinish: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
  titleId: string;
  descriptionId: string;
}) {
  const steps = stepsByRole[role];
  const current = steps[stepIndex];
  const Icon = current.icon;

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onFinish();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="tour-overlay-refined" role="presentation">
      <section
        className={`role-tour-card role-tour-${role.toLowerCase()}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleDialogKeyDown}
      >
        <TourArtwork role={role} step={current} index={stepIndex}/>
        <div className="role-tour-content">
          <header className="role-tour-header">
            <div className="role-tour-wordmark">
              <span className="role-tour-header-mark"><House size={14}/></span>
              <span>RENTWISE</span>
              <i/>
              <small>{role} workspace</small>
            </div>
            <button ref={closeRef} type="button" className="role-tour-close" onClick={onFinish} aria-label="Skip onboarding">
              <X size={17}/>
            </button>
          </header>

          <div className="role-tour-progress-wrap">
            <span>STEP {stepIndex + 1} OF {steps.length}</span>
            <span className="role-tour-progress-track" role="progressbar" aria-label="Tour progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1}>
              <i style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}/>
            </span>
          </div>

          <div className="role-tour-copy" key={`${role}-${current.title}`} aria-live="polite" aria-atomic="true">
            <span className="role-tour-step-label"><Icon size={14}/>{current.label}</span>
            <h2 id={titleId}>{current.title}</h2>
            <p id={descriptionId}>{current.text}</p>
          </div>

          <p className="role-tour-local-note"><ShieldCheck size={14}/><span><b>Your records stay in this browser.</b> They don’t sync to another device.</span></p>

          <footer className="role-tour-actions">
            <button type="button" className="role-tour-skip" onClick={onFinish}>Skip tour</button>
            <div>
              {stepIndex > 0 && (
                <button type="button" className="role-tour-back" onClick={() => setStepIndex(stepIndex - 1)}>
                  <ArrowLeft size={15}/> Back
                </button>
              )}
              <button
                type="button"
                className="role-tour-next"
                onClick={() => stepIndex === steps.length - 1 ? onFinish() : setStepIndex(stepIndex + 1)}
              >
                {stepIndex === steps.length - 1 ? roleStartLabel[role] : 'Next step'}
                {stepIndex === steps.length - 1 ? <CheckCircle2 size={16}/> : <ArrowRight size={16}/>}
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

export default function OnboardingTour({ role }: { role: Role }) {
  const [stepIndex, setStepIndex] = useState(0);
  const storageKey = `rentwise-tour-${role.toLowerCase()}`;
  const [open, setOpen] = useState(() => localStorage.getItem(storageKey) !== 'done');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  const finish = () => {
    localStorage.setItem(storageKey, 'done');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <OnboardingDialog
      role={role}
      stepIndex={stepIndex}
      setStepIndex={setStepIndex}
      onFinish={finish}
      closeRef={closeRef}
      titleId="role-tour-title"
      descriptionId="role-tour-description"
    />
  );
}
