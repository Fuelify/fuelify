'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { daysUntil, formatLong, greeting, sortByMealType, todayISO } from '@fuelify/shared';
import { useHouseholdStore, useMealPlanStore, usePantryStore, useProfileStore, useShoppingCartStore } from '@/lib/stores';
import { Avatar, FoodTile, Icon, LogoMark, type IconName } from '@/components/ui';
import { useRecipeImage } from '@/features/recipes/useRecipeImage';

// The Flutter Home tab was a placeholder; this is a daily overview built from
// the data the app already tracks (plan, pantry, cart, onboarding status).
export default function HomePage() {
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const meals = useMealPlanStore((s) => s.meals);
  const fetchDayMealPlan = useMealPlanStore((s) => s.fetchDayMealPlan);
  const ensureHousehold = useHouseholdStore((s) => s.ensureHousehold);
  const pantryItems = usePantryStore((s) => s.items);
  const fetchPantry = usePantryStore((s) => s.fetchItems);
  const cartItems = useShoppingCartStore((s) => s.items);
  const fetchCart = useShoppingCartStore((s) => s.fetchItems);

  const today = todayISO();

  useEffect(() => {
    if (!profile) fetchProfile();
    fetchDayMealPlan(today);
    ensureHousehold().then((id) => {
      if (id) {
        fetchPantry(id);
        fetchCart(id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayMeals = useMemo(() => sortByMealType(meals[today] ?? []), [meals, today]);

  const expiringSoon = useMemo(
    () =>
      pantryItems
        .filter((i) => i.status !== 'expired' && i.expirationDate && daysUntil(i.expirationDate) <= 3)
        .sort((a, b) => (a.expirationDate! < b.expirationDate! ? -1 : 1))
        .slice(0, 4),
    [pantryItems],
  );
  const expiredCount = pantryItems.filter((i) => i.status === 'expired').length;
  const cartRemaining = cartItems.filter((i) => !i.checked).length;

  const name = profile?.firstName?.trim();

  return (
    <div className="screen-scroll">
      <header className="page-header" style={{ paddingBottom: 4 }}>
        <LogoMark size={52} />
        <div className="grow">
          <p className="small muted">{formatLong(today)}</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {greeting()}{name ? `, ${name}` : ''}
          </h1>
        </div>
        <Link href="/profile" aria-label="Profile" style={{ borderRadius: '50%' }}>
          <Avatar first={profile?.firstName} last={profile?.lastName} imageUrl={profile?.imageUrl} />
        </Link>
      </header>

      <div className="screen-pad stack" style={{ paddingTop: 12, paddingBottom: 32 }}>
        {profile && !profile.onboarded && (
          <Link href="/onboarding/welcome" className="card row" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary)', gap: 14 }}>
            <span style={{ color: 'var(--primary)', display: 'flex' }} aria-hidden="true"><Icon name="sparkles" size={28} /></span>
            <div className="grow">
              <div style={{ fontWeight: 700 }}>Finish setting up</div>
              <div className="small muted">Answer a few questions so we can personalize your plan.</div>
            </div>
            <span style={{ color: 'var(--primary)' }}><Icon name="chevronRight" /></span>
          </Link>
        )}

        {/* Today's meals */}
        <section>
          <div className="section-title">
            <span>Today&apos;s meals</span>
            <Link href="/plan" className="small" style={{ color: 'var(--primary)', textTransform: 'none', letterSpacing: 0 }}>Open plan</Link>
          </div>
          {todayMeals.length === 0 ? (
            <Link href="/plan" className="card row" style={{ gap: 14 }}>
              <span className="empty-icon" style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                <Icon name="calendar" />
              </span>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>Nothing planned yet</div>
                <div className="small muted">Plan today&apos;s meals or grab ideas from Discover.</div>
              </div>
              <Icon name="chevronRight" />
            </Link>
          ) : (
            <div className="list">
              {todayMeals.map((m) => (
                <Link key={m.id} href="/plan" className="list-row">
                  <MealThumb title={m.title} recipeId={m.recipeId} />
                  <div className="grow">
                    <div className="truncate" style={{ fontWeight: 600 }}>{m.title}</div>
                    <div className="tiny faint" style={{ textTransform: 'capitalize' }}>{m.mealType}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* At a glance */}
        <section>
          <div className="section-title"><span>At a glance</span></div>
          <div className="grid-2">
            <Stat href="/cart" icon="cart" value={cartRemaining} label={cartRemaining === 1 ? 'item to buy' : 'items to buy'} />
            <Stat href="/pantry" icon="pantry" value={pantryItems.length} label="in your pantry" />
          </div>
        </section>

        {(expiringSoon.length > 0 || expiredCount > 0) && (
          <section>
            <div className="section-title">
              <span>Use it up</span>
              <Link href="/pantry" className="small" style={{ color: 'var(--primary)', textTransform: 'none', letterSpacing: 0 }}>Pantry</Link>
            </div>
            <div className="list">
              {expiringSoon.map((i) => {
                const d = daysUntil(i.expirationDate!);
                return (
                  <Link key={i.id} href="/pantry" className="list-row">
                    <span style={{ color: d < 0 ? 'var(--danger)' : 'var(--warning)' }}><Icon name="alert" size={20} /></span>
                    <span className="grow truncate" style={{ fontWeight: 600 }}>{i.name}</span>
                    <span className={`badge ${d < 0 ? 'badge-danger' : 'badge-primary'}`}>
                      {d < 0 ? 'Past date' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`}
                    </span>
                  </Link>
                );
              })}
              {expiredCount > 0 && (
                <Link href="/pantry" className="list-row">
                  <span style={{ color: 'var(--danger)' }}><Icon name="trash" size={20} /></span>
                  <span className="grow">{expiredCount} expired item{expiredCount === 1 ? '' : 's'} to clear out</span>
                  <Icon name="chevronRight" size={18} />
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Quick actions */}
        <section>
          <div className="section-title"><span>Quick actions</span></div>
          <div className="grid-2">
            <Action href="/discovery" icon="compass" title="Discover recipes" body="Swipe to find meals you'll love" />
            <Action href="/pantry" icon="sparkles" title="Meal ideas" body="Cook with what you have" />
            <Action href="/pantry" icon="scan" title="Scan groceries" body="Barcode or receipt" />
            <Action href="/discovery?view=saved" icon="bookmark" title="Saved recipes" body="Your likes and favorites" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ href, icon, value, label }: { href: string; icon: IconName; value: number; label: string }) {
  return (
    <Link href={href} className="card stack-sm" style={{ gap: 6 }}>
      <span style={{ color: 'var(--primary)' }}><Icon name={icon} size={20} /></span>
      <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{value}</span>
      <span className="small muted">{label}</span>
    </Link>
  );
}

function Action({ href, icon, title, body }: { href: string; icon: IconName; title: string; body: string }) {
  return (
    <Link href={href} className="card stack-sm" style={{ gap: 6 }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} />
      </span>
      <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
      <span className="tiny muted">{body}</span>
    </Link>
  );
}

function MealThumb({ title, recipeId }: { title: string; recipeId: string | null }) {
  return <FoodTile title={title} imageUrl={useRecipeImage(recipeId)} size={40} />;
}
