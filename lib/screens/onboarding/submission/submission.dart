
import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:confetti/confetti.dart';

import 'package:fuelify/providers/user.dart';
import 'package:fuelify/providers/authentication.dart';
import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:fuelify/models/user.dart';

import 'package:fuelify/widgets/buttons.dart';

class OnboardingSubmissionScreen extends ConsumerStatefulWidget {
  const OnboardingSubmissionScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<OnboardingSubmissionScreen> createState() => _OnboardingSubmissionScreenState();
}

class _OnboardingSubmissionScreenState extends ConsumerState<OnboardingSubmissionScreen> {

  bool showConfetti = false;
  final controller = ConfettiController();
  late Timer confettiTimer;

  Profile profileData = Profile(); // initialize empty profile object
  
  @override
  void initState() {
    //UserProfile().getUserProfile().then(initializeProfileData);
    controller.addListener(() {
      setState(() {
        showConfetti = controller.state == ConfettiControllerState.playing;
      });
    });
    super.initState();
  }

  void initializeProfileData(Profile profile) {
    setState(() {
      this.profileData = profile;
    });
  }

  @override
  Widget build(BuildContext context) {     

    //AuthenticationProvider auth = Provider.of<AuthenticationProvider>(context);
    //UserProvider user = Provider.of<UserProvider>(context);  

    /*var saveOnboarding = (Profile profile) async {
      await user.updateProfile(profileData.toJSON());
      if (user.onboardingStatus == UserStatus.OnboardingSaved) {
        await user.setOnboardingStatus(true);
        nextView("/home");
      } else{
        print('Handle error somehow');
      }
    };*/
    
    var saving = Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        SizedBox(height: 25,),
        CircularProgressIndicator(
          color: Colors.black,
          strokeWidth: 5,
        ),
        SizedBox(height: 20,),
        Text(
          "Hang tight, we are in the process of saving your data...",
          textAlign: TextAlign.center,
          style: TextStyle(
            fontWeight: FontWeight.normal,
            fontSize: 12, 
          ),
        )
      ],
    );

    return Stack(
      alignment: Alignment.topCenter,
      children: [
        Scaffold(
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
                            'Congratulations, you have now completed the onboarding process!',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 20, 
                            ),
                          ),
                          /*user.onboardingStatus == UserStatus.OnboardingSaving || user.onboardingStatus == UserStatus.OnboardingSaved
                          ? saving
                          : Text(""),*/
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              FullWidthOverlayButtonWidget(
                text: 'Submit',
                onClicked: () {
                  // Start confetti falling
                  controller.play();
                  // Run this for maybe one second delay before stopping
                  Timer.periodic(const Duration(seconds: 2), (timer) {
                    controller.stop();
                  });
                  //saveOnboarding(profileData);
                },
              ),
            ]
          ),
        ),
        Positioned(
          top: -100,
          child: ConfettiWidget(
            confettiController: controller,
            emissionFrequency: 0.2,
            shouldLoop: false,
            gravity: 0.2,
            numberOfParticles: 10,
            blastDirectionality: BlastDirectionality.explosive,
          )
        )
        
      ]
    );
  }
}
