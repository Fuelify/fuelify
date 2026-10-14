'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCommunityStore } from '@/lib/stores';
import { EmptyState, Icon, LoadingBlock, PageHeader } from '@/components/ui';

/** Admins: photos members added, waiting to be showcased to everyone. */
export default function AdminPhotosPage() {
  const router = useRouter();
  const isAdmin = useCommunityStore((s) => s.isAdmin);
  const checkAdmin = useCommunityStore((s) => s.checkAdmin);
  const pending = useCommunityStore((s) => s.pending);
  const loadPending = useCommunityStore((s) => s.loadPending);
  const setFeatured = useCommunityStore((s) => s.setFeatured);
  const removePhoto = useCommunityStore((s) => s.removePhoto);
  const error = useCommunityStore((s) => s.error);

  useEffect(() => {
    checkAdmin().then((ok) => {
      if (ok) loadPending();
    });
  }, [checkAdmin, loadPending]);

  return (
    <>
      <PageHeader
        title="Member photos"
        sub="Showcase the best ones to everyone"
        left={
          <button className="icon-btn" aria-label="Back" onClick={() => router.back()}>
            <Icon name="chevronLeft" />
          </button>
        }
      />
      <div className="screen-scroll">
        <div className="screen-pad stack" style={{ paddingTop: 4, paddingBottom: 32 }}>
          {isAdmin === false ? (
            <EmptyState icon="alert" title="Admins only">This page is for Fuelify admins.</EmptyState>
          ) : pending === null ? (
            <LoadingBlock />
          ) : pending.length === 0 ? (
            <EmptyState icon="checkCircle" title="All caught up">No new member photos to review.</EmptyState>
          ) : (
            <>
              {error && <div className="alert">{error}</div>}
              <p className="hint">Until showcased, a photo is only seen by the person who added it. Showcased photos appear in the recipe’s gallery for everyone and on its Discover card when it has no photo of its own.</p>
              <div className="admin-photos">
                {pending.map((p) => (
                  <div key={p.id} className="card stack-sm" style={{ padding: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Member photo for ${p.recipeTitle}`} loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 8, background: 'var(--surface-3)' }} />
                    <div className="small truncate" style={{ fontWeight: 700 }}>{p.recipeTitle}</div>
                    <div className="tiny faint">{new Date(p.createdAt).toLocaleDateString()}</div>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn btn-primary btn-sm grow" onClick={() => setFeatured(p, true)}>
                        <Icon name="star" size={14} filled /> Showcase
                      </button>
                      <button className="icon-btn icon-btn-filled" aria-label={`Remove photo for ${p.recipeTitle}`}
                        onClick={() => window.confirm('Remove this photo for good?') && removePhoto(p)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
