
import 'package:hooks_riverpod/hooks_riverpod.dart';

final planCalendarNavigationControllerProvider = StateNotifierProvider<PlanCalendarNavigationController,int>((ref) {
  return PlanCalendarNavigationController(null);
});

class PlanCalendarNavigationController extends StateNotifier<int> {
  PlanCalendarNavigationController(int? todayIndex) : super(todayIndex ?? 0);

  int get index => state;

  void setCurrentIndex(int index) {
    state = index;
  }

  void onItemTapped(int index) {
    // Set dashboard controller state value
    state = index;
  }

}