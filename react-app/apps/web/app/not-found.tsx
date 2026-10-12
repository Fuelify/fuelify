import Link from 'next/link';
import { Logo } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="screen">
      <div className="center-fill stack" style={{ padding: 24, textAlign: 'center' }}>
        <Logo stacked size={30} />
        <div className="stack-sm">
          <h1 className="h3">Page not found</h1>
          <p className="muted">That page doesn’t exist or has moved.</p>
        </div>
        <Link href="/home" className="btn btn-primary">Go home</Link>
      </div>
    </div>
  );
}
