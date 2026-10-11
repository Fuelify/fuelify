'use client';

import { useMemo, useRef, useState } from 'react';
import { buildDiscoverDeck, type Recipe } from '@fuelify/shared';
import { useRecipeStore } from '@/lib/stores';
import { EmptyState, FoodImage, Icon } from '@/components/ui';
import { RecipeMeta } from './RecipeSheet';

// Mirrors lib/screens/discovery_screen.dart: drag right = like, left = dislike,
// up = favorite (or use the buttons). Tap a card for the full recipe.

const SWIPE_THRESHOLD = 100; // matches Flutter's minimumDrag

export function DiscoverDeck({ recipes, diet, onOpen, onSeeSaved }: { recipes: Recipe[]; diet: string | null; onOpen: (r: Recipe) => void; onSeeSaved: () => void }) {
  const classifications = useRecipeStore((s) => s.classifications);
  const classifyRecipe = useRecipeStore((s) => s.classifyRecipe);

  const deck = useMemo(() => buildDiscoverDeck(recipes, classifications, diet), [recipes, classifications, diet]);

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
        <RoundButton label="Favorite" icon="star" color="var(--tertiary)" small onClick={() => decide('favorited')} />
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
      <FoodImage title={recipe.title} imageUrl={recipe.imageUrl} iconSize={96} style={{ flex: 1, minHeight: 120 }}>
        {hint && (
          <span style={{
            position: 'absolute', top: 18, left: hint === 'NOPE' ? undefined : 18, right: hint === 'NOPE' ? 18 : undefined,
            padding: '4px 12px', border: '3px solid #fff', borderRadius: 8, color: '#fff', fontWeight: 900, fontSize: 22,
            transform: `rotate(${hint === 'NOPE' ? 12 : -12}deg)`, letterSpacing: '0.05em',
          }}>{hint}</span>
        )}
      </FoodImage>
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

