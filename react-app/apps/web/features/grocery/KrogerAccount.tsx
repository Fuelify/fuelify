'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/stores';
import { disconnectKroger, krogerStatus, startKrogerLink, type KrogerLinkStatus } from '@/lib/kroger-link';
import { Icon, Spinner } from '@/components/ui';

/** Connect / disconnect your Kroger account (for sending the cart to Kroger). Per person, not per household. */
export function KrogerAccount({ returnTo, compact = false, onStatus }: { returnTo: string; compact?: boolean; onStatus?: (s: KrogerLinkStatus) => void }) {
  const supabase = useSupabase();
  const [status, setStatus] = useState<KrogerLinkStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    krogerStatus(supabase)
      .then((s) => { setStatus(s); onStatus?.(s); })
      .catch(() => setStatus({ connected: false, available: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  if (!status) return compact ? null : <Spinner />;
  if (!status.available) return null;

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      await startKrogerLink(supabase, returnTo);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (status.connected) {
    if (compact) return null;
    return (
      <div className="row" style={{ gap: 8 }}>
        <span className="small grow" style={{ color: 'var(--accent)' }}><Icon name="checkCircle" size={16} /> Your Kroger account is connected</span>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
          onClick={async () => {
            if (!window.confirm('Disconnect your Kroger account?')) return;
            setBusy(true);
            const s = await disconnectKroger(supabase).catch(() => null);
            setBusy(false);
            if (s) { setStatus({ ...status, connected: false }); onStatus?.({ ...status, connected: false }); }
          }}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="stack-sm">
      <button type="button" className={`btn ${compact ? 'btn-primary btn-block' : 'btn-secondary btn-sm'}`} onClick={connect} disabled={busy}>
        {busy ? <Spinner /> : <Icon name="link" size={16} />} Connect your Kroger account
      </button>
      {!compact && <span className="hint">Lets Fuelify put your cart straight into your Kroger cart. You sign in on Kroger’s site; we never see your password.</span>}
      {error && <div className="alert" role="alert">{error}</div>}
    </div>
  );
}
