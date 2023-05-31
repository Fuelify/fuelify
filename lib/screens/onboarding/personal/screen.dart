import 'package:flutter/material.dart';
import 'package:fuelify/screens/onboarding/controller.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/widgets/buttons.dart';
import 'package:fuelify/widgets/onboarding/personal.dart';

class PersonalDetailsUpdateScreen extends ConsumerStatefulWidget {
  const PersonalDetailsUpdateScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<PersonalDetailsUpdateScreen> createState() => _PersonalDetailsUpdateScreenState();
}

class _PersonalDetailsUpdateScreenState extends ConsumerState<PersonalDetailsUpdateScreen> {

  @override
  Widget build(BuildContext context) {
    //Profile profile = Provider.of<UserProvider>(context).profile;
    Profile profile = User().profile;
    final personalData = {};
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
            text: "Continue",
            onClicked: () {
              ref.read(onboardingNavigationProgressControllerProvider.notifier).onContinueTapped(ref);
            },
          ),
        ]
      )
    );
  }
}