import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/widgets/profile/photo.dart';
import 'package:fuelify/widgets/profile/details.dart';
import 'package:fuelify/widgets/profile/buttons.dart';

import 'package:fuelify/widgets/navigationbars.dart';

class ProfileScreen extends MaterialPage {
  ProfileScreen() : super(child: _ProfileScreen());
}

class _ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<_ProfileScreen> {
  @override
  Widget build(BuildContext context) {
    User user = Provider.of<UserProvider>(context).user;
    Profile profile = Provider.of<UserProvider>(context).profile;

    return Scaffold(
        appBar: AppBar(
          title: Text("Profile"),
          elevation: 0.1,
        ),
        body: ListView(
          children: [
            ProfilePhotoWidget(
              profile: profile,
              onClicked: () async {},
            ),
            SizedBox(height: 24,),
            buildName(user),
            SizedBox(height: 24,),
            Center(
              child: UpgradeButtonWidget(
                text: 'Upgrade to PRO',
                onClicked: () {}
              ),
            ),
          ],
        ),
        bottomNavigationBar: BottomNavigationBarWidget());
  }
}
