import 'package:flutter/material.dart';

import 'package:hooks_riverpod/hooks_riverpod.dart';

final dayViewProvider = StateNotifierProvider<DayViewNotifier, int>((ref) {
  return DayViewNotifier();
});

class DayViewNotifier extends StateNotifier<int> {
  late PageController _controller;

  DayViewNotifier() : super(DateTime.now().weekday-1);

  int get day => state;

  set controller(PageController controller) {
    _controller = controller;
    _controller.addListener(_onPageChanged);
  }

  void _onPageChanged() {
    state = _controller.page!.toInt();
  }

  void setPage(int page) {
    state = page;
  }

  @override
  void dispose() {
    _controller.removeListener(_onPageChanged);
    _controller.dispose();
    super.dispose();
  }
}
