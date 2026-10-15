import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Eye, EyeOff, House, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import homesHero from '@assets/generated_images/rentwise-houses-hero.jpg';
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
const signInSchema = z.object({ phone: phoneSchema, password: z.string().min(1, 'Enter your password.') });
const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80, 'Name must be 80 characters or fewer.'),
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm your password.'),
}).refine(value => value.password === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
const recoverySchema = z.object({ phone: phoneSchema });
type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;
type RecoveryValues = z.infer<typeof recoverySchema>;

type Mode = 'login' | 'create-account' | 'forgot-password';

const pageContent: Record<Mode, { eyebrow: string; title: string; intro: string; button: string }> = {
  login: { eyebrow: 'WELCOME BACK', title: 'Your home records, in one place.', intro: 'Sign in with the Ugandan number connected to your Rentwise account.', button: 'Sign in to Rentwise' },
  'create-account': { eyebrow: 'A CLEARER WAY TO RENT', title: 'Start with the people who make a home.', intro: 'Create your account to keep rent, repairs and the details that matter together.', button: 'Create account' },
  'forgot-password': { eyebrow: 'ACCOUNT RECOVERY', title: 'Let’s get you back to your records.', intro: 'Enter your phone number and we’ll help you find the right next step.', button: 'Continue' },
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

function AuthForm({ mode, onSubmit, notice }: { mode: Mode; onSubmit: (value: any) => void; notice: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const isCreate = mode === 'create-account';
  const isLogin = mode === 'login';
  const schema = isCreate ? signUpSchema : isLogin ? signInSchema : recoverySchema;
  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: isCreate ? { name: '', phone: '', password: '', confirmPassword: '' } : isLogin ? { phone: '', password: '' } : { phone: '' },
  });
  const content = pageContent[mode];
  return <Form {...form}>
    <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {isCreate && <FormField control={form.control} name="name" render={({ field }) => <FormItem className="auth-field">
        <FormLabel>Full name</FormLabel><FormControl><Input {...field} autoComplete="name" placeholder="e.g. Sarah Namusoke" data-testid="input-name" /></FormControl><FormMessage />
      </FormItem>} />}
      <PhoneField control={form.control} />
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
      <Button className="auth-submit" type="submit" data-testid="button-auth-submit">{content.button}<ArrowRight size={17}/></Button>
      <p className="auth-terms">By continuing, you agree to use Rentwise respectfully and keep your account details private.</p>
      {notice && <div className="auth-notice" role="status" data-testid="status-auth-demo"><span><ShieldCheck size={18}/></span><p>{notice}</p></div>}
    </form>
  </Form>;
}

export default function AuthPage() {
  const [location] = useLocation();
  const mode: Mode = location === '/create-account' ? 'create-account' : location === '/forgot-password' ? 'forgot-password' : 'login';
  const [notice, setNotice] = useState('');
  useEffect(() => setNotice(''), [mode]);
  const content = pageContent[mode];
  const onSubmit = () => setNotice('Account services are not enabled in this demo. Your details have not been sent or saved.');
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
          <AuthForm key={mode} mode={mode} onSubmit={onSubmit} notice={notice}/>
          <div className="auth-switch">
            {mode === 'login' ? <>New to Rentwise? <Link href="/create-account" data-testid="link-create-account">Create an account <ArrowRight size={14}/></Link></> :
              mode === 'create-account' ? <>Already have an account? <Link href="/login" data-testid="link-login">Sign in <ArrowRight size={14}/></Link></> :
                <>Remember your password? <Link href="/login" data-testid="link-login">Return to sign in <ArrowRight size={14}/></Link></>}
          </div>
        </div>
        <footer className="auth-footer"><span>RENTWISE <i>·</i> UGANDA</span><span>Records you can come home to.</span></footer>
      </section>
      <aside className="auth-visual" aria-label="Rentwise homes in Uganda">
        <img src={homesHero} alt="Contemporary rental homes surrounded by tropical greenery" />
        <div className="auth-image-shade"/>
        <div className="auth-image-top"><span><span className="auth-image-dot"/> A HOME FOR EVERY CHAPTER</span><span className="auth-image-count">01 <i/> 03</span></div>
        <div className="auth-image-copy">
          <span className="auth-image-kicker"><span/> RENTWISE, UGANDA</span>
          <h2>Good homes.<br/><em>Clear records.</em></h2>
          <p>For the people who own, care for and call a place home.</p>
        </div>
        <div className="auth-image-caption"><span><House size={16}/></span><div><b>A place to belong</b><small>From Kampala to every corner of home.</small></div><ArrowRight size={17}/></div>
        <div className="auth-image-line" aria-hidden="true"/>
      </aside>
    </div>
  </main>;
}
