'use client';

import { useEffect } from 'react';
import { useMealPlanStore } from '../../providers';

// Mirrors: lib/screens/main/plan/screen.dart
export default function PlanPage() {
  const meals = useMealPlanStore((s) => s.meals);
  const isLoading = useMealPlanStore((s) => s.isLoading);
  const selectedDate = useMealPlanStore((s) => s.selectedDate);
  const setSelectedDate = useMealPlanStore((s) => s.setSelectedDate);
  const fetchDayMealPlan = useMealPlanStore((s) => s.fetchDayMealPlan);

  useEffect(() => {
    fetchDayMealPlan(selectedDate);
  }, [selectedDate, fetchDayMealPlan]);

  const todayMeals = meals[selectedDate] ?? [];

  return (
    <div>
      <h1>Meal Plan</h1>

      {/* Date selector */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
      </div>

      {/* Meal list */}
      {isLoading ? (
        <p>Loading meals...</p>
      ) : todayMeals.length === 0 ? (
        <p>No meals planned for this day.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {todayMeals.map((meal) => (
            <li key={meal.id} style={{ padding: 12, marginBottom: 8, border: '1px solid #ddd', borderRadius: 8 }}>
              <strong>{meal.title}</strong>
              <p>{meal.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
