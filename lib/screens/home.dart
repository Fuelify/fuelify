import 'package:flutter/material.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';
import 'package:fuelify/providers/authentication.dart';
import 'package:fuelify/providers/navigation_bar.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/commons/widgets.dart';
import 'package:fuelify/commons/navigationbars.dart';

class HomePage extends StatefulWidget {
  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
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
      navbar.currentIndex = 2;
      Navigator.pushNamed(context, '/discovery');
    };

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
        bottomNavigationBar: BottomNavigationBarWidget());
  }
}
