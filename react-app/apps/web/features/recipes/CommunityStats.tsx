'use client';

import type { RecipeCommunityStats } from '@fuelify/shared';
import { Icon } from '@/components/ui';

/** Community counts: likes, favorites, cooked this month, and a Trending badge. Nothing when there's no activity. */
export function CommunityStats({ stats, size = 'sm' }: { stats: RecipeCommunityStats | undefined; size?: 'sm' | 'md' }) {
  if (!stats) return null;
  const all: { icon: 'heart' | 'star' | 'utensils'; n: number; label: string }[] = [
    { icon: 'heart', n: stats.likes, label: stats.likes === 1 ? 'like' : 'likes' },
    { icon: 'star', n: stats.favorites, label: stats.favorites === 1 ? 'favorite' : 'favorites' },
    { icon: 'utensils', n: stats.cooked30d, label: 'cooked this month' },
  ];
  const items = all.filter((i) => i.n > 0);
  if (items.length === 0 && !stats.trending) return null;
  const iconSize = size === 'md' ? 15 : 13;
  return (
    <div className={`community-stats community-stats-${size}`} aria-label="From the Fuelify community">
      {stats.trending && (
        <span className="badge badge-premium" style={{ flexShrink: 0 }}>
          <Icon name="flame" size={12} />&nbsp;Trending
        </span>
      )}
      {items.map((i) => (
        <span key={i.icon} className="community-stat" title={`${i.n} ${i.label} from the community`}>
          <Icon name={i.icon} size={iconSize} filled={i.icon !== 'utensils'} /> {i.n}
          {size === 'md' && <span className="muted"> {i.label}</span>}
        </span>
      ))}
    </div>
  );
}
