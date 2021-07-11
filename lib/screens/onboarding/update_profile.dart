import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/commons/profile/photo.dart';
import 'package:fuelify/commons/onboarding/profile.dart';

class ProfileUpdate extends StatefulWidget {
  @override
  _ProfileUpdateState createState() => _ProfileUpdateState();
}

class _ProfileUpdateState extends State<ProfileUpdate> {

  @override
  Widget build(BuildContext context) {
    User user = Provider.of<UserProvider>(context).user;

    return Scaffold(
      appBar: AppBar(
        title: Text("Profile Information"),
        elevation: 0.1,
      ),
      body: ListView(
        children: [
          ProfilePhotoWidget(
            user: user,
            onClicked: () async {},
          ),
          SizedBox(
            height: 24,
          ),
          ProfileInfoWidget(
            user: user,
            buttonText: "Continue",
            buttonRoute: "/onboarding/diet"
          ),
          SizedBox(
            height: 24,
          ),
        ],
      ),
    );
  }
}
