'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@/lib/stores';
import { finishKrogerLink } from '@/lib/kroger-link';
import { Icon, LoadingBlock } from '@/components/ui';

/** Kroger sends people back here after they sign in to connect their account. */
export default function KrogerCallbackPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Finish />
    </Suspense>
  );
}

function Finish() {
  const supabase = useSupabase();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    finishKrogerLink(supabase, new URLSearchParams(params.toString()))
      .then((back) => router.replace(`${back}${back.includes('?') ? '&' : '?'}kroger=connected`))
      .catch((e: Error) => setError(e.message));
  }, [supabase, params, router]);

  if (!error) return <LoadingBlock />;
  return (
    <div className="center-fill stack" style={{ padding: 24, textAlign: 'center' }}>
      <span style={{ color: 'var(--danger)' }}><Icon name="alert" size={40} /></span>
      <h1 className="h3">Kroger isn’t connected</h1>
      <p className="muted">{error}</p>
      <Link href="/household" className="btn btn-primary">Back to Household</Link>
    </div>
  );
}
