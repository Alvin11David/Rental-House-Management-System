import { ArrowUpRight, House } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <section className="role-unavailable" role="status" data-testid="page-not-found">
      <span className="role-unavailable-icon"><House size={22} /></span>
      <span className="eyebrow">PAGE NOT FOUND</span>
      <h2>We couldn’t find that page.</h2>
      <p>The page may have moved, or the link may be out of date. Head back to your workspace to keep going.</p>
      <Link href="/dashboard" className="button button-primary">
        Return to your workspace <ArrowUpRight size={15} />
      </Link>
    </section>
  );
}
