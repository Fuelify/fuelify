import { View, Text, StyleSheet } from 'react-native';

// Mirrors: lib/screens/main/discovery/screen.dart
export default function DiscoveryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discovery</Text>
      <Text style={styles.subtitle}>TODO: port from Flutter DiscoveryScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#202020' },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#999', fontSize: 14 },
});
