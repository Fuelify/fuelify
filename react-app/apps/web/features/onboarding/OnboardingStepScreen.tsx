'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ONBOARDING_STEPS,
  HOUSEHOLD_SETUP_STEPS,
  needsHouseholdSetup,
  selectActiveHousehold,
  type UserProfile,
  ACTIVITY_OPTIONS,
  ALLERGEN_OPTIONS,
  CALORIE_SENSITIVE_OPTIONS,
  CHOOSY_EATER_OPTIONS,
  DEVICE_OPTIONS,
  DIET_OPTIONS,
  GENDER_OPTIONS,
  HEALTH_GOAL_OPTIONS,
  WEEKLY_WEIGHT_OPTIONS,
  cmToFeetInches,
  feetInchesToCm,
  formatWeight,
  kgToDisplay,
  displayToKg,
  weeklyWeightLabel,
  readGoals,
} from '@fuelify/shared';
import { useHouseholdStore, useProfileStore } from '@/lib/stores';
import { Icon, LoadingBlock, Logo, OptionRow, Segmented } from '@/components/ui';
import { useOnboarding, type OnboardingDraft } from './OnboardingContext';
import { DEVICE_IMAGES, DIET_IMAGES, WELCOME_ANIMATION } from './assets';

// Ports every screen in lib/screens/onboarding/* onto one shared step layout.

type StepKey = (typeof ONBOARDING_STEPS)[number];

interface StepDef {
  title?: string;
  subtitle?: string;
  /** Profile fields persisted when Continue is pressed */
  fields: (keyof UserProfile)[];
  isComplete?: (d: OnboardingDraft) => boolean;
  cta?: string;
  Body: (props: { draft: OnboardingDraft }) => ReactNode;
}

const goals = (d: OnboardingDraft) => readGoals(d);
const habits = (d: OnboardingDraft) => goals(d).habits ?? {};

const STEPS: Record<StepKey, StepDef> = {
  welcome: { fields: [], cta: "Let's Do It!", Body: WelcomeStep },
  profile: {
    title: 'Tell us about you',
    subtitle: 'This helps us personalize your plan.',
    fields: ['firstName', 'lastName'],
    isComplete: (d) => !!d.firstName?.trim(),
    Body: ProfileStep,
  },
  'personal-details': {
    title: 'Personal details',
    subtitle: 'Used to estimate your daily energy needs.',
    fields: ['units', 'height', 'birthdate', 'gender', 'genderDesc'],
    isComplete: (d) => !!d.units && !!d.height && !!d.birthdate,
    Body: PersonalStep,
  },
  diet: {
    title: 'Choose your dietary preference',
    fields: ['diet'],
    isComplete: (d) => !!d.diet,
    Body: DietStep,
  },
  allergens: {
    title: 'Please specify your allergens',
    subtitle: "Select any that apply — skip if you don't have any.",
    fields: ['allergens'],
    Body: AllergensStep,
  },
  'eating-habits': {
    title: 'Eating habits',
    fields: ['goals'],
    isComplete: (d) => !!habits(d).calorieSensitive && !!habits(d).choosyEater,
    Body: HabitsStep,
  },
  'health-goals': {
    title: 'What are your health goals?',
    subtitle: 'Choose all that apply.',
    fields: ['goals'],
    isComplete: (d) => (goals(d).all ?? []).length > 0,
    Body: HealthGoalsStep,
  },
  'primary-goal': {
    title: 'What is your primary goal?',
    fields: ['goals'],
    isComplete: (d) => !!goals(d).primary,
    Body: PrimaryGoalStep,
  },
  'weight-goals': {
    title: 'Weight goals',
    fields: ['weight', 'goals'],
    isComplete: (d) => !!d.weight && goals(d).weekly !== undefined,
    Body: WeightStep,
  },
  'activity-level': {
    title: 'Choose your daily activity level',
    fields: ['activeness'],
    isComplete: (d) => !!d.activeness,
    Body: ActivityStep,
  },
  'device-connections': {
    title: 'Connect your activity tracker',
    fields: [],
    Body: DevicesStep,
  },
  submission: { fields: [], cta: 'Submit', Body: SubmissionStep },
};

// ---------------------------------------------------------------------------

export function OnboardingStepScreen({ step }: { step: string }) {
  const router = useRouter();
  const { draft, save, saving, error, loaded } = useOnboarding();
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);
  const [done, setDone] = useState(false);

  const index = ONBOARDING_STEPS.indexOf(step as StepKey);
  if (index < 0) return null;
  const def = STEPS[step as StepKey];
  const total = ONBOARDING_STEPS.length;
  const isLast = index === total - 1;
  const canContinue = def.isComplete ? def.isComplete(draft) : true;

  if (!loaded) return <LoadingBlock />;

  const handleContinue = async () => {
    if (isLast) {
      const ok = await save([], index);
      if (!ok) return;
      await completeOnboarding();
      setDone(true);
      return;
    }
    if (def.fields.length > 0) {
      const ok = await save(def.fields, index + 1);
      if (!ok) return;
    }
    router.push(`/onboarding/${ONBOARDING_STEPS[index + 1]}`);
  };

  if (done) return <CompletionScreen />;

  return (
    <>
      <header className="page-header" style={{ paddingBottom: 6 }}>
        {index > 0 ? (
          <button className="icon-btn" aria-label="Back" onClick={() => router.push(`/onboarding/${ONBOARDING_STEPS[index - 1]}`)}>
            <Icon name="chevronLeft" />
          </button>
        ) : (
          <span style={{ width: 40 }} />
        )}
        <div className="grow stack-sm" style={{ gap: 6 }}>
          <div className="row-between tiny faint" style={{ fontWeight: 600 }}>
            <span>Step {index + 1} of {total}</span>
            <span>{Math.round(((index + 1) / total) * 100)}%</span>
          </div>
          <div className="progress"><div style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
        </div>
        <Link href="/home" className="btn btn-ghost btn-sm">Skip</Link>
      </header>

      <div className="screen-scroll">
        <div className="screen-pad stack-lg" style={{ paddingTop: 8, paddingBottom: 24 }}>
          {def.title && (
            <div className="stack-sm">
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{def.title}</h2>
              {def.subtitle && <p className="muted">{def.subtitle}</p>}
            </div>
          )}
          <def.Body draft={draft} />
        </div>
      </div>

      <div className="screen-footer stack-sm">
        {error && <div className="alert" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" onClick={handleContinue} disabled={!canContinue || saving}>
          {saving ? 'Saving…' : def.cta ?? 'Continue'}
        </button>
      </div>
    </>
  );
}

function CompletionScreen() {
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const [checked, setChecked] = useState(false);
  // Make sure the household is loaded (a new user gets one created here)
  useEffect(() => {
    ensureHousehold().finally(() => setChecked(true));
  }, [ensureHousehold]);
  const needsSetup = useHouseholdStore((s) => needsHouseholdSetup(selectActiveHousehold(s)));
  if (!checked) return <LoadingBlock />;
  if (needsSetup) {
    return (
      <div className="center-fill" style={{ gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ animation: 'pop 0.5s ease', color: 'var(--primary)', display: 'flex' }} aria-hidden="true"><Icon name="checkCircle" size={72} /></div>
        <h2 style={{ fontSize: 26, fontWeight: 800 }}>You&apos;re set up!</h2>
        <p className="muted" style={{ maxWidth: 320 }}>
          One more short part: your household. Where you shop, your grocery budget, and who you live with. It takes about a minute.
        </p>
        <Link href={`/household-setup/${HOUSEHOLD_SETUP_STEPS[0]}`} className="btn btn-primary btn-lg" style={{ marginTop: 8, minWidth: 220 }}>
          Set up my household
        </Link>
        <Link href="/home" className="btn btn-ghost">Later</Link>
      </div>
    );
  }
  return (
    <div className="center-fill" style={{ gap: 16 }}>
      <div style={{ animation: 'pop 0.5s ease', color: 'var(--primary)', display: 'flex' }} aria-hidden="true"><Icon name="checkCircle" size={72} /></div>
      <h2 style={{ fontSize: 26, fontWeight: 800 }}>You&apos;re all set!</h2>
      <p className="muted" style={{ maxWidth: 320 }}>
        Congratulations, you have now completed the onboarding process! Your plan is ready to build.
      </p>
      <Link href="/plan" className="btn btn-primary btn-lg" style={{ marginTop: 8, minWidth: 220 }}>
        Go to my plan
      </Link>
      <Link href="/home" className="btn btn-ghost">Go to home</Link>
    </div>
  );
}

// ----- Steps --------------------------------------------------------------

function WelcomeStep() {
  return (
    <div className="stack-lg center" style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}><Logo size={30} /></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={WELCOME_ANIMATION} alt="" style={{ borderRadius: 'var(--radius-lg)', width: '100%', background: '#e8e8e8' }} />
      <p style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.35 }}>
        Welcome to Fuelify! To get started we need to collect some information so we can best serve you and your goals.
      </p>
      <p className="muted small">It takes about two minutes. You can change any answer later from your profile.</p>
    </div>
  );
}

function ProfileStep({ draft }: { draft: OnboardingDraft }) {
  const { update } = useOnboarding();
  return (
    <div className="stack">
      <div className="field">
        <label htmlFor="first">First name</label>
        <input id="first" className="input" autoComplete="given-name" value={draft.firstName ?? ''}
          onChange={(e) => update({ firstName: e.target.value })} />
      </div>
      <div className="field">
        <label htmlFor="last">Last name</label>
        <input id="last" className="input" autoComplete="family-name" value={draft.lastName ?? ''}
          onChange={(e) => update({ lastName: e.target.value })} />
      </div>
      <p className="hint">Where you shop and your grocery budget are set for your household next, so everyone you live with shares them.</p>
    </div>
  );
}

function PersonalStep({ draft }: { draft: OnboardingDraft }) {
  const { update } = useOnboarding();
  const units = draft.units === 'Metric' ? 'Metric' : 'Imperial';
  const { feet, inches } = draft.height ? cmToFeetInches(draft.height) : { feet: 5, inches: 6 };
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="stack-lg">
      <div className="field">
        <span className="label">Preferred units</span>
        <Segmented
          options={[{ value: 'Imperial', label: 'Imperial' }, { value: 'Metric', label: 'Metric' }]}
          value={units}
          onChange={(v) => update({ units: v })}
        />
        <p className="hint">{units === 'Imperial' ? 'lbs, cals, ft, miles, °F' : 'g, kg, kJ, km, °C'}</p>
      </div>

      <div className="field">
        <span className="label">Height</span>
        {units === 'Imperial' ? (
          <div className="row">
            <select className="select" aria-label="Feet" value={draft.height ? feet : ''}
              onChange={(e) => update({ height: feetInchesToCm(Number(e.target.value), draft.height ? inches : 0) })}>
              <option value="" disabled>Feet</option>
              {[3, 4, 5, 6, 7].map((f) => <option key={f} value={f}>{f} ft</option>)}
            </select>
            <select className="select" aria-label="Inches" value={draft.height ? inches : ''}
              onChange={(e) => update({ height: feetInchesToCm(draft.height ? feet : 5, Number(e.target.value)) })}>
              <option value="" disabled>Inches</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} in</option>)}
            </select>
          </div>
        ) : (
          <div className="row">
            <input className="input" type="number" inputMode="numeric" min={90} max={250} placeholder="170"
              value={draft.height ? Math.round(draft.height) : ''}
              onChange={(e) => update({ height: e.target.value ? Number(e.target.value) : null })} />
            <span className="muted">cm</span>
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="dob">Birth date</label>
        <input id="dob" className="input" type="date" max={today} min="1900-01-01" value={draft.birthdate ?? ''}
          onChange={(e) => update({ birthdate: e.target.value || null })} />
      </div>

      <div className="field">
        <span className="label">Gender</span>
        <div className="stack-sm">
          {GENDER_OPTIONS.map((g) => (
            <OptionRow key={g} radio title={g} selected={draft.gender === g}
              onClick={() => update({ gender: g, genderDesc: g === 'Prefer to self describe' ? draft.genderDesc ?? '' : null })} />
          ))}
        </div>
        {draft.gender === 'Prefer to self describe' && (
          <input className="input" placeholder="How do you describe yourself?" value={draft.genderDesc ?? ''}
            onChange={(e) => update({ genderDesc: e.target.value })} style={{ marginTop: 4 }} />
        )}
      </div>
    </div>
  );
}

function DietStep({ draft }: { draft: OnboardingDraft }) {
  const { update } = useOnboarding();
  return (
    <div className="grid-2">
      {DIET_OPTIONS.map((d) => {
        const selected = draft.diet === d;
        const image = DIET_IMAGES[d];
        return (
          <button key={d} type="button" aria-pressed={selected} onClick={() => update({ diet: d })}
            className="card card-button"
            style={{ padding: 0, overflow: 'hidden', borderWidth: 2, borderColor: selected ? 'var(--primary)' : 'var(--border)', position: 'relative' }}>
            <div style={{ aspectRatio: '4 / 3', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span aria-hidden="true" style={{ color: 'var(--text-3)', display: 'flex' }}><Icon name="utensils" size={40} /></span>
              )}
            </div>
            <div className="row-between" style={{ padding: '10px 12px', background: selected ? 'var(--primary-soft)' : undefined }}>
              <span style={{ fontWeight: 700 }}>{d}</span>
              {selected && <span style={{ color: 'var(--primary)' }}><Icon name="check" size={18} /></span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AllergensStep({ draft }: { draft: OnboardingDraft }) {
  const { update } = useOnboarding();
  const selected = draft.allergens ?? [];
  const toggle = (a: string) =>
    update({ allergens: selected.includes(a) ? selected.filter((x) => x !== a) : [...selected, a] });
  return (
    <div className="grid-2" style={{ gap: 8 }}>
      {ALLERGEN_OPTIONS.map((a) => (
        <OptionRow key={a} title={a} selected={selected.includes(a)} onClick={() => toggle(a)} />
      ))}
    </div>
  );
}

function HabitsStep({ draft }: { draft: OnboardingDraft }) {
  const { updateJson } = useOnboarding();
  const h = habits(draft);
  const set = (patch: Record<string, string>) => updateJson('goals', { habits: { ...h, ...patch } });
  return (
    <div className="stack-lg">
      <Question title="Would you consider yourself a calorie-sensitive person?">
        {CALORIE_SENSITIVE_OPTIONS.map((o) => (
          <OptionRow key={o} radio title={o} selected={h.calorieSensitive === o} onClick={() => set({ calorieSensitive: o })} />
        ))}
      </Question>
      <Question title="Would you consider yourself a choosy eater?">
        {CHOOSY_EATER_OPTIONS.map((o) => (
          <OptionRow key={o} radio title={o} selected={h.choosyEater === o} onClick={() => set({ choosyEater: o })} />
        ))}
      </Question>
    </div>
  );
}

function HealthGoalsStep({ draft }: { draft: OnboardingDraft }) {
  const { updateJson } = useOnboarding();
  const all = goals(draft).all ?? [];
  const toggle = (g: string) => updateJson('goals', { all: all.includes(g) ? all.filter((x) => x !== g) : [...all, g] });
  return (
    <div className="stack-sm">
      {HEALTH_GOAL_OPTIONS.map((g) => (
        <OptionRow key={g} title={g} selected={all.includes(g)} onClick={() => toggle(g)} />
      ))}
    </div>
  );
}

function PrimaryGoalStep({ draft }: { draft: OnboardingDraft }) {
  const { updateJson } = useOnboarding();
  const chosen = goals(draft).all ?? [];
  // Offer the goals picked on the previous step first
  const ordered = [...HEALTH_GOAL_OPTIONS].sort((a, b) => Number(chosen.includes(b)) - Number(chosen.includes(a)));
  return (
    <div className="stack-sm">
      {ordered.map((g) => (
        <OptionRow key={g} radio title={g} selected={goals(draft).primary === g} onClick={() => updateJson('goals', { primary: g })} />
      ))}
    </div>
  );
}

function WeightStep({ draft }: { draft: OnboardingDraft }) {
  const { update, updateJson } = useOnboarding();
  const units = draft.units === 'Metric' ? 'Metric' : 'Imperial';
  const unitLabel = units === 'Metric' ? 'kg' : 'lbs';
  const { targetWeight: target, weekly } = goals(draft);

  return (
    <div className="stack-lg">
      <Question title="What is your current weight?">
        <div className="row">
          <input className="input" type="number" inputMode="decimal" min={0} step={0.1} placeholder={units === 'Metric' ? '75' : '165'}
            value={draft.weight ? kgToDisplay(draft.weight, units) : ''}
            onChange={(e) => update({ weight: e.target.value ? displayToKg(Number(e.target.value), units) : null })} />
          <span className="muted" style={{ width: 28 }}>{unitLabel}</span>
        </div>
      </Question>
      <Question title="What is your goal weight?">
        <div className="row">
          <input className="input" type="number" inputMode="decimal" min={0} step={0.1} placeholder="Optional"
            value={target ? kgToDisplay(target, units) : ''}
            onChange={(e) => updateJson('goals', { targetWeight: e.target.value ? displayToKg(Number(e.target.value), units) : null })} />
          <span className="muted" style={{ width: 28 }}>{unitLabel}</span>
        </div>
        {draft.weight && target ? (
          <p className="hint">
            {target < draft.weight ? 'Lose' : target > draft.weight ? 'Gain' : 'Maintain'}{' '}
            {target !== draft.weight && formatWeight(Math.abs(draft.weight - target), units)}
          </p>
        ) : null}
      </Question>
      <Question title="What is your weekly weight goal?">
        {WEEKLY_WEIGHT_OPTIONS.map((lbs) => (
          <OptionRow key={lbs} radio title={weeklyWeightLabel(lbs, units)} selected={weekly === lbs}
            onClick={() => updateJson('goals', { weekly: lbs })} />
        ))}
      </Question>
    </div>
  );
}

function ActivityStep({ draft }: { draft: OnboardingDraft }) {
  const { update } = useOnboarding();
  return (
    <div className="stack-sm">
      {ACTIVITY_OPTIONS.map((a) => {
        const selected = draft.activeness === a.title;
        return (
          <button key={a.title} type="button" className="option" aria-pressed={selected} onClick={() => update({ activeness: a.title })}>
            <span style={{ width: 44, display: 'flex', justifyContent: 'center', color: selected ? 'var(--primary)' : 'var(--text-2)' }} aria-hidden="true"><Icon name={a.icon} size={28} /></span>
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 700 }}>{a.title}</span>
              <span className="small muted" style={{ display: 'block', marginTop: 2 }}>{a.body}</span>
            </span>
            {selected && <span style={{ color: 'var(--primary)' }}><Icon name="check" /></span>}
          </button>
        );
      })}
    </div>
  );
}

function DevicesStep() {
  return (
    <div className="stack">
      {DEVICE_OPTIONS.map((d) => (
        <div key={d.name} className="card row" style={{ gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEVICE_IMAGES[d.id]} alt="" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 10, background: '#fff' }} />
          <div className="grow">
            <div style={{ fontWeight: 700 }}>{d.name}</div>
            <div className="small muted">{d.body}</div>
          </div>
          <span className="badge">Coming soon</span>
        </div>
      ))}
      <p className="hint center">
        Currently we&apos;re only able to connect to these devices, and we&apos;re continually working to offer more connection options.
      </p>
    </div>
  );
}

function SubmissionStep({ draft }: { draft: OnboardingDraft }) {
  const units = draft.units === 'Metric' ? 'Metric' : 'Imperial';
  const g = goals(draft);
  const rows: [string, ReactNode][] = [
    ['Name', [draft.firstName, draft.lastName].filter(Boolean).join(' ') || '—'],
    ['Diet', draft.diet ?? '—'],
    ['Allergens', draft.allergens?.length ? draft.allergens.join(', ') : 'None'],
    ['Primary goal', g.primary ?? '—'],
    ['Weight', draft.weight ? formatWeight(draft.weight, units) : '—'],
    ['Weekly goal', g.weekly !== undefined ? weeklyWeightLabel(g.weekly, units) : '—'],
    ['Activity', draft.activeness ?? '—'],
  ];
  return (
    <div className="stack-lg">
      <div className="stack-sm center">
        <div style={{ color: 'var(--primary)', display: 'flex', justifyContent: 'center' }} aria-hidden="true"><Icon name="leaf" size={48} /></div>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Almost there!</h2>
        <p className="muted">Review your answers, then submit to finish setting up.</p>
      </div>
      <div className="list">
        {rows.map(([k, v]) => (
          <div key={k} className="list-row" style={{ minHeight: 44 }}>
            <span className="muted small" style={{ width: 110, flexShrink: 0 }}>{k}</span>
            <span className="grow" style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="stack-sm">
      <div>
        <h3 className="h3">{title}</h3>
        {hint && <p className="hint" style={{ marginTop: 2 }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}
