
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final dayViewControllerProvider = StateNotifierProvider<DayViewController,PageController>((ref) {
  return DayViewController();
});

class DayViewController extends StateNotifier<PageController> {
  DayViewController() : super(PageController(initialPage: DateTime.now().weekday-1));

  int get dayOfWeek => state.page as int;

  void moveToPage(int dayOfWeek) {
    state.jumpToPage(dayOfWeek);
  }

  void setCurrentIndex(int dayOfWeek) {
    state.jumpToPage(dayOfWeek);
  }

  void onItemTapped(int dayOfWeek) {
    state.jumpToPage(dayOfWeek);
  }

  @override
  void dispose() {
    state.dispose();
    super.dispose();
  }

}