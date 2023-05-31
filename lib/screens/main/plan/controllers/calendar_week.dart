import 'package:flutter/material.dart';

import 'package:hooks_riverpod/hooks_riverpod.dart';

final weekViewProvider = StateNotifierProvider<WeekViewNotifier, int>((ref) {
  return WeekViewNotifier();
});

class WeekViewNotifier extends StateNotifier<int> {
  late PageController _controller;

  WeekViewNotifier() : super(500);

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
