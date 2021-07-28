import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/commons/buttons.dart';
import 'package:fuelify/commons/onboarding/personal.dart';

class PersonalDetailsUpdate extends StatefulWidget {
  @override
  _PersonalDetailsUpdateState createState() => _PersonalDetailsUpdateState();
}

class _PersonalDetailsUpdateState extends State<PersonalDetailsUpdate> {

  //Future<User> getUserData() => UserProfile().getUser();
  Map<String, dynamic> personalData = {}; // initialize empty personal data map
  
  @override
  void initState() {
    UserProfile().getPersonalData().then(initializePersonalData);
    super.initState();
  }

  void initializePersonalData(Map data) {
    setState(() {
      this.personalData = data as Map<String, dynamic>;
    });
  }

  @override
  Widget build(BuildContext context) {
    User user = Provider.of<UserProvider>(context).user;
    
    final formKey = new GlobalKey<FormState>();

    

    var recordData = () {
      final form = formKey.currentState;

      if (form!.validate()) {
        form.save();
        UserProfile().savePersonalData(personalData);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text("Invalid Form: " + "Please Complete the form properly")));
      }
    };

    final nextView = (routeName) {
      print(routeName);
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Personal Details"),
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
                      PersonalInfoWidget(
                        user: user,
                        formKey: formKey,
                        personalData: personalData,
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
              nextView("/onboarding/diet");
            },
          ),
        ]
      )
    );
  }
}
