import { HOUSEHOLD_SETUP_STEPS } from '@fuelify/shared';
import { HouseholdSetupScreen } from '@/features/household/HouseholdSetupScreen';

// Household setup (once per household), separate from personal onboarding
export function generateStaticParams() {
  return HOUSEHOLD_SETUP_STEPS.map((step) => ({ step }));
}

export const dynamicParams = false;

export default function HouseholdSetupPage({ params }: { params: { step: string } }) {
  return <HouseholdSetupScreen step={params.step} />;
}
