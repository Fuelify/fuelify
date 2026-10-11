'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MEAL_TYPES,
  type MealPlanMeal,
  type MealType,
  addDays,
  formatLong,
  formatMonth,
  fromISODate,
  startOfWeek,
  todayISO,
  weekDays,
} from '@fuelify/shared';
import { useMealPlanStore } from '@/lib/stores';
import { Icon, PageHeader } from '@/components/ui';
import { MealSheet } from '@/features/meals/MealSheet';
import { PlannedMealCard } from '@/features/meals/PlannedMealCard';
import { UpgradeBanner } from '@/features/premium/UpgradeBanner';
import { useMealPlanGenerator } from '@/features/meal-plan/useMealPlanGenerator';

// Mirrors: lib/screens/main/plan/screen.dart — week strip (MON–SUN) over a day view.
// Swipe the day view (or use the arrows) to move between days / weeks.
const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function PlanPage() {
  const meals = useMealPlanStore((s) => s.meals);
  const isLoading = useMealPlanStore((s) => s.isLoading);
  const error = useMealPlanStore((s) => s.error);
  const selectedDate = useMealPlanStore((s) => s.selectedDate);
  const setSelectedDate = useMealPlanStore((s) => s.setSelectedDate);
  const fetchMealPlan = useMealPlanStore((s) => s.fetchMealPlan);

  const today = todayISO();
  const weekStart = startOfWeek(selectedDate);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const generator = useMealPlanGenerator();
  // "Generate week" plans 7 days from today, or from the start of a future week being viewed
  // Once those days hold generated meals, the button clears them instead (meals you added stay)
  const generateFrom = weekStart > today ? weekStart : today;
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(generateFrom, i)), [generateFrom]);
  const weekGenerated = weekDates.some((d) => meals[d]?.some((m) => m.generated));
  const onWeekButton = () => {
    if (weekGenerated) {
      generator.clearDays(weekDates);
      return;
    }
    generator.generateDays(weekDates);
    if (selectedDate < today) setSelectedDate(today);
  };
  const canGenerateDay = selectedDate >= today;
  const generatingDay = generator.isGenerating(selectedDate);

  const [sheet, setSheet] = useState<{ meal?: MealPlanMeal; mealType?: MealType } | null>(null);

  // Load the visible week (plus neighbours so swiping is instant)
  useEffect(() => {
    fetchMealPlan(addDays(weekStart, -7), addDays(weekStart, 13));
  }, [weekStart, fetchMealPlan]);

  const dayMeals = meals[selectedDate] ?? [];
  const byType = useMemo(() => {
    const groups: Record<string, MealPlanMeal[]> = {};
    for (const m of dayMeals) (groups[m.mealType] ??= []).push(m);
    return groups;
  }, [dayMeals]);

  // Horizontal swipe on the day view changes day
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) setSelectedDate(addDays(selectedDate, dx < 0 ? 1 : -1));
  };

  const plannedCount = dayMeals.length;

  return (
    <>
      <PageHeader
        title="Plan"
        sub={formatMonth(weekStart)}
        right={
          <div className="row" style={{ gap: 6 }}>
            {selectedDate !== today && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(today)}>Today</button>
            )}
            <button
              className={`btn btn-sm ${weekGenerated ? 'btn-secondary' : 'btn-primary'}`}
              disabled={generator.isGenerating()}
              onClick={onWeekButton}
              title={weekGenerated ? 'Remove generated meals from the next 7 days' : generator.premium ? 'Plan the next 7 days' : 'Premium feature'}
            >
              <Icon name={weekGenerated ? 'trash' : 'sparkles'} size={16} />{' '}
              {generator.isGenerating() && !generatingDay ? (weekGenerated ? 'Clearing…' : 'Planning…') : weekGenerated ? 'Clear week' : 'Generate week'}
            </button>
          </div>
        }
      />

      <UpgradeBanner style={{ margin: '0 var(--gutter) 12px', flexShrink: 0 }} />

      {/* Week strip */}
      <div className="row" style={{ padding: '0 6px 10px', gap: 2, flexShrink: 0 }}>
        <button className="icon-btn" aria-label="Previous week" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
          <Icon name="chevronLeft" />
        </button>
        <div className="grow" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {days.map((d, i) => {
            const selected = d === selectedDate;
            const hasMeals = (meals[d]?.length ?? 0) > 0;
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                aria-pressed={selected}
                aria-label={formatLong(d)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '8px 0 6px', borderRadius: 12,
                  background: selected ? 'var(--primary)' : 'transparent',
                  color: selected ? 'var(--on-primary)' : d === today ? 'var(--primary)' : 'var(--text)',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, opacity: selected ? 0.8 : 0.6 }}>{DOW[i]}</span>
                <span style={{ fontSize: 17, fontWeight: 800 }}>{fromISODate(d).getDate()}</span>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: hasMeals ? (selected ? 'var(--on-primary)' : 'var(--accent)') : 'transparent' }} />
              </button>
            );
          })}
        </div>
        <button className="icon-btn" aria-label="Next week" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
          <Icon name="chevronRight" />
        </button>
      </div>

      {/* Day view */}
      <div className="screen-scroll" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ borderTop: '1px solid var(--border)' }}>
        <div className="screen-pad stack" style={{ paddingBottom: 32 }}>
          <div className="row-between">
            <div>
              <h2 className="h2">{selectedDate === today ? 'Today' : formatLong(selectedDate)}</h2>
              <p className="small muted">
                {isLoading && plannedCount === 0 ? 'Loading…' : `${plannedCount} meal${plannedCount === 1 ? '' : 's'} planned`}
              </p>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {canGenerateDay && (
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={generator.isGenerating()}
                  onClick={() => generator.generateDays([selectedDate])}
                  aria-label={plannedCount > 0 ? 'Regenerate this day' : 'Generate this day'}
                >
                  <Icon name={plannedCount > 0 ? 'refresh' : 'sparkles'} size={16} /> {generatingDay ? 'Planning…' : plannedCount > 0 ? 'Regenerate' : 'Generate'}
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => setSheet({})} aria-label="Add meal">
                <Icon name="plus" /> Add
              </button>
            </div>
          </div>

          {error && <div className="alert">{error}</div>}
          {generator.error && <div className="alert" role="alert">{generator.error}</div>}
          {generator.message && (
            <div className="alert alert-info row" role="status" style={{ gap: 8 }}>
              <span className="grow">{generator.message} Meals you added yourself are kept.</span>
              <button className="icon-btn" aria-label="Dismiss" style={{ width: 28, height: 28, color: 'inherit' }} onClick={generator.clearResult}>
                <Icon name="x" size={16} />
              </button>
            </div>
          )}

          {MEAL_TYPES.map((t) => {
            const list = byType[t.value] ?? [];
            return (
              <section key={t.value} className="stack-sm">
                <div className="section-title" style={{ margin: '8px 0 0' }}>
                  <span className="row" style={{ gap: 6 }}><Icon name={t.icon} size={16} /> {t.label}</span>
                  <button className="btn btn-ghost btn-sm" style={{ height: 28 }} onClick={() => setSheet({ mealType: t.value })}>
                    <Icon name="plus" /> Add
                  </button>
                </div>
                {list.length === 0 ? (
                  <button
                    className="card card-button small faint"
                    style={{ borderStyle: 'dashed', background: 'transparent', textAlign: 'center' }}
                    onClick={() => setSheet({ mealType: t.value })}
                  >
                    Nothing planned for {t.label.toLowerCase()}
                  </button>
                ) : (
                  list.map((m) => <PlannedMealCard key={m.id} meal={m} onOpen={() => setSheet({ meal: m })} />)
                )}
              </section>
            );
          })}
        </div>
      </div>

      <MealSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        meal={sheet?.meal}
        preset={sheet && !sheet.meal ? { date: selectedDate, mealType: sheet.mealType } : undefined}
      />
    </>
  );
}
