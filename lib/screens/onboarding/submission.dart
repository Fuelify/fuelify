import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/providers/user.dart';
import 'package:fuelify/providers/authentication.dart';
import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:fuelify/models/user.dart';

import 'package:fuelify/commons/buttons.dart';

class Submission extends StatefulWidget {
  @override
  _SubmissionState createState() => _SubmissionState();
}

class _SubmissionState extends State<Submission> {

  Profile profileData = Profile(); // initialize empty profile object
  
  @override
  void initState() {
    UserProfile().getUserProfile().then(initializeProfileData);
    super.initState();
  }

  void initializeProfileData(Profile profile) {
    setState(() {
      this.profileData = profile;
    });
  }

  @override
  Widget build(BuildContext context) {     

    AuthenticationProvider auth = Provider.of<AuthenticationProvider>(context);
    UserProvider user = Provider.of<UserProvider>(context);  

    final nextView = (routeName) {
      print(routeName);
      Navigator.pushNamed(context, routeName);
    };

    var saveOnboarding = (Profile profile) async {
      print('saving data');
      final Map<String, dynamic> requestMessage = await user.updateProfile(profileData.toJSON());
      //Provider.of<UserProvider>(context, listen: false).setUser(user); // set without triggering consumers to rebuild
      print(requestMessage);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Submission"),
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
                      Text(
                        'Congratulations, you have now completed the onboarding process!'
                      )
                    ],
                  ),
                ),
              ),
            ],
          ),
          FullWidthOverlayButtonWidget(
            text: 'Continue',
            onClicked: () {
              saveOnboarding(profileData);
              //nextView("/onboarding/personal-details");
            },
          ),
        ]
      )
    );
  }
}
