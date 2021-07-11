import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/dependencies/user_preferences.dart';

import 'package:fuelify/commons/onboarding/profile.dart';
import 'package:fuelify/commons/buttons.dart';
import 'package:fuelify/commons/dropdowns.dart';
import 'package:fuelify/commons/customdropdowns.dart';

class DietUpdate extends StatefulWidget {
  @override
  _DietUpdateState createState() => _DietUpdateState();
}

class _DietUpdateState extends State<DietUpdate> {
  @override
  Widget build(BuildContext context) {
    User user = Provider.of<UserProvider>(context).user;

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Dietary Preferences"),
        elevation: 0.1,
      ),
      body: ListView(
        children: [
          SizedBox(
            height: 24,
          ),
          //RadioListTile
          SizedBox(
            height: 24,
          ),
          Center(
            child: FullWidthButtonWidget(
              text: 'Continue',
              onClicked: () {
                nextView("/onboarding/device-connections");
              },
            ),
          ),
        ],
      ),
    );
  }
}
