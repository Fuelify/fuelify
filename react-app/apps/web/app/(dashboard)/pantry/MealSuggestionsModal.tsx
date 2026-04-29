'use client';

// Modal that requests AI-generated meal ideas from the user's pantry and
// displays them as expandable cards. Prioritizes partially-opened items.

import { useCallback, useState } from 'react';
import { useMealSuggestionStore } from '../../providers';
import type { MealSuggestion, PantryItem } from '@fuelify/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  pantryItems: PantryItem[];
}

const MEAL_TYPES = ['Any', 'Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

export function MealSuggestionsModal({ open, onClose, pantryItems }: Props) {
  const suggestions = useMealSuggestionStore((s) => s.suggestions);
  const prioritizedItems = useMealSuggestionStore((s) => s.prioritizedItems);
  const isGenerating = useMealSuggestionStore((s) => s.isGenerating);
  const error = useMealSuggestionStore((s) => s.error);
  const generatedAt = useMealSuggestionStore((s) => s.generatedAt);
  const generate = useMealSuggestionStore((s) => s.generate);

  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]>('Any');
  const [dietary, setDietary] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const openItemCount = pantryItems.filter(
    (i) => i.status === 'open' && i.remainingPct < 100,
  ).length;

  const handleGenerate = useCallback(async () => {
    setExpanded(null);
    await generate(pantryItems, {
      mealType: mealType === 'Any' ? undefined : mealType.toLowerCase(),
      dietary: dietary.trim() || undefined,
      count: 3,
    });
  }, [generate, pantryItems, mealType, dietary]);

  if (!open) return null;

  const hasContent = suggestions.length > 0 && !isGenerating;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={s.title}>🍽️ Meal Ideas</h2>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <p style={s.subtitle}>
          {pantryItems.length} pantry items · {openItemCount} partially opened
        </p>

        <div style={s.controls}>
          <div style={{ marginBottom: 10 }}>
            <span style={s.label}>Meal type</span>
            <div style={s.chipRow}>
              {MEAL_TYPES.map((m) => (
                <button
                  key={m}
                  style={{ ...s.chip, ...(mealType === m ? s.chipActive : {}) }}
                  onClick={() => setMealType(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <span style={s.label}>Dietary (optional)</span>
            <input
              style={s.input}
              placeholder="e.g. vegetarian, gluten-free"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
            />
          </div>

          <button
            style={{
              ...s.generateBtn,
              ...(isGenerating || pantryItems.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
            }}
            onClick={handleGenerate}
            disabled={isGenerating || pantryItems.length === 0}
          >
            {isGenerating
              ? 'Generating…'
              : hasContent
              ? 'Regenerate'
              : 'Suggest Meals'}
          </button>

          {pantryItems.length === 0 && (
            <p style={s.hint}>Add items to your pantry to get suggestions.</p>
          )}
        </div>

        <div style={s.scroll}>
          {error && <div style={s.error}>{error}</div>}

          {hasContent && prioritizedItems.length > 0 && (
            <div style={s.priorityBanner}>
              <strong style={{ color: '#4DB6AC', fontSize: 12 }}>Using up first:</strong>{' '}
              <span style={{ color: '#ccc', fontSize: 13 }}>
                {prioritizedItems.join(' · ')}
              </span>
            </div>
          )}

          {suggestions.map((sug, idx) => (
            <SuggestionCard
              key={idx}
              suggestion={sug}
              expanded={expanded === idx}
              onToggle={() => setExpanded(expanded === idx ? null : idx)}
            />
          ))}

          {!isGenerating && suggestions.length === 0 && !error && (
            <p style={s.emptyText}>
              Click "Suggest Meals" to get recipe ideas that use what you already have.
            </p>
          )}

          {generatedAt && hasContent && (
            <p style={s.footnote}>
              Generated {new Date(generatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  expanded,
  onToggle,
}: {
  suggestion: MealSuggestion;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pantryIngredients = suggestion.ingredients.filter((i) => !i.missing);
  const missingIngredients = suggestion.ingredients.filter((i) => i.missing);
  const openIngredients = suggestion.ingredients.filter((i) => i.usesOpenItem);

  return (
    <div style={s.card}>
      <div style={s.cardHeader} onClick={onToggle}>
        <div style={{ flex: 1 }}>
          <div style={s.cardTitle}>{suggestion.title}</div>
          <div style={s.cardDesc}>{suggestion.description}</div>
          <div style={s.metaRow}>
            {suggestion.mealType && <span style={s.metaTag}>{suggestion.mealType}</span>}
            {suggestion.estimatedTime && (
              <span style={s.metaTag}>⏱ {suggestion.estimatedTime}</span>
            )}
            {typeof suggestion.servings === 'number' && (
              <span style={s.metaTag}>🍴 {suggestion.servings}</span>
            )}
          </div>
        </div>
        <div style={s.scoreWrap}>
          <div style={s.scoreNum}>{suggestion.useItUpScore}</div>
          <div style={s.scoreLabel}>use-it-up</div>
        </div>
      </div>

      {openIngredients.length > 0 && (
        <div style={s.openHint}>
          Uses {openIngredients.length} open item{openIngredients.length !== 1 ? 's' : ''}:{' '}
          {openIngredients.map((i) => i.name).join(', ')}
        </div>
      )}

      {expanded && (
        <div style={s.expanded}>
          <div style={s.sectionTitle}>From your pantry</div>
          {pantryIngredients.length === 0 ? (
            <div style={s.ingEmpty}>—</div>
          ) : (
            pantryIngredients.map((ing, i) => (
              <div key={i} style={s.ingredient}>
                • {ing.name}
                {ing.amount ? ` — ${ing.amount}` : ''}
                {ing.usesOpenItem ? '  🔓' : ''}
              </div>
            ))
          )}

          {missingIngredients.length > 0 && (
            <>
              <div style={s.sectionTitle}>You'll need</div>
              {missingIngredients.map((ing, i) => (
                <div key={i} style={{ ...s.ingredient, color: '#FFBD73' }}>
                  • {ing.name}
                  {ing.amount ? ` — ${ing.amount}` : ''}
                </div>
              ))}
            </>
          )}

          <div style={s.sectionTitle}>Instructions</div>
          {suggestion.steps.map((step, i) => (
            <div key={i} style={s.step}>
              {i + 1}. {step}
            </div>
          ))}

          {suggestion.notes && <div style={s.notes}>💡 {suggestion.notes}</div>}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    backgroundColor: '#202020',
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 16px 0 16px',
  },
  title: { color: '#FFBD73', fontSize: 22, fontWeight: 700, margin: 0 },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
  },
  subtitle: { color: '#aaa', fontSize: 13, margin: '4px 16px 12px 16px' },

  controls: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 12,
    margin: '0 16px 12px 16px',
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 6,
    display: 'block',
  },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    padding: '6px 12px',
    borderRadius: 14,
    backgroundColor: '#333',
    color: '#ccc',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
  },
  chipActive: { backgroundColor: '#FFBD73', color: '#202020', fontWeight: 600 },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #444',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
  },
  generateBtn: {
    width: '100%',
    backgroundColor: '#FFBD73',
    color: '#202020',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
  },
  hint: { color: '#888', fontSize: 12, textAlign: 'center' as const, marginTop: 8 },

  scroll: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0 16px 16px 16px',
  },
  error: { color: '#ff6b6b', fontSize: 13, padding: 12 },

  priorityBanner: {
    backgroundColor: '#2a2a2a',
    borderLeft: '3px solid #4DB6AC',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    cursor: 'pointer',
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 700 },
  cardDesc: { color: '#bbb', fontSize: 13, marginTop: 2 },
  metaRow: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' as const },
  metaTag: { color: '#888', fontSize: 11 },

  scoreWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: 56,
  },
  scoreNum: { color: '#FFBD73', fontSize: 22, fontWeight: 700 },
  scoreLabel: { color: '#888', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },

  openHint: { color: '#4DB6AC', fontSize: 12, marginTop: 8 },

  expanded: {
    borderTop: '1px solid #333',
    marginTop: 10,
    paddingTop: 10,
  },
  sectionTitle: {
    color: '#FFBD73',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  ingredient: { color: '#ddd', fontSize: 13, lineHeight: '20px' as const },
  ingEmpty: { color: '#666', fontSize: 13 },
  step: { color: '#ddd', fontSize: 13, lineHeight: '20px' as const, marginBottom: 4 },
  notes: {
    color: '#aaa',
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginTop: 10,
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },

  emptyText: { color: '#888', textAlign: 'center' as const, fontSize: 13, marginTop: 20 },
  footnote: { color: '#666', fontSize: 11, textAlign: 'center' as const, marginTop: 12 },
};
