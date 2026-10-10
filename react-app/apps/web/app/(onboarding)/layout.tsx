'use client';

import { useDataStoresReady } from '@/lib/stores';
import { LoadingBlock } from '@/components/ui';
import { OnboardingProvider } from '@/features/onboarding/OnboardingContext';

// Mirrors: lib/screens/onboarding/screen.dart — shell around every onboarding step.
// Each step renders its own header (back + progress), scrolling body and footer button.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const ready = useDataStoresReady();
  return (
    <div className="screen">
      {ready ? <OnboardingProvider>{children}</OnboardingProvider> : <LoadingBlock />}
    </div>
  );
}
