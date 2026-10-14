'use client';

import { useEffect, useRef, useState } from 'react';
import { photoAudience, recipeGallery, type Recipe, type RecipePhoto } from '@fuelify/shared';
import { useAuthStore, useCommunityStore } from '@/lib/stores';
import { fitJpeg } from '@/lib/image';
import { FoodImage, Icon, Spinner } from '@/components/ui';

/**
 * Swipeable photos for a recipe: its own photo, then ones members added.
 * Anyone can add a photo of how theirs turned out; you can remove your own.
 */
export function RecipeGallery({ recipe }: { recipe: Recipe }) {
  const userId = useAuthStore((s) => s.userId);
  const photos = useCommunityStore((s) => s.photos[recipe.id]);
  const uploading = useCommunityStore((s) => s.uploading.includes(recipe.id));
  const loadPhotos = useCommunityStore((s) => s.loadPhotos);
  const addPhoto = useCommunityStore((s) => s.addPhoto);
  const removePhoto = useCommunityStore((s) => s.removePhoto);
  const isAdmin = useCommunityStore((s) => s.isAdmin);
  const checkAdmin = useCommunityStore((s) => s.checkAdmin);
  const setFeatured = useCommunityStore((s) => s.setFeatured);
  const track = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    loadPhotos(recipe.id);
    setIndex(0);
    track.current?.scrollTo({ left: 0 });
  }, [recipe.id, loadPhotos]);

  const gallery = recipeGallery(recipe, photos ?? [], userId);
  const current = gallery[index];

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const goTo = (i: number) => track.current?.scrollTo({ left: i * (track.current?.clientWidth ?? 0), behavior: 'smooth' });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const ok = await addPhoto(recipe.id, await fitJpeg(file));
      if (!ok) setError('Couldn’t add the photo. Try again.');
      // The new photo goes right after the recipe's own
      else setTimeout(() => goTo(recipe.imageUrl ? 1 : 0), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  const actions = (
    <div className="gallery-actions">
      {isAdmin && current?.source === 'user' && (
        <button type="button" className="icon-btn" aria-pressed={current.featured}
          aria-label={current.featured ? 'Stop showcasing this photo' : 'Showcase this photo to everyone'}
          title={current.featured ? 'Showcased: everyone sees it. Tap to make it private.' : 'Showcase to everyone (gallery and Discover cards)'}
          onClick={() => setFeatured(current, !current.featured)}
          style={current.featured ? { background: '#fff', color: 'var(--tertiary)' } : undefined}>
          <Icon name="star" size={18} filled={current.featured} />
        </button>
      )}
      {current?.source === 'user' && (current.uploadedBy === userId || isAdmin) && (
        <button type="button" className="icon-btn" aria-label={current.uploadedBy === userId ? 'Remove your photo' : 'Remove this photo'}
          onClick={async () => { if (window.confirm(current.uploadedBy === userId ? 'Remove your photo?' : 'Remove this member’s photo?')) { await removePhoto(current); setIndex(0); track.current?.scrollTo({ left: 0 }); } }}>
          <Icon name="trash" size={18} />
        </button>
      )}
      <button type="button" className="icon-btn" aria-label="Add your photo" onClick={() => input.current?.click()} disabled={uploading}>
        {uploading ? <Spinner /> : <Icon name="camera" size={18} />}
      </button>
    </div>
  );

  return (
    <div className="stack-sm">
      {gallery.length === 0 ? (
        <div className="gallery">
          <FoodImage title={recipe.title} imageUrl={null} iconSize={56} style={{ height: 200 }} />
          {actions}
        </div>
      ) : (
        <div className="gallery" role="region" aria-roledescription="carousel" aria-label={`${recipe.title} photos`}>
          <div className="gallery-track" ref={track} onScroll={onScroll}>
            {gallery.map((p, i) => (
              <div key={p.id} className="gallery-slide" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${gallery.length}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.source === 'stock' ? recipe.title : `${recipe.title}, from a Fuelify member`} loading={i === 0 ? 'eager' : 'lazy'}
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              </div>
            ))}
          </div>
          {current && <span className="gallery-tag">{galleryLabel(current, userId)}</span>}
          {actions}
          {gallery.length > 1 && (
            <div className="gallery-dots" aria-hidden="true">
              {gallery.map((p, i) => <span key={p.id} aria-current={i === index} />)}
            </div>
          )}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {error && <div className="alert" role="alert">{error}</div>}
      {gallery.length <= 1 && <p className="tiny faint">Made this? Tap the camera to add a photo. You’ll always see yours here; our team may showcase great ones for everyone.</p>}
    </div>
  );
}

function galleryLabel(p: RecipePhoto, viewerId: string | null): string {
  switch (photoAudience(p, viewerId)) {
    case 'stock':
      return 'Recipe photo';
    case 'yours':
      return p.featured ? 'Your photo · showcased' : 'Your photo · only you see it';
    case 'showcased':
      return 'From the community';
    default:
      return 'Not showcased · admins only';
  }
}
