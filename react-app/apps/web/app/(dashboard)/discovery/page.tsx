'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Recipe } from '@fuelify/shared';
import { useProfileStore, useRecipeStore } from '../../providers';
import { EmptyState, FoodTile, Icon, LoadingBlock, PageHeader, Segmented, foodEmoji, foodGradient } from '../../components/ui';
import { RecipeMeta, RecipeSheet } from '../../components/RecipeSheet';

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
  const searchRecipes = useRecipeStore((s) => s.searchRecipes);
  const getClassifiedRecipes = useRecipeStore((s) => s.getClassifiedRecipes);
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);

  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState<Recipe | null>(null);

  useEffect(() => {
    Promise.all([searchRecipes({}), getClassifiedRecipes(), profile ? null : fetchProfile()]).finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setView = (v: View) => router.replace(v === 'saved' ? '/discovery?view=saved' : '/discovery');

  return (
    <>
      <PageHeader title={view === 'saved' ? 'Saved' : 'Discover'} sub={view === 'discover' ? 'Swipe to teach Fuelify your taste' : 'Recipes you liked and favorited'} />
      <div style={{ padding: '0 var(--gutter) 12px', flexShrink: 0 }}>
        <Segmented<View>
          options={[{ value: 'discover', label: 'Discover' }, { value: 'saved', label: `Saved${classifications.filter((c) => c.classification !== 'disliked').length ? ` (${classifications.filter((c) => c.classification !== 'disliked').length})` : ''}` }]}
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
            The recipe catalog is empty. Apply the starter recipes migration (supabase/migrations/00004) to fill it.
          </EmptyState>
        </div>
      ) : view === 'discover' ? (
        <Deck recipes={recipes} diet={profile?.diet ?? null} onOpen={setDetail} onSeeSaved={() => setView('saved')} />
      ) : (
        <Saved recipes={recipes} onOpen={setDetail} onDiscover={() => setView('discover')} />
      )}

      <RecipeSheet recipe={detail} onClose={() => setDetail(null)} />
    </>
  );
}

// ----- Discover deck ------------------------------------------------------

/** Diets each preference can eat, used to rank compatible recipes first */
const COMPATIBLE: Record<string, string[]> = {
  Vegan: ['Vegan', 'Raw'],
  Raw: ['Raw', 'Vegan'],
  Vegetarian: ['Vegetarian', 'Vegan', 'Raw'],
  Pescatarian: ['Pescatarian', 'Vegetarian', 'Vegan', 'Raw'],
};

const SWIPE_THRESHOLD = 100; // matches Flutter's minimumDrag

function Deck({ recipes, diet, onOpen, onSeeSaved }: { recipes: Recipe[]; diet: string | null; onOpen: (r: Recipe) => void; onSeeSaved: () => void }) {
  const classifications = useRecipeStore((s) => s.classifications);
  const classifyRecipe = useRecipeStore((s) => s.classifyRecipe);

  const deck = useMemo(() => {
    const seen = new Set(classifications.map((c) => c.recipeId));
    const allowed = diet ? COMPATIBLE[diet] : undefined;
    return recipes
      .filter((r) => !seen.has(r.id))
      .sort((a, b) => {
        if (!allowed) return 0;
        return Number(allowed.includes(b.dietType ?? '')) - Number(allowed.includes(a.dietType ?? ''));
      });
  }, [recipes, classifications, diet]);

  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState<null | 'liked' | 'disliked' | 'favorited'>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const top = deck[0];
  const next = deck[1];

  const decide = (choice: 'liked' | 'disliked' | 'favorited') => {
    if (!top || leaving) return;
    setLeaving(choice);
    setTimeout(() => {
      classifyRecipe(top.id, choice);
      setLeaving(null);
      setDrag({ x: 0, y: 0, active: false });
    }, 220);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const x = e.clientX - start.current.x;
    const y = e.clientY - start.current.y;
    if (Math.abs(x) > 5 || Math.abs(y) > 5) moved.current = true;
    setDrag({ x, y, active: true });
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    const { x, y } = drag;
    if (Math.abs(x) > Math.abs(y)) {
      if (x > SWIPE_THRESHOLD) return decide('liked');
      if (x < -SWIPE_THRESHOLD) return decide('disliked');
    } else if (y < -SWIPE_THRESHOLD) {
      return decide('favorited');
    }
    setDrag({ x: 0, y: 0, active: false });
    if (!moved.current && top) onOpen(top);
  };

  if (!top) {
    return (
      <div className="center-fill">
        <EmptyState icon="sparkles" title="You're all caught up" action={<button className="btn btn-primary" onClick={onSeeSaved}>See saved recipes</button>}>
          You&apos;ve rated every recipe we have. We&apos;ll use your picks to tailor your plan.
        </EmptyState>
      </div>
    );
  }

  const exit =
    leaving === 'liked' ? 'translate(140%, 0) rotate(20deg)' :
    leaving === 'disliked' ? 'translate(-140%, 0) rotate(-20deg)' :
    leaving === 'favorited' ? 'translate(0, -140%)' : null;
  const transform = exit ?? `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`;
  const hint =
    Math.abs(drag.x) > Math.abs(drag.y)
      ? drag.x > 40 ? 'LIKE' : drag.x < -40 ? 'NOPE' : null
      : drag.y < -40 ? 'FAVORITE' : null;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 var(--gutter) 12px', gap: 14 }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {next && <RecipeCard recipe={next} style={{ transform: 'scale(0.95) translateY(10px)', opacity: 0.6 }} />}
        <RecipeCard
          recipe={top}
          hint={hint}
          style={{ transform, transition: drag.active && !leaving ? 'none' : 'transform 0.22s ease', touchAction: 'none', cursor: 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { start.current = null; setDrag({ x: 0, y: 0, active: false }); }}
        />
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 20, flexShrink: 0 }}>
        <RoundButton label="Not for me" icon="x" color="var(--danger)" onClick={() => decide('disliked')} />
        <RoundButton label="Favorite" icon="star" color="var(--warning)" small onClick={() => decide('favorited')} />
        <RoundButton label="Like" icon="heart" color="var(--accent)" onClick={() => decide('liked')} />
      </div>
      <p className="tiny faint center" style={{ flexShrink: 0 }}>{deck.length} to go · tap a card for the full recipe</p>
    </div>
  );
}

function RecipeCard({ recipe, hint, style, ...handlers }: { recipe: Recipe; hint?: string | null; style?: React.CSSProperties } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...handlers}
      role="button"
      aria-label={`${recipe.title} — tap for details`}
      style={{
        position: 'absolute', inset: 0, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        background: 'var(--surface-2)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
        display: 'flex', flexDirection: 'column', userSelect: 'none', ...style,
      }}
    >
      <div style={{ flex: 1, minHeight: 120, background: foodGradient(recipe.title), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'min(28vw, 120px)', position: 'relative' }} aria-hidden="true">
        {foodEmoji(recipe.title)}
        {hint && (
          <span style={{
            position: 'absolute', top: 18, left: hint === 'NOPE' ? undefined : 18, right: hint === 'NOPE' ? 18 : undefined,
            padding: '4px 12px', border: '3px solid #fff', borderRadius: 8, color: '#fff', fontWeight: 900, fontSize: 22,
            transform: `rotate(${hint === 'NOPE' ? 12 : -12}deg)`, letterSpacing: '0.05em',
          }}>{hint}</span>
        )}
      </div>
      <div className="stack-sm" style={{ padding: 16, flexShrink: 0 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>{recipe.title}</h2>
        <p className="muted small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{recipe.description}</p>
        <RecipeMeta recipe={recipe} />
      </div>
    </div>
  );
}

function RoundButton({ label, icon, color, small, onClick }: { label: string; icon: 'x' | 'star' | 'heart'; color: string; small?: boolean; onClick: () => void }) {
  const size = small ? 48 : 60;
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)' }}
    >
      <Icon name={icon} size={small ? 22 : 28} filled={icon !== 'x'} />
    </button>
  );
}

// ----- Saved (formerly the Food tab) --------------------------------------

function Saved({ recipes, onOpen, onDiscover }: { recipes: Recipe[]; onOpen: (r: Recipe) => void; onDiscover: () => void }) {
  const classifications = useRecipeStore((s) => s.classifications);
  const [filter, setFilter] = useState<'all' | 'favorited' | 'liked'>('all');

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const saved = classifications
    .filter((c) => c.classification !== 'disliked' && (filter === 'all' || c.classification === filter))
    .sort((a, b) => Number(b.classification === 'favorited') - Number(a.classification === 'favorited'))
    .map((c) => ({ recipe: byId.get(c.recipeId), kind: c.classification }))
    .filter((x): x is { recipe: Recipe; kind: 'liked' | 'favorited' } => !!x.recipe);

  return (
    <div className="screen-scroll">
      <div className="screen-pad stack" style={{ paddingTop: 0 }}>
        <div className="chips">
          {(['all', 'favorited', 'liked'] as const).map((f) => (
            <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'favorited' ? 'Favorites' : 'Liked'}
            </button>
          ))}
        </div>
        {saved.length === 0 ? (
          <EmptyState icon="bookmark" title="Nothing saved yet" action={<button className="btn btn-primary" onClick={onDiscover}>Start discovering</button>}>
            Like or favorite recipes in Discover and they&apos;ll show up here.
          </EmptyState>
        ) : (
          <div className="stack-sm">
            {saved.map(({ recipe, kind }) => (
              <button key={recipe.id} className="card card-button row" style={{ gap: 12 }} onClick={() => onOpen(recipe)}>
                <FoodTile title={recipe.title} size={56} />
                <div className="grow stack-sm" style={{ gap: 4 }}>
                  <div className="truncate" style={{ fontWeight: 700 }}>{recipe.title}</div>
                  <div className="small muted">
                    {[recipe.cuisine, recipe.calories != null ? `${recipe.calories} kcal` : null, (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0) ? `${(recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)} min` : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span style={{ color: kind === 'favorited' ? 'var(--warning)' : 'var(--accent)' }}>
                  <Icon name={kind === 'favorited' ? 'star' : 'heart'} filled size={20} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
