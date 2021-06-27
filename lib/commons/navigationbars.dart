import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/providers/navigation_bar.dart';
import 'package:fuelify/dependencies/navigation.dart';

class BottomNavigationBarWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final navbar = Provider.of<BottomNavigationBarProvider>(context);

    void _onItemTapped(int index) {
      navbar.currentIndex = index;
      Navigator.pushReplacementNamed(context, "/"+Navigate.Page[index]);
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
          icon: Icon(Icons.food_bank_rounded),
          label: 'Food',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
      currentIndex: navbar.currentIndex,
      selectedItemColor: Colors.black,
      unselectedItemColor: Colors.black38,
      onTap: _onItemTapped,
    );
  }
}
