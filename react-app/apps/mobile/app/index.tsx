import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../hooks/useStores';
import { DEBUG, DEBUG_ENTER_ROUTE } from '@fuelify/shared';

// Splash screen — mirrors lib/screens/splash_screen.dart
export default function SplashScreen() {
  const router = useRouter();
  const checkToken = useAuthStore((s) => s.checkToken);

  useEffect(() => {
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (DEBUG) {
        router.replace(`/(dashboard)/${DEBUG_ENTER_ROUTE}` as never);
        return;
      }

      const isAuthenticated = await checkToken();
      if (isAuthenticated) {
        router.replace('/(dashboard)/plan' as never);
      } else {
        router.replace('/(auth)/login' as never);
      }
    };
    init();
  }, [checkToken, router]);

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
