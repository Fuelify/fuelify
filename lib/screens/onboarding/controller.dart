

import 'package:fuelify/networking/router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final onboardingNavigationProgressControllerProvider = StateNotifierProvider<OnboardingNavigationProgressController,int>((ref) {
  return OnboardingNavigationProgressController(0);
});

class OnboardingNavigationProgressController extends StateNotifier<int> {
  OnboardingNavigationProgressController(int? defaultIndex) : super(defaultIndex ?? OnboardingRoutes.defaultLandingRoute);

  String get title => OnboardingRoutes.route[state];
  double get progress => state / (OnboardingRoutes.route.length-1); 

  void setCurrentIndex(int index) {
    state = index;
  }

  void onContinueTapped(WidgetRef ref) {
    // Set onboarding controller state value back one
    state = state+1;
    // Navigate to tapped indexed route screen
    ref.read(routerProvider).pushNamed(OnboardingRoutes.route[state]);
  }

  void onBackTapped(WidgetRef ref) {
    // Set onboarding controller state value forward one
    state = state-1;
    // Navigate to tapped indexed route screen
    ref.read(routerProvider).pop(OnboardingRoutes.route[state]);
  }

}