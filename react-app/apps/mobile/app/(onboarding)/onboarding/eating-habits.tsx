import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigationStore } from '../../../hooks/useStores';
import { ONBOARDING_STEPS } from '@fuelify/shared';

// Mirrors: lib/screens/onboarding/eating-habits/screen.dart
export default function EatingHabitsScreen() {
  const router = useRouter();
  const nextStep = useNavigationStore((s) => s.nextOnboardingStep);
  const prevStep = useNavigationStore((s) => s.prevOnboardingStep);
  const currentStep = useNavigationStore((s) => s.currentOnboardingStep);
  const progress = useNavigationStore((s) => s.getOnboardingProgress());

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      nextStep();
      router.push(`/(onboarding)/onboarding/${ONBOARDING_STEPS[currentStep + 1]}` as never);
    } else {
      router.replace('/(dashboard)/plan' as never);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      prevStep();
      router.push(`/(onboarding)/onboarding/${ONBOARDING_STEPS[currentStep - 1]}` as never);
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <Text style={styles.title}>Eating Habits</Text>
      <Text style={styles.subtitle}>TODO: port UI from Flutter</Text>

      <View style={styles.buttons}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>{currentStep === ONBOARDING_STEPS.length - 1 ? 'Finish' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#202020' },
  progressContainer: { marginBottom: 32 },
  progressText: { color: '#999', fontSize: 12, marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: '#444', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#FFBD73', borderRadius: 2 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#999', fontSize: 14, marginBottom: 32 },
  buttons: { flexDirection: 'row', gap: 16, marginTop: 'auto' },
  backButton: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#FFBD73', flex: 1, alignItems: 'center' },
  backButtonText: { color: '#FFBD73', fontWeight: '600' },
  nextButton: { backgroundColor: '#FFBD73', padding: 14, borderRadius: 8, flex: 1, alignItems: 'center' },
  nextButtonText: { color: '#202020', fontWeight: '600' },
});
