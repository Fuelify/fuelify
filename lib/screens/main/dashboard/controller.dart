

import 'package:fuelify/networking/router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final dashboardNavigationControllerProvider = StateNotifierProvider<DashboardNavigationController,int>((ref) {
  return DashboardNavigationController(null);
});

class DashboardNavigationController extends StateNotifier<int> {
  DashboardNavigationController(int? defaultIndex) : super(defaultIndex ?? DashboardRoutes.defaultLandingRoute);

  void setCurrentIndex(int index) {
    state = index;
  }

  void onItemTapped(int index, WidgetRef ref) {

    // Set dashboard controller state value
    state = index;
    
    // Navigate to tapped indexed route screen
    ref.read(routerProvider).goNamed(DashboardRoutes.route[index]);
  }

}