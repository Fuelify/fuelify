
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final weekViewControllerProvider = StateNotifierProvider<WeekViewController,PageController>((ref) {
  return WeekViewController();
});

class WeekViewController extends StateNotifier<PageController> {
  WeekViewController() : super(PageController(initialPage: 500));

  void moveToPage(int page) {
    state.jumpToPage(page);
  }

  @override
  void dispose() {
    state.dispose();
    super.dispose();
  }

}