import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/commons/profile/photo.dart';
import 'package:fuelify/commons/profile/details.dart';
import 'package:fuelify/commons/profile/buttons.dart';

import 'package:fuelify/commons/navigationbars.dart';

class ProfilePage extends StatefulWidget {
  @override
  _ProfilePageState createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
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
