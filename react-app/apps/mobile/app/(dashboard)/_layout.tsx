import { Tabs } from 'expo-router';

// Mirrors: lib/screens/main/dashboard/screen.dart + bottom_navigation_bar.dart
const TAB_CONFIG = [
  { name: 'home', title: 'Home' },
  { name: 'plan', title: 'Plan' },
  { name: 'discovery', title: 'Discovery' },
  { name: 'food', title: 'Food' },
  { name: 'cart', title: 'Cart' },
  { name: 'profile', title: 'Profile' },
];

export default function DashboardLayout() {
  return (
    <Tabs
      initialRouteName="plan"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#202020', borderTopColor: '#333' },
        tabBarActiveTintColor: '#FFBD73',
        tabBarInactiveTintColor: '#999',
      }}
    >
      {TAB_CONFIG.map(({ name, title }) => (
        <Tabs.Screen key={name} name={name} options={{ title }} />
      ))}
    </Tabs>
  );
}
