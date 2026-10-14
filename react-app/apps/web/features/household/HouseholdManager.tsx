'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { isOwner, readShopping, sortMembers, validateEmail, type Household, type HouseholdMember, type ShoppingPreferences } from '@fuelify/shared';
import { useAuthStore, useHouseholdStore } from '@/lib/stores';
import { Avatar, EmptyState, Icon, LoadingBlock } from '@/components/ui';
import { LocationField } from '@/features/profile/LocationField';
import { GrocerySettings } from '@/features/grocery/GrocerySettings';
import { ShoppingPreferencesForm } from './ShoppingPreferencesForm';

// Household management: members (everyone), add/remove/rename (owner),
// leave (members), switch and create households.
export function HouseholdManager() {
  const userId = useAuthStore((s) => s.userId);
  const households = useHouseholdStore((s) => s.households);
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const members = useHouseholdStore((s) => s.members);
  const error = useHouseholdStore((s) => s.error);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const fetchMembers = useHouseholdStore((s) => s.fetchMembers);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureHousehold().then(() => fetchMembers()).finally(() => setReady(true));
  }, [ensureHousehold, fetchMembers]);

  const household = households.find((h) => h.id === activeHouseholdId);
  const owner = isOwner(members, userId);
  const sorted = useMemo(() => sortMembers(members), [members]);

  if (!ready) return <LoadingBlock />;
  if (!household) {
    return <EmptyState icon="users" title="No household">{error ?? 'Something went wrong loading your household.'}</EmptyState>;
  }

  return (
    <div className="stack-lg">
      {error && <div className="alert">{error}</div>}

      <HouseholdName householdId={household.id} name={household.name} editable={owner} />

      <HouseholdLocation household={household} />

      <HouseholdShopping household={household} />

      <section className="stack-sm">
        <div className="section-title" style={{ margin: 0 }}><span>Grocery stores</span></div>
        <GrocerySettings />
        <p className="hint">Shared by everyone in the household: which stores to price, and how to split the cart.</p>
      </section>

      <section className="stack-sm">
        <div className="section-title" style={{ margin: 0 }}>
          <span>Members · {members.length}</span>
        </div>
        <div className="list">
          {sorted.map((m) => (
            <MemberRow key={m.id} member={m} isSelf={m.userId === userId} canRemove={owner && m.userId !== userId} />
          ))}
        </div>
        <p className="hint">Everyone in a household shares the same cart and pantry.</p>
      </section>

      {owner ? <AddMemberForm /> : <LeaveHousehold name={household.name} />}

      <OtherHouseholds />
    </div>
  );
}

/** Shopping habits and weekly budget, shared by the household; saved as you change them. */
function HouseholdShopping({ household }: { household: Household }) {
  const updateSettings = useHouseholdStore((s) => s.updateSettings);
  const [value, setValue] = useState<ShoppingPreferences>(readShopping(household));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setValue(readShopping(household)), [household.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (patch: ShoppingPreferences) => {
    const next = { ...value, ...patch };
    setValue(next);
    setState('saving');
    // The budget slider fires constantly; save once it settles
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const ok = await updateSettings(household.id, { shopping: { ...household.shopping, ...next } });
      setState(ok ? 'saved' : 'error');
    }, 600);
  };

  return (
    <details className="card">
      <summary className="row-between" style={{ cursor: 'pointer', fontWeight: 700 }}>
        <span>Shopping &amp; budget</span>
        <span className="small muted" style={{ fontWeight: 500 }}>
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : state === 'error' ? 'Couldn’t save' : value.budget !== undefined ? `$${value.budget}/week` : 'Not set'}
        </span>
      </summary>
      <div style={{ marginTop: 12 }}>
        <ShoppingPreferencesForm value={value} onChange={change} />
      </div>
    </details>
  );
}

/** Where the household shops; any member can set it. Drives local store prices. */
export function HouseholdLocation({ household }: { household: Household }) {
  const setLocation = useHouseholdStore((s) => s.setLocation);
  const [text, setText] = useState(household.location ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setText(household.location ?? ''), [household.location]);

  const save = async (loc: Parameters<typeof setLocation>[1]) => {
    setSaving(true);
    setSaved(false);
    const ok = await setLocation(household.id, loc);
    setSaving(false);
    setSaved(ok);
  };
  const typedChange = text.trim() !== (household.location ?? '');

  return (
    <section className="stack-sm">
      <LocationField
        id="hh-location"
        label="Household location"
        hint={household.postcode ? `Store prices near ${household.postcode}. Shared by everyone in the household.` : 'Used for store prices near you. Shared by everyone in the household.'}
        value={text}
        onChange={(label, place) => {
          setText(label);
          setSaved(false);
          // Picking a suggestion or "use my location" saves right away
          if (place) save({ label: place.label, postcode: place.postcode, lat: place.lat, lon: place.lon });
        }}
      />
      {typedChange && (
        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={saving}
          onClick={() => save({ label: text.trim() || null, postcode: null, lat: null, lon: null })}>
          {saving ? 'Saving…' : 'Save location'}
        </button>
      )}
      {saved && !typedChange && <span className="tiny" style={{ color: 'var(--accent)' }}><Icon name="check" size={14} /> Saved for {household.name}</span>}
    </section>
  );
}

export function HouseholdName({ householdId, name, editable }: { householdId: string; name: string; editable: boolean }) {
  const updateHousehold = useHouseholdStore((s) => s.updateHousehold);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(name), [name]);

  if (!editable) {
    return (
      <div className="card row" style={{ gap: 12 }}>
        <span style={{ color: 'var(--primary)' }}><Icon name="users" /></span>
        <div className="grow">
          <div className="h2">{name}</div>
          <div className="small muted">Only the owner can rename the household.</div>
        </div>
      </div>
    );
  }

  const dirty = value.trim() && value.trim() !== name;
  return (
    <form
      className="field"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!dirty) return;
        setSaving(true);
        await updateHousehold(householdId, value.trim());
        setSaving(false);
      }}
    >
      <label htmlFor="hh-name">Household name</label>
      <div className="row">
        <input id="hh-name" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="submit" className="btn btn-secondary" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export function MemberRow({ member, isSelf, canRemove }: { member: HouseholdMember; isSelf: boolean; canRemove: boolean }) {
  const removeMember = useHouseholdStore((s) => s.removeMember);
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || (isSelf ? 'You' : 'Household member');

  return (
    <div className="list-row" style={{ paddingRight: canRemove ? 4 : undefined }}>
      <Avatar first={member.firstName} last={member.lastName} imageUrl={member.imageUrl} style={{ width: 36, height: 36, fontSize: 14 }} />
      <div className="grow">
        <div className="truncate" style={{ fontWeight: 600 }}>{name}{isSelf && member.firstName ? ' (you)' : ''}</div>
        <div className="tiny faint">Joined {new Date(member.joinedAt).toLocaleDateString()}</div>
      </div>
      <span className={`badge ${member.role === 'owner' ? 'badge-primary' : ''}`} style={{ textTransform: 'capitalize' }}>{member.role}</span>
      {canRemove && (
        <button
          className="icon-btn"
          aria-label={`Remove ${name}`}
          onClick={() => window.confirm(`Remove ${name} from the household? They'll lose access to its cart and pantry.`) && removeMember(member.userId)}
        >
          <Icon name="trash" size={18} />
        </button>
      )}
    </div>
  );
}

export function AddMemberForm() {
  const addMemberByEmail = useHouseholdStore((s) => s.addMemberByEmail);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateEmail(email);
    if (check !== 'Success') return setMessage({ kind: 'error', text: check });
    setBusy(true);
    const err = await addMemberByEmail(email.trim());
    setBusy(false);
    if (err) return setMessage({ kind: 'error', text: err });
    setMessage({ kind: 'ok', text: `Added ${email.trim()} to the household.` });
    setEmail('');
  };

  return (
    <form className="stack-sm" onSubmit={submit} noValidate>
      <div className="section-title" style={{ margin: 0 }}><span>Add a member</span></div>
      <div className="row">
        <input className="input" type="email" inputMode="email" autoComplete="off" placeholder="Their Fuelify account email"
          value={email} onChange={(e) => { setEmail(e.target.value); setMessage(null); }} aria-label="Member email" />
        <button type="submit" className="btn btn-primary" disabled={busy || !email.trim()}>
          <Icon name="plus" /> {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
      {message && <div className={`alert${message.kind === 'ok' ? ' alert-info' : ''}`} role="status">{message.text}</div>}
      <p className="hint">They need a Fuelify account first. Once added, they&apos;ll see this household&apos;s cart and pantry.</p>
    </form>
  );
}

function LeaveHousehold({ name }: { name: string }) {
  const leaveHousehold = useHouseholdStore((s) => s.leaveHousehold);
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-danger btn-block"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(`Leave ${name}? You'll lose access to its cart and pantry.`)) return;
        setBusy(true);
        await leaveHousehold();
        setBusy(false);
      }}
    >
      <Icon name="logOut" /> {busy ? 'Leaving…' : 'Leave household'}
    </button>
  );
}

function OtherHouseholds() {
  const households = useHouseholdStore((s) => s.households);
  const activeHouseholdId = useHouseholdStore((s) => s.activeHouseholdId);
  const setActiveHousehold = useHouseholdStore((s) => s.setActiveHousehold);
  const createHousehold = useHouseholdStore((s) => s.createHousehold);
  const [name, setName] = useState('');

  return (
    <section className="stack-sm">
      <div className="section-title" style={{ margin: 0 }}><span>Your households</span></div>
      {households.length > 1 && (
        <div className="chips">
          {households.map((h) => (
            <button key={h.id} className="chip" aria-pressed={h.id === activeHouseholdId} onClick={() => setActiveHousehold(h.id)}>
              {h.name}
            </button>
          ))}
        </div>
      )}
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await createHousehold(name.trim()).catch(() => undefined);
          setName('');
        }}
      >
        <input className="input" placeholder="New household name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New household name" />
        <button type="submit" className="btn btn-secondary" disabled={!name.trim()}>Create</button>
      </form>
    </section>
  );
}
