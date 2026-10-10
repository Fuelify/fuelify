// Local-time date helpers (YYYY-MM-DD strings, as stored in Postgres DATE columns)

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

export function daysUntil(s: string): number {
  return Math.round((fromISODate(s).getTime() - fromISODate(todayISO()).getTime()) / 86400000);
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
