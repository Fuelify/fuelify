import 'package:flutter/material.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';
import 'package:fuelify/providers/authentication.dart';
import 'package:fuelify/providers/navigation_bar.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/commons/widgets.dart';

class DashBoard extends StatefulWidget {
  @override
  _DashBoardState createState() => _DashBoardState();
}

class _DashBoardState extends State<DashBoard> {
  @override
  Widget build(BuildContext context) {
    User user = Provider.of<UserProvider>(context).user;
    AuthenticationProvider auth = Provider.of<AuthenticationProvider>(context);
    BottomNavigationBarProvider navbar = Provider.of<BottomNavigationBarProvider>(context);

    var requestTokenTest = () async {
      final Map<String, dynamic> requestMessage = await auth.tokentest();
      print(requestMessage);
    };

    var navigateToDiscovery = () async {
      Navigator.pushNamed(context, '/discovery');
    };

    void _onItemTapped(int index) {
      navbar.currentIndex = index;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text("Dashboard"),
        elevation: 0.1,
      ),
      body: Column(
        children: [
          SizedBox(
            height: 50,
          ),
          Center(child: Text(user.email)),
          SizedBox(height: 50),
          ElevatedButton(
              onPressed: () {
                Navigator.pushReplacementNamed(context, '/login');
              },
              child: Text("Logout")),
          SizedBox(height: 25),
          longButtons("Check Token Validation", requestTokenTest),
          SizedBox(height: 35),
          longButtons("Go to Discovery Page", navigateToDiscovery)
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
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
            label: 'Recipes',
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
      ),
    );
  }
}
