import { useState } from 'react';
import { ArrowUpRight, House, X } from 'lucide-react';
import './_group.css';

type Role = 'Landlord' | 'Caretaker' | 'Tenant';
type CurrentStep = { title: string; text: string };

const onboardingByRole: Record<Role, CurrentStep[]> = {
  Landlord: [
    { title: 'A clear view of the whole property', text: 'Your overview brings rent, occupancy, and repairs together so you can see what needs attention first.' },
    { title: 'Keep unit records together', text: 'Add a property, create its units, and connect tenant and agreement details in a guided setup.' },
    { title: 'Every payment has a trail', text: 'Receipts, timestamps, and the person who recorded a payment make the ledger easier to verify.' },
    { title: 'Your records stay on this device', text: 'This demo saves data in this browser only. It does not sync to an account or another device.' },
  ],
  Caretaker: [
    { title: 'Start with today’s follow-ups', text: 'Your home screen puts unpaid units and open repairs near the top, ready for a quick check.' },
    { title: 'Record a payment in a few steps', text: 'Open Daily collection, choose an occupied unit, enter the amount, select cash, bank, or mobile money, then confirm.' },
    { title: 'Keep the receipt details', text: 'Add the MTN or Airtel transaction reference when available, so the receipt is easy to trace later.' },
    { title: 'Move repair work forward', text: 'Update a repair stage, record who is handling it, and add the cost when it is known.' },
  ],
  Tenant: [
    { title: 'Your home, in one place', text: 'See your rent balance, due date, receipts, and repair updates for your own unit.' },
    { title: 'Keep your receipts close', text: 'Open a payment receipt to print it or copy its link from this browser.' },
    { title: 'Report a repair problem', text: 'Describe what needs attention and optionally add a photo. The property team can follow each update.' },
    { title: 'Your information stays on this device', text: 'This demo stores records in the current browser profile; there is no account sign-in or cross-device sync.' },
  ],
};

function CurrentTour({ role, onFinish }: { role: Role; onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const steps = onboardingByRole[role];
  const current = steps[step];

  return (
    <div className="tour-overlay" role="presentation">
      <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description">
        <div className="tour-topline">
          <span className="tour-mark"><House size={17}/></span>
          <span>RENTWISE · {role.toUpperCase()} TOUR</span>
          <button type="button" className="icon-button" onClick={onFinish} aria-label="Skip tour"><X size={16}/></button>
        </div>
        <div className="tour-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((item, index) => <i key={item.title} className={index <= step ? 'complete' : ''}/>)}
        </div>
        <p className="eyebrow">STEP {step + 1} OF {steps.length}</p>
        <h2 id="tour-title" key={current.title}>{current.title}</h2>
        <p id="tour-description">{current.text}</p>
        <div className="tour-actions">
          <button type="button" className="text-link" onClick={onFinish}>Skip tour</button>
          <button type="button" className="button button-primary" onClick={() => step === steps.length - 1 ? onFinish() : setStep(value => value + 1)}>
            {step === steps.length - 1 ? 'Get started' : 'Next'} <ArrowUpRight size={14}/>
          </button>
        </div>
      </section>
    </div>
  );
}

export function Current() {
  const [role, setRole] = useState<Role>('Tenant');
  const [visible, setVisible] = useState(true);

  return (
    <main className="rentwise-tour-demo" aria-label="Current Rentwise onboarding preview">
      <nav className="tour-demo-bar" aria-label="Preview onboarding by role">
        <span className="tour-demo-label">CURRENT · ROLE</span>
        <div className="tour-demo-roles">
          {(['Tenant', 'Caretaker', 'Landlord'] as Role[]).map(item => (
            <button key={item} type="button" className="tour-demo-role" aria-pressed={role === item} onClick={() => { setRole(item); setVisible(true); }}>
              {item}
            </button>
          ))}
        </div>
        {!visible && <button type="button" className="tour-demo-replay" onClick={() => setVisible(true)}>Replay</button>}
      </nav>
      {visible && <CurrentTour key={role} role={role} onFinish={() => setVisible(false)}/>}
    </main>
  );
}
