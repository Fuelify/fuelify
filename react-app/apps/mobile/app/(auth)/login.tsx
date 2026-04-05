import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../hooks/useStores';
import { validateEmail, validatePassword } from '@fuelify/shared';

// Mirrors: lib/screens/authentication/login_screen.dart
export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const emailResult = validateEmail(email);
    if (emailResult !== 'Success') { setError(emailResult); return; }
    const passwordResult = validatePassword(password);
    if (passwordResult !== 'Success') { setError(passwordResult); return; }

    const result = await login(email, password);
    if (result.status) {
      router.replace('/(dashboard)/plan' as never);
    } else {
      setError(result.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fuelify</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#888" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={status === 'authenticating'}>
        <Text style={styles.buttonText}>{status === 'authenticating' ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/register' as never)}>
        <Text style={styles.link}>{"Don't have an account? Register"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#202020' },
  title: { color: '#FFBD73', fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 32 },
  error: { color: '#ff6b6b', marginBottom: 16 },
  input: { backgroundColor: '#333', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#444' },
  button: { backgroundColor: '#FFBD73', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#202020', fontWeight: '600', fontSize: 16 },
  link: { color: '#FFBD73', textAlign: 'center' },
});
