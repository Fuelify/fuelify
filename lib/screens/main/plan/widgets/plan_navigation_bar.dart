

import 'package:flutter/material.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_day.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_day_navigation.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_week.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_week_navigation.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class PlanScreenNavigationBarWidget extends ConsumerStatefulWidget implements PreferredSizeWidget {
  const PlanScreenNavigationBarWidget({Key? key}) : super(key: key);

  @override
  ConsumerState<PlanScreenNavigationBarWidget> createState() => _PlanScreenNavigationBarWidgetState();
    
  @override
  Size get preferredSize => const Size.fromHeight(50);
}

class _PlanScreenNavigationBarWidgetState extends ConsumerState<PlanScreenNavigationBarWidget> {

  @override
  Widget build(BuildContext context) {
    final weekPage = ref.watch(weekViewProvider);

    return AppBar(
      title: Row(
        children: [
          const Expanded(
            child: Text(
              'Calendar',
              style: TextStyle(fontSize: 20)
              ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: SizedBox(height: 30, child: ElevatedButton(
                onPressed: () {
                  // Navigate to todays date on calendar view
                  ref.read(weekViewControllerProvider.notifier).moveToPage(500);
                  ref.read(dayViewControllerProvider.notifier).moveToPage(DateTime.now().weekday-1);
                  ref.read(dayViewProvider.notifier).setPage(DateTime.now().weekday-1);
                },
                child: Text(
                  weekPage != 500 ? 'This Week' : 'Today',
                  style: const TextStyle(fontSize: 12)
                ),
              ),
            )
           )
        ],
      ),
      backgroundColor: Colors.white,
      shadowColor: Colors.black,
      elevation: 0.1,
    );
  }
}