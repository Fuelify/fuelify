'use client';

import { useEffect, useRef, useState } from 'react';
import type { Place } from '@fuelify/shared';
import { useSupabase } from '@/lib/stores';
import { Icon, Spinner } from '@/components/ui';

/**
 * City field backed by the location service: type to search cities, or use
 * the device's location. Free text still works if the service is down.
 */
export function LocationField({ value, onChange, id = 'location' }: { value: string; onChange: (label: string, place: Place | null) => void; id?: string }) {
  const supabase = useSupabase();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'search' | 'locate' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const typed = useRef(false);

  useEffect(() => setQuery(value), [value]);

  const call = async <T,>(path: string): Promise<T> => {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(path, { headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? 'Location service error.');
    return body as T;
  };

  // Search as they type (debounced), only after they've typed something
  useEffect(() => {
    if (!typed.current) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setBusy('search');
      try {
        const { places } = await call<{ places: Place[] }>(`/api/location/search?q=${encodeURIComponent(q)}`);
        setResults(places);
        setOpen(true);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const choose = (p: Place) => {
    typed.current = false;
    setQuery(p.label);
    setResults([]);
    setOpen(false);
    onChange(p.label, p);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setError('This browser can’t share your location.');
      return;
    }
    setBusy('locate');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { place } = await call<{ place: Place | null }>(`/api/location/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          if (place) choose(place);
          else setError('Couldn’t find a city for your location. Type it instead.');
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(null);
        }
      },
      (err) => {
        setBusy(null);
        setError(err.code === err.PERMISSION_DENIED ? 'Location access is off. Allow it for this site, or type your city.' : 'Couldn’t get your location. Type your city instead.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  };

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label htmlFor={id}>Location</label>
      <div className="row" style={{ gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            id={id}
            className="input"
            placeholder="Search for your city"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={`${id}-results`}
            value={query}
            onChange={(e) => {
              typed.current = true;
              setQuery(e.target.value);
              onChange(e.target.value, null);
            }}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {busy === 'search' && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}><Spinner /></span>}
        </div>
        <button type="button" className="btn btn-secondary" onClick={locate} disabled={busy === 'locate'} aria-label="Use my current location" title="Use my current location" style={{ padding: '0 12px' }}>
          {busy === 'locate' ? <Spinner /> : <Icon name="locate" size={20} />}
        </button>
      </div>
      {open && results.length > 0 && (
        <div id={`${id}-results`} role="listbox" className="list place-results">
          {results.map((p) => (
            <button key={`${p.label}-${p.lat}`} type="button" role="option" aria-selected={false} className="list-row" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(p)} style={{ gap: 10, textAlign: 'left' }}>
              <Icon name="pin" size={18} />
              <span className="grow">{p.label}</span>
            </button>
          ))}
        </div>
      )}
      {error ? <span className="hint" style={{ color: 'var(--danger)' }}>{error}</span> : <span className="hint">Used for store prices near you.</span>}
    </div>
  );
}
