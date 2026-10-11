'use client';

import { useState } from 'react';
import {
  DIET_OPTIONS,
  MEAL_TYPES,
  parseRecipeText,
  recipeUrlError,
  type MealType,
  type Recipe,
  type RecipeDraft,
} from '@fuelify/shared';
import { useRecipeStore, useSupabase } from '@/lib/stores';
import { FoodImage, Icon, Segmented, Spinner } from '@/components/ui';

type Source = 'link' | 'text';

/** Ask the server to read a recipe page (it fetches on our behalf). */
function useFetchRecipe() {
  const supabase = useSupabase();
  return async (url: string): Promise<{ recipe?: RecipeDraft; error?: string; code?: 'blocked'; partial?: Partial<RecipeDraft> }> => {
    const { data } = await supabase.auth.getSession();
    const res = await fetch('/api/recipes/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    if (!res) return { error: 'Couldn’t reach Fuelify. Check your connection.' };
    return res.json().catch(() => ({ error: 'Something went wrong importing that recipe.' }));
  };
}

/**
 * Import a recipe from a link or pasted text, review it, then save it to the
 * user's recipes. `onSaved` receives the stored recipe (e.g. to add it to the plan).
 */
export function RecipeImport({ onSaved, saveLabel = 'Save recipe' }: { onSaved: (recipe: Recipe) => void; saveLabel?: string }) {
  const fetchRecipe = useFetchRecipe();
  const saveImportedRecipe = useRecipeStore((s) => s.saveImportedRecipe);
  const [source, setSource] = useState<Source>('link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  // A link the site wouldn't let us fetch; kept as the source of the pasted text
  const [pastedFrom, setPastedFrom] = useState<string | null>(null);

  const read = async () => {
    setError(null);
    if (source === 'text') {
      const parsed = parseRecipeText(text);
      if (!parsed) setError('Couldn’t find ingredients or steps. Put the title on the first line, then “Ingredients” and “Instructions” sections.');
      setDraft(parsed && pastedFrom ? { ...parsed, sourceUrl: pastedFrom } : parsed);
      return;
    }
    const problem = recipeUrlError(url);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    const res = await fetchRecipe(url.trim());
    setBusy(false);
    if (res.recipe) setDraft(res.recipe);
    else {
      setError(res.error ?? 'Couldn’t import that recipe.');
      // Keep what the page did tell us, and let the user paste the rest
      if (res.partial?.title) {
        setText(`${res.partial.title}\n\nIngredients\n\nInstructions\n`);
        setSource('text');
      } else if (res.code === 'blocked') {
        setPastedFrom(url.trim());
        setSource('text');
      }
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const saved = await saveImportedRecipe(draft);
    setBusy(false);
    if (saved) onSaved(saved);
    else setError('Couldn’t save the recipe. Try again.');
  };

  if (draft) {
    return <DraftReview draft={draft} onChange={setDraft} onBack={() => setDraft(null)} onSave={save} busy={busy} error={error} saveLabel={saveLabel} />;
  }

  return (
    <div className="stack-sm">
      <Segmented
        options={[{ value: 'link', label: 'From a link' }, { value: 'text', label: 'Paste text' }]}
        value={source}
        onChange={(s) => { setSource(s); setError(null); }}
      />
      {source === 'link' ? (
        <div className="field">
          <label htmlFor="import-url">Recipe link</label>
          <input id="import-url" className="input" type="url" inputMode="url" placeholder="https://www.example.com/best-chili"
            value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && read()} />
          <span className="hint">Works with most recipe sites and blogs.</span>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="import-text">Recipe</label>
          <textarea id="import-text" className="textarea" rows={9} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Grandma’s chili\n\nIngredients\n1 lb ground beef\n1 can kidney beans\n\nInstructions\nBrown the beef…'} />
          <span className="hint">
            {pastedFrom
              ? 'On the recipe page: select all, copy, then paste here. Extra page text is ignored.'
              : 'From a cookbook, a note, a message or a whole recipe page. Title first, then ingredients and steps.'}
          </span>
        </div>
      )}
      {error && <div className="alert" role="alert">{error}</div>}
      <button className="btn btn-primary btn-block" onClick={read} disabled={busy || (source === 'link' ? !url.trim() : !text.trim())}>
        {busy ? <><Spinner /> Reading recipe…</> : <><Icon name="download" size={18} /> Get recipe</>}
      </button>
    </div>
  );
}

function DraftReview({
  draft, onChange, onBack, onSave, busy, error, saveLabel,
}: {
  draft: RecipeDraft; onChange: (d: RecipeDraft) => void; onBack: () => void; onSave: () => void; busy: boolean; error: string | null; saveLabel: string;
}) {
  const toggleMeal = (t: MealType) => {
    const on = draft.mealTypes.includes(t);
    if (on && draft.mealTypes.length === 1) return; // keep at least one
    // Keep the current preferred slot first; others follow in day order
    const next = on ? draft.mealTypes.filter((m) => m !== t) : [...draft.mealTypes, t];
    const [first, ...rest] = next;
    const order = MEAL_TYPES.map((m) => m.value);
    onChange({ ...draft, mealTypes: [first, ...rest.sort((a, b) => order.indexOf(a) - order.indexOf(b))] });
  };
  const time = (draft.prepTimeMinutes ?? 0) + (draft.cookTimeMinutes ?? 0);
  const facts = [
    `${draft.ingredients.length} ingredient${draft.ingredients.length === 1 ? '' : 's'}`,
    `${draft.steps.length} step${draft.steps.length === 1 ? '' : 's'}`,
    time ? `${time} min` : null,
    draft.calories ? `${draft.calories} kcal` : null,
    draft.servings ? `serves ${draft.servings}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="stack-sm">
      <FoodImage title={draft.title} imageUrl={draft.imageUrl} iconSize={44} style={{ height: 150, borderRadius: 'var(--radius)' }} />
      <div className="field">
        <label htmlFor="draft-title">Name</label>
        <input id="draft-title" className="input" value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} />
      </div>
      <p className="small muted">{facts}</p>
      {draft.sourceUrl && <p className="tiny faint truncate">From {new URL(draft.sourceUrl).hostname.replace(/^www\./, '')}</p>}

      <span className="label">Good for</span>
      <div className="chips" role="group" aria-label="Good for">
        {MEAL_TYPES.map((t) => (
          <button key={t.value} className="chip" aria-pressed={draft.mealTypes.includes(t.value)} onClick={() => toggleMeal(t.value)}>
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="draft-diet">Diet</label>
        <select id="draft-diet" className="select" value={draft.dietType ?? ''} onChange={(e) => onChange({ ...draft, dietType: e.target.value || null })}>
          <option value="">Not sure</option>
          {DIET_OPTIONS.filter((d) => d !== 'Other').map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="hint">Set this so meal plans for vegetarian or vegan households can use it.</span>
      </div>

      {draft.ingredients.length > 0 && (
        <details className="card">
          <summary style={{ fontWeight: 600, cursor: 'pointer' }}>Ingredients</summary>
          <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>{draft.ingredients.map((i, n) => <li key={n}>{i}</li>)}</ul>
        </details>
      )}
      {draft.steps.length > 0 && (
        <details className="card">
          <summary style={{ fontWeight: 600, cursor: 'pointer' }}>Steps</summary>
          <ol className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>{draft.steps.map((s, n) => <li key={n} style={{ marginBottom: 4 }}>{s}</li>)}</ol>
        </details>
      )}

      {error && <div className="alert" role="alert">{error}</div>}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-secondary" onClick={onBack} disabled={busy}>Back</button>
        <button className="btn btn-primary grow" onClick={onSave} disabled={busy || !draft.title.trim()}>{busy ? 'Saving…' : saveLabel}</button>
      </div>
    </div>
  );
}

