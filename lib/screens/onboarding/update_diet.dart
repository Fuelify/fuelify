import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/commons/onboarding/profile.dart';
import 'package:fuelify/commons/buttons.dart';
import 'package:fuelify/commons/dropdowns.dart';

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
          DropDownWidget(),
          
          //RadioListTile
          SizedBox(
            height: 24,
          ),
          DatePickerDialog(
            initialDate: DateTime.utc(1990,1,1), 
            firstDate: DateTime.utc(1900,1,1), 
            lastDate: DateTime.now()
            
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
