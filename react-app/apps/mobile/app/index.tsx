import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useInitializeAuth } from '../hooks/useStores';
import { DEBUG, DEBUG_ENTER_ROUTE } from '@fuelify/shared';

// Splash screen — mirrors lib/screens/splash_screen.dart
export default function SplashScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useInitializeAuth();

  useEffect(() => {
    if (status === 'loading') return;

    const timer = setTimeout(() => {
      if (DEBUG) {
        router.replace(`/(dashboard)/${DEBUG_ENTER_ROUTE}` as never);
        return;
      }

      if (status === 'loggedIn') {
        router.replace('/(dashboard)/plan' as never);
      } else {
        router.replace('/(auth)/login' as never);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [status, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fuelify</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#202020' },
  title: { color: '#FFBD73', fontSize: 36, fontWeight: '700' },
});
