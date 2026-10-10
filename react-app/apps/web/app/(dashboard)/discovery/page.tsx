'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Recipe } from '@fuelify/shared';
import { useProfileStore, useRecipeStore } from '@/lib/stores';
import { EmptyState, LoadingBlock, PageHeader, Segmented } from '@/components/ui';
import { DiscoverDeck } from '@/features/recipes/DiscoverDeck';
import { RecipeSheet } from '@/features/recipes/RecipeSheet';
import { SavedRecipes } from '@/features/recipes/SavedRecipes';

// Mirrors: lib/screens/discovery_screen.dart — swipe cards to teach Fuelify your taste:
// drag right = like, left = dislike, up = favorite. "Saved" replaces the old Food tab.

type View = 'discover' | 'saved';

export default function DiscoveryPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Discovery />
    </Suspense>
  );
}

function Discovery() {
  const router = useRouter();
  const params = useSearchParams();
  const view: View = params.get('view') === 'saved' ? 'saved' : 'discover';

  const recipes = useRecipeStore((s) => s.recipes);
  const classifications = useRecipeStore((s) => s.classifications);
  const isLoading = useRecipeStore((s) => s.isLoading);
  const error = useRecipeStore((s) => s.error);
  const loadCatalog = useRecipeStore((s) => s.loadCatalog);
  const getClassifiedRecipes = useRecipeStore((s) => s.getClassifiedRecipes);
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState<Recipe | null>(null);

  useEffect(() => {
    Promise.all([loadCatalog(), getClassifiedRecipes(), profile ? null : fetchProfile()]).finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedCount = classifications.filter((c) => c.classification !== 'disliked').length;
  const setView = (v: View) => router.replace(v === 'saved' ? '/discovery?view=saved' : '/discovery');

  return (
    <>
      <PageHeader title={view === 'saved' ? 'Saved' : 'Discover'} sub={view === 'discover' ? 'Swipe to teach Fuelify your taste' : 'Recipes you liked and favorited'} />
      <div style={{ padding: '0 var(--gutter) 12px', flexShrink: 0 }}>
        <Segmented<View>
          options={[{ value: 'discover', label: 'Discover' }, { value: 'saved', label: savedCount ? `Saved (${savedCount})` : 'Saved' }]}
          value={view}
          onChange={setView}
        />
      </div>

      {error && <div className="alert" style={{ margin: '0 var(--gutter) 12px' }}>{error}</div>}

      {!loaded && isLoading ? (
        <LoadingBlock />
      ) : recipes.length === 0 ? (
        <div className="center-fill">
          <EmptyState icon="compass" title="No recipes yet">
            The recipe catalog is empty. Run supabase/seed/recipes.sql (see supabase/seed/README.md) to load it.
          </EmptyState>
        </div>
      ) : view === 'discover' ? (
        <DiscoverDeck recipes={recipes} diet={profile?.diet ?? null} onOpen={setDetail} onSeeSaved={() => setView('saved')} />
      ) : (
        <SavedRecipes recipes={recipes} onOpen={setDetail} onDiscover={() => setView('discover')} />
      )}

      <RecipeSheet recipe={detail} onClose={() => setDetail(null)} />
    </>
  );
}
