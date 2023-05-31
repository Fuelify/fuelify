

import 'package:flutter/material.dart';
import 'package:fuelify/screens/main/dashboard/controller.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class BottomNavigationBarWidget extends ConsumerStatefulWidget {
  const BottomNavigationBarWidget({Key? key}) : super(key: key);

  @override
  ConsumerState<BottomNavigationBarWidget> createState() => _BottomNavigationBarWidgetState();
}

class _BottomNavigationBarWidgetState extends ConsumerState<BottomNavigationBarWidget> {
  @override
  Widget build(BuildContext context) {
    final index = ref.watch(dashboardNavigationControllerProvider);
  
    return BottomNavigationBar(
      items: const <BottomNavigationBarItem>[
        BottomNavigationBarItem(
          icon: Icon(Icons.home_rounded),
          label: 'Home',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.calendar_today),
          label: 'Plan',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.search),
          label: 'Discover',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.fastfood),
          label: 'Food',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
      backgroundColor: Colors.blueGrey,
      currentIndex: index,
      onTap: (value) => ref.read(dashboardNavigationControllerProvider.notifier).onItemTapped(value,ref),
      selectedItemColor: Colors.black,
      unselectedItemColor: Colors.black38,
      selectedLabelStyle: const TextStyle(
        /*color: Colors.white,
        fontSize: 14,*/
        fontWeight: FontWeight.w700,
      ),
      unselectedLabelStyle: const TextStyle(
        /*color: Colors.grey,
        fontSize: 12,*/
        fontWeight: FontWeight.w500,
      ),
    );
  }
}