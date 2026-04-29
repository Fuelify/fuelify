import { Stack } from 'expo-router';

// Root layout — mirrors main.dart + ApplicationRouter structure
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(dashboard)" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}
