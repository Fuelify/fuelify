// Local-time date helpers for YYYY-MM-DD strings (Postgres DATE columns).
// Always local time: toISOString() would give the UTC date and shift evenings to tomorrow.

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(s: string, days: number): string {
  const d = fromISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday of the week containing the date (matches the Flutter plan view) */
export function startOfWeek(s: string): string {
  const d = fromISODate(s);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatLong(s: string): string {
  return fromISODate(s).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatMonth(s: string): string {
  return fromISODate(s).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Whole days from today until the date (negative when in the past). */
export function daysUntil(s: string, today: string = todayISO()): number {
  return Math.round((fromISODate(s).getTime() - fromISODate(today).getTime()) / 86400000);
}

/** Age in whole years on `today` for a YYYY-MM-DD birth date. */
export function ageFromBirthdate(birthdate: string, today: Date = new Date()): number {
  const b = fromISODate(birthdate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
