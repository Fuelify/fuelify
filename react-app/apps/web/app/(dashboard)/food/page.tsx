'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingBlock } from '../../components/ui';

// The Flutter "Food" tab is now the Saved view inside Discover.
export default function FoodPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/discovery?view=saved'); }, [router]);
  return <LoadingBlock />;
}
