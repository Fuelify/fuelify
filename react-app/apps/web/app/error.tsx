'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui';

/** Shown when a page crashes; the rest of the app keeps working. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="screen">
      <div className="center-fill stack" style={{ padding: 24, textAlign: 'center' }}>
        <Logo stacked size={30} />
        <div className="stack-sm">
          <h1 className="h3">Something went wrong</h1>
          <p className="muted">Try again. If it keeps happening, go back home.</p>
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={reset}>Try again</button>
          <Link href="/home" className="btn btn-secondary">Go home</Link>
        </div>
      </div>
    </div>
  );
}
