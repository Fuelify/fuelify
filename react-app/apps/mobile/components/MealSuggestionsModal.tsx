// Modal that requests AI-generated meal ideas from the user's pantry and
// displays them as expandable cards. Prioritizes partially-opened items.

import { useCallback, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { MealSuggestion, PantryItem } from '@fuelify/shared';
import { useMealSuggestionStore } from '../hooks/useStores';

interface Props {
  visible: boolean;
  onClose: () => void;
  pantryItems: PantryItem[];
}

const MEAL_TYPES = ['Any', 'Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

export function MealSuggestionsModal({ visible, onClose, pantryItems }: Props) {
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

  const hasContent = suggestions.length > 0 && !isGenerating;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🍽️ Meal Ideas</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          {pantryItems.length} pantry items · {openItemCount} partially opened
        </Text>

        {/* Controls */}
        <View style={styles.controls}>
          <Text style={styles.label}>Meal type</Text>
          <View style={styles.chipRow}>
            {MEAL_TYPES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, mealType === m && styles.chipActive]}
                onPress={() => setMealType(m)}
              >
                <Text style={[styles.chipText, mealType === m && styles.chipTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Dietary (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. vegetarian, gluten-free"
            placeholderTextColor="#888"
            value={dietary}
            onChangeText={setDietary}
          />

          <TouchableOpacity
            style={[styles.generateBtn, (isGenerating || pantryItems.length === 0) && { opacity: 0.5 }]}
            onPress={handleGenerate}
            disabled={isGenerating || pantryItems.length === 0}
          >
            {isGenerating ? (
              <ActivityIndicator color="#202020" />
            ) : (
              <Text style={styles.generateBtnText}>
                {hasContent ? 'Regenerate' : 'Suggest Meals'}
              </Text>
            )}
          </TouchableOpacity>

          {pantryItems.length === 0 && (
            <Text style={styles.hint}>Add items to your pantry to get suggestions.</Text>
          )}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {error && <Text style={styles.error}>{error}</Text>}

          {hasContent && prioritizedItems.length > 0 && (
            <View style={styles.priorityBanner}>
              <Text style={styles.priorityBannerTitle}>Using up first:</Text>
              <Text style={styles.priorityBannerItems}>
                {prioritizedItems.join(' · ')}
              </Text>
            </View>
          )}

          {suggestions.map((s, idx) => (
            <SuggestionCard
              key={idx}
              suggestion={s}
              expanded={expanded === idx}
              onToggle={() => setExpanded(expanded === idx ? null : idx)}
            />
          ))}

          {!isGenerating && suggestions.length === 0 && !error && (
            <Text style={styles.emptyText}>
              Tap "Suggest Meals" to get recipe ideas that use what you already have.
            </Text>
          )}

          {generatedAt && hasContent && (
            <Text style={styles.footnote}>
              Generated {new Date(generatedAt).toLocaleTimeString()}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    <View style={styles.card}>
      <TouchableOpacity onPress={onToggle} style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{suggestion.title}</Text>
          <Text style={styles.cardDesc}>{suggestion.description}</Text>
          <View style={styles.metaRow}>
            {suggestion.mealType && (
              <Text style={styles.metaTag}>{suggestion.mealType}</Text>
            )}
            {suggestion.estimatedTime && (
              <Text style={styles.metaTag}>⏱ {suggestion.estimatedTime}</Text>
            )}
            {typeof suggestion.servings === 'number' && (
              <Text style={styles.metaTag}>🍴 {suggestion.servings}</Text>
            )}
          </View>
        </View>
        <View style={styles.scoreWrap}>
          <Text style={styles.scoreNum}>{suggestion.useItUpScore}</Text>
          <Text style={styles.scoreLabel}>use-it-up</Text>
        </View>
      </TouchableOpacity>

      {openIngredients.length > 0 && (
        <Text style={styles.openHint}>
          Uses {openIngredients.length} open item{openIngredients.length !== 1 ? 's' : ''}:{' '}
          {openIngredients.map((i) => i.name).join(', ')}
        </Text>
      )}

      {expanded && (
        <View style={styles.expanded}>
          <Text style={styles.sectionTitle}>From your pantry</Text>
          {pantryIngredients.length === 0 ? (
            <Text style={styles.ingEmpty}>—</Text>
          ) : (
            pantryIngredients.map((ing, i) => (
              <Text key={i} style={styles.ingredient}>
                • {ing.name}
                {ing.amount ? ` — ${ing.amount}` : ''}
                {ing.usesOpenItem ? '  🔓' : ''}
              </Text>
            ))
          )}

          {missingIngredients.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>You'll need</Text>
              {missingIngredients.map((ing, i) => (
                <Text key={i} style={[styles.ingredient, styles.ingredientMissing]}>
                  • {ing.name}
                  {ing.amount ? ` — ${ing.amount}` : ''}
                </Text>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Instructions</Text>
          {suggestion.steps.map((step, i) => (
            <Text key={i} style={styles.step}>
              {i + 1}. {step}
            </Text>
          ))}

          {suggestion.notes && <Text style={styles.notes}>💡 {suggestion.notes}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#202020', paddingTop: 48, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#FFBD73', fontSize: 24, fontWeight: '700' },
  closeText: { color: '#ccc', fontSize: 15, padding: 4 },
  subtitle: { color: '#aaa', fontSize: 13, marginTop: 4, marginBottom: 12 },

  controls: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 12, marginBottom: 12 },
  label: { color: '#aaa', fontSize: 12, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#333',
  },
  chipActive: { backgroundColor: '#FFBD73' },
  chipText: { color: '#ccc', fontSize: 12 },
  chipTextActive: { color: '#202020', fontWeight: '600' },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    fontSize: 14,
    marginBottom: 10,
  },
  generateBtn: {
    backgroundColor: '#FFBD73',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateBtnText: { color: '#202020', fontWeight: '700', fontSize: 15 },
  hint: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 8 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  error: { color: '#ff6b6b', fontSize: 13, padding: 12 },

  priorityBanner: {
    backgroundColor: '#2a2a2a',
    borderLeftWidth: 3,
    borderLeftColor: '#4DB6AC',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  priorityBannerTitle: { color: '#4DB6AC', fontWeight: '700', fontSize: 12 },
  priorityBannerItems: { color: '#ccc', fontSize: 13, marginTop: 2 },

  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardDesc: { color: '#bbb', fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaTag: { color: '#888', fontSize: 11 },

  scoreWrap: { alignItems: 'center', minWidth: 56 },
  scoreNum: { color: '#FFBD73', fontSize: 22, fontWeight: '700' },
  scoreLabel: { color: '#888', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },

  openHint: { color: '#4DB6AC', fontSize: 12, marginTop: 8 },

  expanded: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 10,
    paddingTop: 10,
  },
  sectionTitle: {
    color: '#FFBD73',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  ingredient: { color: '#ddd', fontSize: 13, lineHeight: 20 },
  ingredientMissing: { color: '#FFBD73' },
  ingEmpty: { color: '#666', fontSize: 13 },
  step: { color: '#ddd', fontSize: 13, lineHeight: 20, marginBottom: 4 },
  notes: {
    color: '#aaa',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },

  emptyText: { color: '#888', textAlign: 'center', fontSize: 13, marginTop: 20 },
  footnote: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 12 },
});
