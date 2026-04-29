import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../hooks/useStores';
import { validateEmail, validatePassword } from '@fuelify/shared';

// Mirrors: lib/screens/authentication/register_screen.dart
export default function RegisterScreen() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const status = useAuthStore((s) => s.status);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    const emailResult = validateEmail(email);
    if (emailResult !== 'Success') { setError(emailResult); return; }
    const passwordResult = validatePassword(password);
    if (passwordResult !== 'Success') { setError(passwordResult); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    const result = await signUp(email, password);
    if (result.status) {
      router.replace('/(onboarding)/onboarding/welcome' as never);
    } else {
      setError(result.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#888" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#888" value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#888" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={status === 'authenticating'}>
        <Text style={styles.buttonText}>{status === 'authenticating' ? 'Creating account...' : 'Register'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/login' as never)}>
        <Text style={styles.link}>Already have an account? Login</Text>
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
