import { Stack } from 'expo-router';

// Mirrors: lib/screens/onboarding/screen.dart
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* All onboarding steps are nested under onboarding/ */}
    </Stack>
  );
}
