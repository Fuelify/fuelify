'use client';

import { useRef, useState } from 'react';
import { useProfileStore } from '@/lib/stores';
import { squareJpeg } from '@/lib/image';
import { Avatar, Icon, Spinner } from '@/components/ui';

/** The profile picture; tap to take or choose a new one (saved to Supabase Storage). */
export function ProfilePhoto() {
  const profile = useProfileStore((s) => s.profile);
  const uploadAvatar = useProfileStore((s) => s.uploadAvatar);
  const storeError = useProfileStore((s) => s.error);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a photo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ok = await uploadAvatar(await squareJpeg(file));
      if (!ok) setError('Couldn’t save the photo. Try again.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button type="button" className="avatar-edit" onClick={() => input.current?.click()} disabled={busy}
        aria-label={profile?.imageUrl ? 'Change profile picture' : 'Add profile picture'}>
        <Avatar size="lg" first={profile?.firstName} last={profile?.lastName} imageUrl={profile?.imageUrl} />
        <span className="avatar-badge" aria-hidden="true"><Icon name="camera" size={14} /></span>
        {busy && <span className="avatar-busy"><Spinner /></span>}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {(error || (storeError && /picture/i.test(storeError) ? storeError : null)) && <span className="tiny" role="alert" style={{ color: 'var(--danger)', maxWidth: 120, textAlign: 'center' }}>{error ?? storeError}</span>}
    </div>
  );
}
