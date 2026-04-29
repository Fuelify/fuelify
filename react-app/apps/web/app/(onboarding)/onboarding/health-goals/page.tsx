'use client';

import { useRouter } from 'next/navigation';
import { useNavigationStore } from '../../../providers';
import { ONBOARDING_STEPS } from '@fuelify/shared';

// Mirrors: lib/screens/onboarding/goals/screen.dart
export default function OnboardingHealthGoalsPage() {
  const router = useRouter();
  const nextStep = useNavigationStore((s) => s.nextOnboardingStep);
  const prevStep = useNavigationStore((s) => s.prevOnboardingStep);
  const currentStep = useNavigationStore((s) => s.currentOnboardingStep);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      nextStep();
      router.push(`/onboarding/${ONBOARDING_STEPS[currentStep + 1]}`);
    } else {
      // Final step — go to dashboard
      router.replace('/plan');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      prevStep();
      router.push(`/onboarding/${ONBOARDING_STEPS[currentStep - 1]}`);
    }
  };

  return (
    <div>
      <h2>Health Goals</h2>
      <p>Onboarding step 6 — TODO: port UI from Flutter goals/screen.dart</p>

      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        {currentStep > 0 && (
          <button onClick={handleBack} style={{ padding: '12px 24px', borderRadius: 8, border: '1px solid #FFBD73', background: 'none', color: '#FFBD73', cursor: 'pointer' }}>
            Back
          </button>
        )}
        <button onClick={handleNext} style={{ padding: '12px 24px', borderRadius: 8, border: 'none', backgroundColor: '#FFBD73', color: '#202020', fontWeight: 600, cursor: 'pointer' }}>
          {currentStep === ONBOARDING_STEPS.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
