import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/commons/buttons.dart';
import 'package:fuelify/commons/profile/photo.dart';
import 'package:fuelify/commons/onboarding/profile.dart';

class ProfileUpdate extends StatefulWidget {
  @override
  _ProfileUpdateState createState() => _ProfileUpdateState();
}

class _ProfileUpdateState extends State<ProfileUpdate> {

  @override
  Widget build(BuildContext context) {
    Profile profile = Provider.of<UserProvider>(context).profile;

    final formKey = new GlobalKey<FormState>();

    Map<String, dynamic> profileData = {}; // initialize empty personal data map

    final nextView = (routeName) {
      print(routeName);
      Navigator.pushNamed(context, routeName);
    };

    var recordData = () {
      final form = formKey.currentState;

      if (form!.validate()) {
        form.save();
        print(profileData);
        UserProfile().saveProfileData(profileData);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text("Invalid Form: " + "Please Complete the form properly")));
      }
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Profile Information"),
        elevation: 0.1,
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Column(
            children: [
              Expanded(
                child: Container(
                  padding: EdgeInsets.only(left: 20.0, right: 20.0, top: 20.0, bottom: 60.0),
                  child: ListView(
                    children: [
                      ProfilePhotoWidget(
                        profile: profile,
                        onClicked: () async {},
                      ),
                      ProfileInfoWidget(
                        profile: profile,
                        formKey: formKey,
                        profileData: profileData,
                      ),
                      SizedBox(
                        height: 24,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          FullWidthOverlayButtonWidget(
            text: 'Continue',
            onClicked: () {
              recordData();
              nextView("/onboarding/personal-details");
            },
          ),
        ]
      )
    );
  }
}
