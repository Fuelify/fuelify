'use client';

import { useNavigationStore } from '../providers';

// Mirrors: lib/screens/onboarding/screen.dart
// Shell with progress bar wrapping all onboarding step screens
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const progress = useNavigationStore((s) => s.getOnboardingProgress());
  const currentStep = useNavigationStore((s) => s.currentOnboardingStep);
  const totalSteps = 13;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#202020', color: '#fff' }}>
      {/* Progress bar */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem', color: '#999' }}>
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div style={{ height: 4, backgroundColor: '#444', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: '#FFBD73', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Step content */}
      <div style={{ padding: '0 24px 24px' }}>
        {children}
      </div>
    </div>
  );
}
