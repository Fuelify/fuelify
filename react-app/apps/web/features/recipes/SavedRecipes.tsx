'use client';

import { useMemo, useState } from 'react';
import { savedRecipes, totalTimeMinutes, type Recipe } from '@fuelify/shared';
import { useRecipeStore } from '@/lib/stores';
import { EmptyState, FoodTile, Icon, Sheet } from '@/components/ui';
import { RecipeImport } from './RecipeImport';

// Liked and favorited recipes — replaces the Flutter "Food" tab.

export function SavedRecipes({ recipes, onOpen, onDiscover }: { recipes: Recipe[]; onOpen: (r: Recipe) => void; onDiscover: () => void }) {
  const classifications = useRecipeStore((s) => s.classifications);
  const [filter, setFilter] = useState<'all' | 'favorited' | 'liked'>('all');
  const [importing, setImporting] = useState(false);

  const saved = useMemo(() => savedRecipes(recipes, classifications, filter), [recipes, classifications, filter]);

  return (
    <>
    <div className="screen-scroll">
      <div className="screen-pad stack" style={{ paddingTop: 0 }}>
        <div className="row-between" style={{ gap: 8 }}>
          <div className="chips">
            {(['all', 'favorited', 'liked'] as const).map((f) => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'favorited' ? 'Favorites' : 'Liked'}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setImporting(true)} style={{ flexShrink: 0 }}>
            <Icon name="download" size={16} /> Import
          </button>
        </div>
        {saved.length === 0 ? (
          <EmptyState icon="bookmark" title="Nothing saved yet" action={<button className="btn btn-primary" onClick={onDiscover}>Start discovering</button>}>
            Like or favorite recipes in Discover and they&apos;ll show up here.
          </EmptyState>
        ) : (
          <div className="stack-sm">
            {saved.map(({ recipe, kind }) => (
              <button key={recipe.id} className="card card-button row" style={{ gap: 12 }} onClick={() => onOpen(recipe)}>
                <FoodTile title={recipe.title} imageUrl={recipe.imageUrl} size={56} />
                <div className="grow stack-sm" style={{ gap: 4 }}>
                  <div className="truncate" style={{ fontWeight: 700 }}>{recipe.title}</div>
                  <div className="small muted">
                    {[recipe.cuisine, recipe.calories != null ? `${recipe.calories} kcal` : null, totalTimeMinutes(recipe) ? `${totalTimeMinutes(recipe)} min` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span style={{ color: kind === 'favorited' ? 'var(--tertiary)' : 'var(--accent)' }}>
                  <Icon name={kind === 'favorited' ? 'star' : 'heart'} filled size={20} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    <Sheet open={importing} onClose={() => setImporting(false)} title="Import a recipe">
      {/* Remount per opening so the form starts fresh */}
      {importing && (
        <RecipeImport
          onSaved={(recipe) => {
            setImporting(false);
            onOpen(recipe);
          }}
        />
      )}
    </Sheet>
    </>
  );
}
