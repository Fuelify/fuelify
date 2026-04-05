import { View, Text, StyleSheet } from 'react-native';

// Mirrors: lib/screens/main/food/screen.dart
export default function FoodScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food</Text>
      <Text style={styles.subtitle}>TODO: port from Flutter FoodScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#202020' },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#999', fontSize: 14 },
});
