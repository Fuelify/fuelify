import 'package:fuelify/networking/router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';


class BottomNavigationBarProvider extends StateNotifier<int> {
  BottomNavigationBarProvider(int? defaultIndex) : super(defaultIndex ?? DashboardRoutes.defaultLandingRoute);

  void setCurrentIndex(int index) {
    state = index;
  }

}
