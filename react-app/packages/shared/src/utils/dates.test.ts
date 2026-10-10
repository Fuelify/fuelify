import { describe, expect, it } from 'vitest';
import { addDays, ageFromBirthdate, daysUntil, fromISODate, greeting, startOfWeek, toISODate, weekDays } from './dates';

describe('dates', () => {
  it('round-trips local YYYY-MM-DD without a UTC shift', () => {
    const d = new Date(2026, 9, 10, 23, 30); // 11:30pm local — toISOString would roll to the 11th in US zones
    expect(toISODate(d)).toBe('2026-10-10');
    expect(toISODate(fromISODate('2026-10-10'))).toBe('2026-10-10');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('starts weeks on Monday like the Flutter plan view', () => {
    expect(startOfWeek('2026-10-10')).toBe('2026-10-05'); // Saturday → Monday
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05'); // Sunday belongs to the same week
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05');
    expect(weekDays('2026-10-05')).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
  });

  it('counts days until a date relative to today', () => {
    expect(daysUntil('2026-10-12', '2026-10-10')).toBe(2);
    expect(daysUntil('2026-10-08', '2026-10-10')).toBe(-2);
  });

  it('computes age only after the birthday has passed', () => {
    expect(ageFromBirthdate('1992-10-11', new Date(2026, 9, 10))).toBe(33);
    expect(ageFromBirthdate('1992-10-10', new Date(2026, 9, 10))).toBe(34);
  });

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 13))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 0, 1, 20))).toBe('Good evening');
  });
});
