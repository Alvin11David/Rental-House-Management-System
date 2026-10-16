import { useEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Eye, EyeOff, House, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import signInHome from '@assets/generated_images/rentwise-signin-living-room.jpg';
import signUpHome from '@assets/generated_images/rentwise-signup-townhouse.jpg';
import recoveryHome from '@assets/generated_images/rentwise-recovery-courtyard.jpg';
import './auth.css';

const normalizeUgandanPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('256')) return `+${digits}`;
  if (digits.startsWith('0')) return `+256${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('3')) return `+256${digits}`;
  return `+${digits}`;
};
const phoneSchema = z.string().trim().min(1, 'Enter your phone number.').refine(value => /^\+256[37]\d{8}$/.test(normalizeUgandanPhone(value)), 'Enter a valid Ugandan mobile number, such as 0772 123 456.');
const passwordSchema = z.string().min(8, 'Use at least 8 characters.');
const emailSchema = z.string().trim().min(1, 'Enter your email address.').refine(value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value), 'Enter a valid email address, such as name@example.com.');
type Method = 'phone' | 'email';
const signInSchema = (method: Method) => z.object({
  ...(method === 'phone' ? { phone: phoneSchema } : { email: emailSchema }),
  password: z.string().min(1, 'Enter your password.'),
});
const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80, 'Name must be 80 characters or fewer.'),
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm your password.'),
}).refine(value => value.password === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
const recoverySchema = (method: Method) => z.object(method === 'phone' ? { phone: phoneSchema } : { email: emailSchema });
const otpSchema = z.object({ otp: z.string().refine(value => /^\d{5}$/.test(value.replace(/\s+/g, '')), 'Enter all 5 digits of the code.') });
type SignInValues = z.infer<ReturnType<typeof signInSchema>>;
type SignUpValues = z.infer<typeof signUpSchema>;
type RecoveryValues = z.infer<ReturnType<typeof recoverySchema>>;
type RecoveryState = { step: 'details' | 'otp'; target: string };

type Mode = 'login' | 'create-account' | 'forgot-password';

const pageContent: Record<Mode, { eyebrow: string; title: string; intro: string; button: string }> = {
  login: { eyebrow: 'WELCOME BACK', title: 'Your home records, in one place.', intro: 'Sign in with your phone number or email — whichever you used to set up your Rentwise account.', button: 'Sign in to Rentwise' },
  'create-account': { eyebrow: 'A CLEARER WAY TO RENT', title: 'Start with the people who make a home.', intro: 'Create your account to keep rent, repairs and the details that matter together.', button: 'Create account' },
  'forgot-password': { eyebrow: 'ACCOUNT RECOVERY', title: 'Let’s get you back to your records.', intro: 'Enter your phone number or email and we’ll send a 5-digit code to help you find the right next step.', button: 'Continue' },
};

const formatPhone = (value: string) => {
  const normalized = normalizeUgandanPhone(value);
  const parts = normalized.match(/^\+(\d{3})(\d{3})(\d{3})(\d{3})$/);
  return parts ? `+${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]}` : normalized;
};

const visualContent: Record<Mode, { image: string; alt: string; label: string; headline: [string, string]; support: string; caption: string }> = {
  login: {
    image: signInHome,
    alt: 'A bright living room opening onto a leafy garden',
    label: 'A QUIETER WAY TO KEEP HOME',
    headline: ['Come back', 'to what matters.'],
    support: 'Your home details, ready when you are.',
    caption: 'From Kampala to every corner of home.',
  },
  'create-account': {
    image: signUpHome,
    alt: 'A welcoming Kampala townhouse in the late afternoon sun',
    label: 'ROOM TO MAKE IT YOURS',
    headline: ['A good home', 'starts together.'],
    support: 'For the people who make a place feel like home.',
    caption: 'A home shared, and cared for, together.',
  },
  'forgot-password': {
    image: recoveryHome,
    alt: 'A warmly lit doorway opening onto an intimate courtyard at dusk',
    label: 'THE LIGHT IS STILL ON',
    headline: ['There’s always', 'a way back.'],
    support: 'We’ll help you find your way back to your records.',
    caption: 'Your place is here when you’re ready.',
  },
};

function PhoneField({ control }: { control: any }) {
  return <FormField control={control} name="phone" render={({ field }) => (
    <FormItem className="auth-field">
      <FormLabel>Phone number</FormLabel>
      <div className="auth-phone-control">
        <span className="auth-country" aria-hidden="true"><span className="auth-flag"><i/><i/><i/></span>+256</span>
         <FormControl><Input {...field} type="tel" inputMode="tel" autoComplete="tel" placeholder="772 123 456" data-testid="input-phone" /></FormControl>
      </div>
       <p className="auth-hint">Enter 9 digits, or include the leading 0 or +256 country code.</p>
      <FormMessage />
    </FormItem>
  )} />;
}

function EmailField({ control }: { control: any }) {
  return <FormField control={control} name="email" render={({ field }) => (
    <FormItem className="auth-field">
      <FormLabel>Email address</FormLabel>
      <div className="auth-email-control">
        <span className="auth-email-icon" aria-hidden="true"><Mail size={16} /></span>
        <FormControl><Input {...field} type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" data-testid="input-email" /></FormControl>
      </div>
      <p className="auth-hint">Use the email address linked to your Rentwise account.</p>
      <FormMessage />
    </FormItem>
  )} />;
}

function OtpField({ control, length = 5 }: { control: any; length?: number }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  return <FormField control={control} name="otp" render={({ field }) => {
    const value: string = typeof field.value === 'string' ? field.value : '';
    const cells = value.padEnd(length, ' ').slice(0, length).split('');
    const handleChange = (index: number, raw: string) => {
      const digit = raw.replace(/\D/g, '').slice(-1);
      const next = cells.slice();
      next[index] = digit || ' ';
      field.onChange(next.join(''));
      if (digit) refs.current[Math.min(index + 1, length - 1)]?.focus();
    };
    const handleKeyDown = (index: number, event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Backspace' || cells[index].trim() || index === 0) return;
      event.preventDefault();
      const next = cells.slice();
      next[index - 1] = ' ';
      field.onChange(next.join(''));
      refs.current[index - 1]?.focus();
    };
    const handlePaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
      const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (!pasted) return;
      event.preventDefault();
      field.onChange(pasted.padEnd(length, ' '));
      refs.current[Math.min(pasted.length, length - 1)]?.focus();
    };
    return <FormItem className="auth-field">
      <FormLabel>Verification code</FormLabel>
      <div className="auth-otp" onPaste={handlePaste}>
        {cells.map((cell, index) => (
          <input
            key={index}
            ref={node => { refs.current[index] = node; }}
            className={cell.trim() ? 'auth-otp-cell is-filled' : 'auth-otp-cell'}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            value={cell.trim() ? cell : ''}
            aria-label={`Digit ${index + 1} of ${length}`}
            onChange={event => handleChange(index, event.target.value)}
            onKeyDown={event => handleKeyDown(index, event)}
            onFocus={event => event.target.select()}
            data-testid={`otp-digit-${index + 1}`}
          />
        ))}
      </div>
      <p className="auth-hint">For this demo, any 5 digits will work — no code is actually sent.</p>
      <FormMessage />
    </FormItem>;
  }} />;
}

function AuthForm({ mode, onSubmit, notice, recovery, setRecovery }: { mode: Mode; onSubmit: (value: any) => void; notice: string; recovery: RecoveryState; setRecovery: (value: RecoveryState) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [method, setMethod] = useState<Method>('phone');
  const isCreate = mode === 'create-account';
  const isLogin = mode === 'login';
  const isRecovery = mode === 'forgot-password';
  const isRecoveryDetails = isRecovery && recovery.step === 'details';
  const isRecoveryOtp = isRecovery && recovery.step === 'otp';
  const schema = isCreate ? signUpSchema : isLogin ? signInSchema(method) : isRecoveryOtp ? otpSchema : recoverySchema(method);
  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: isCreate
      ? { name: '', phone: '', password: '', confirmPassword: '' }
      : isLogin
        ? { phone: '', email: '', password: '' }
        : { phone: '', email: '', otp: '' },
  });
  const content = pageContent[mode];
  const chooseMethod = (next: Method) => {
    if (next === method) return;
    setMethod(next);
    form.clearErrors();
  };
  const backToDetails = () => {
    setRecovery({ step: 'details', target: '' });
    form.clearErrors();
  };
  const submit = (values: any) => {
    if (isRecoveryDetails) {
      setRecovery({
        step: 'otp',
        target: method === 'phone' ? formatPhone(values.phone) : String(values.email || '').trim(),
      });
      return;
    }
    onSubmit(values);
  };
  return <Form {...form}>
    <form className="auth-form" onSubmit={form.handleSubmit(submit)} noValidate>
      {isCreate && <FormField control={form.control} name="name" render={({ field }) => <FormItem className="auth-field">
        <FormLabel>Full name</FormLabel><FormControl><Input {...field} autoComplete="name" placeholder="e.g. Sarah Namusoke" data-testid="input-name" /></FormControl><FormMessage />
      </FormItem>} />}
      {(isLogin || isRecoveryDetails) && <div className="auth-method">
        <span className="auth-method-label">{isRecovery ? 'RECOVER WITH' : 'SIGN IN WITH'}</span>
        <div className="auth-method-toggle" role="group" aria-label={isRecovery ? 'Recovery method' : 'Sign-in method'}>
          <button type="button" className={method === 'phone' ? 'selected' : ''} aria-pressed={method === 'phone'} onClick={() => chooseMethod('phone')} data-testid="method-phone"><Smartphone size={15} /> Phone</button>
          <button type="button" className={method === 'email' ? 'selected' : ''} aria-pressed={method === 'email'} onClick={() => chooseMethod('email')} data-testid="method-email"><Mail size={15} /> Email</button>
        </div>
      </div>}
      {isRecoveryOtp ? <>
        <button type="button" className="auth-recovery-back" onClick={backToDetails} data-testid="button-recovery-back"><ArrowLeft size={14} /> Use a different {method === 'phone' ? 'number' : 'email'}</button>
        <OtpField control={form.control} />
      </> : (isCreate || method === 'phone') ? <PhoneField control={form.control} /> : <EmailField control={form.control} />}
      {mode !== 'forgot-password' && <>
        <FormField control={form.control} name="password" render={({ field }) => <FormItem className="auth-field">
          <div className="auth-label-row"><FormLabel>Password</FormLabel>{isLogin && <Link href="/forgot-password" className="auth-inline-link" data-testid="link-forgot-password">Forgot password?</Link>}</div>
          <div className="auth-password-control"><FormControl><Input {...field} type={showPassword ? 'text' : 'password'} autoComplete={isCreate ? 'new-password' : 'current-password'} placeholder={isCreate ? 'At least 8 characters' : 'Enter your password'} data-testid="input-password" /></FormControl>
            <button className="auth-visibility" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} data-testid="button-toggle-password">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
          </div><FormMessage />
        </FormItem>} />
        {isCreate && <FormField control={form.control} name="confirmPassword" render={({ field }) => <FormItem className="auth-field">
          <FormLabel>Confirm password</FormLabel><FormControl><Input {...field} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" data-testid="input-confirm-password" /></FormControl><FormMessage />
        </FormItem>} />}
      </>}
      <Button className="auth-submit" type="submit" data-testid="button-auth-submit">{isRecoveryOtp ? 'Verify code' : content.button}<ArrowRight size={17}/></Button>
      <p className="auth-terms">By continuing, you agree to use Rentwise respectfully and keep your account details private.</p>
      {notice && <div className="auth-notice" role="status" data-testid="status-auth-demo"><span><ShieldCheck size={18}/></span><p>{notice}</p></div>}
    </form>
  </Form>;
}

export default function AuthPage() {
  const [location] = useLocation();
  const mode: Mode = location === '/create-account' ? 'create-account' : location === '/forgot-password' ? 'forgot-password' : 'login';
  const [notice, setNotice] = useState('');
  const [recovery, setRecovery] = useState<RecoveryState>({ step: 'details', target: '' });
  const [selectedRole, setSelectedRole] = useState<'Landlord' | 'Caretaker' | 'Tenant'>(() => {
    const saved = localStorage.getItem('ledger-role');
    return saved === 'Caretaker' || saved === 'Tenant' ? saved : 'Landlord';
  });
  useEffect(() => setRecovery({ step: 'details', target: '' }), [mode]);
  useEffect(() => setNotice(''), [mode, recovery.step]);
  const content = mode === 'forgot-password' && recovery.step === 'otp'
    ? { eyebrow: 'ALMOST THERE', title: 'Enter your 5-digit code.', intro: recovery.target ? `We sent a code to ${recovery.target}. Enter it below to keep going.` : 'Enter the 5-digit code we sent you to keep going.' }
    : pageContent[mode];
  const visual = visualContent[mode];
  const onSubmit = () => setNotice(mode === 'forgot-password'
    ? 'Password recovery is not connected in this demo — the code was not verified and nothing was sent.'
    : 'Account services are not enabled in this demo. Your details have not been sent or saved.');
  const chooseRole = (role: 'Landlord' | 'Caretaker' | 'Tenant') => {
    setSelectedRole(role);
    localStorage.setItem('ledger-role', role);
  };
  return <main className="auth-page">
    <div className="auth-layout">
      <section className="auth-main">
        <header className="auth-topbar">
          <Link href="/" className="auth-brand" aria-label="Rentwise welcome" data-testid="link-auth-brand"><span className="auth-brand-mark"><House size={19}/></span><span><b>rentwise</b><small>PROPERTY LEDGER</small></span></Link>
          <span className="auth-local"><span className="auth-flag"><i/><i/><i/></span> Made for Uganda</span>
        </header>
        <div className="auth-form-wrap">
          <Link href="/" className="auth-back" data-testid="link-auth-back"><ArrowLeft size={15}/> Back to welcome</Link>
          <div className="auth-heading">
            <span className="auth-eyebrow">{content.eyebrow}<i/></span>
            <h1>{content.title}</h1>
            <p>{content.intro}</p>
          </div>
          {mode === 'create-account' && <section className="auth-role-picker" aria-labelledby="auth-role-heading">
            <h2 id="auth-role-heading">Choose your workspace</h2>
            <p>Pick the workspace you want to start with. Account access is not connected yet.</p>
            <div className="auth-role-options">{([
              ['Landlord', 'Property overview and records'],
              ['Caretaker', 'Daily rent collection and repairs'],
              ['Tenant', 'Your rent, receipts and home care'],
            ] as const).map(([role, description]) => <button key={role} type="button" onClick={() => chooseRole(role)} aria-pressed={selectedRole === role} className={selectedRole === role ? 'selected' : ''} data-testid={`auth-role-${role.toLowerCase()}`}><span><b>{role}</b><small>{description}</small></span>{selectedRole === role && <ShieldCheck size={17}/>}</button>)}</div>
          </section>}
          <AuthForm key={mode} mode={mode} onSubmit={onSubmit} notice={notice} recovery={recovery} setRecovery={setRecovery}/>
          <div className="auth-switch">
            {mode === 'login' ? <>New to Rentwise? <Link href="/create-account" data-testid="link-create-account">Create an account <ArrowRight size={14}/></Link></> :
              mode === 'create-account' ? <>Already have an account? <Link href="/login" data-testid="link-login">Sign in <ArrowRight size={14}/></Link></> :
                <>Remember your password? <Link href="/login" data-testid="link-login">Return to sign in <ArrowRight size={14}/></Link></>}
          </div>
        </div>
        <footer className="auth-footer"><span>RENTWISE <i>·</i> UGANDA</span><span>Records you can come home to.</span></footer>
      </section>
      <aside className={`auth-visual auth-visual--${mode}`} aria-label="A place to belong">
        <img src={visual.image} alt={visual.alt} />
        <div className="auth-image-shade"/>
        <div className="auth-image-top"><span><span className="auth-image-dot"/> {visual.label}</span><span className="auth-image-count">{mode === 'login' ? '01' : mode === 'create-account' ? '02' : '03'} <i/> 03</span></div>
        <div className="auth-image-copy">
          <span className="auth-image-kicker"><span/> RENTWISE, UGANDA</span>
          <h2>{visual.headline[0]}<br/><em>{visual.headline[1]}</em></h2>
          <p>{visual.support}</p>
        </div>
        <div className="auth-image-caption"><span><House size={16}/></span><div><b>A place to belong</b><small>{visual.caption}</small></div><ArrowRight size={17}/></div>
        <div className="auth-image-line" aria-hidden="true"/>
      </aside>
    </div>
  </main>;
}
