import { ONBOARDING_STEPS } from '@fuelify/shared';
import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';

// One route for all 13 onboarding steps — see ../../steps.tsx
export function generateStaticParams() {
  return ONBOARDING_STEPS.map((step) => ({ step }));
}

export const dynamicParams = false;

export default function OnboardingStepPage({ params }: { params: { step: string } }) {
  return <OnboardingStepScreen step={params.step} />;
}
