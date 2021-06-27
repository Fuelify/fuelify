import 'package:flutter/material.dart';
import 'package:fuelify/commons/navigationbars.dart';

class ProfilePage extends StatefulWidget {
  @override
  _ProfilePageState createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  @override
  Widget build(BuildContext context) {

    return Scaffold(
        appBar: AppBar(
          title: Text("Profile"),
          elevation: 0.1,
        ),
        body: Column(
          children: [
            SizedBox(
              height: 50,
            ),
          ],
        ),
        bottomNavigationBar: BottomNavigationBarWidget());
  }
}
