import 'package:flutter/material.dart';
import 'package:fuelify/networking/router.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:fuelify/providers/navigation_bar.dart';

final navbarProvider = StateNotifierProvider<BottomNavigationBarProvider, int>(
    (ref) => BottomNavigationBarProvider(null));


class BottomNavigationBarWidget extends ConsumerWidget {
  const BottomNavigationBarWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {

    final navbarIndex = ref.watch(navbarProvider);

    void onItemTapped(int index) {
      // Update navbarProvider state value
      ref.read(navbarProvider.notifier).setCurrentIndex(index);
      context.goNamed(DashboardRoutes.route[index]);
    }

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
          label: 'Discovery',
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
      currentIndex: navbarIndex,
      selectedItemColor: Colors.black,
      unselectedItemColor: Colors.black38,
      onTap: onItemTapped,
    );
  }
}
