import 'package:flutter/material.dart';
import 'package:fuelify/screens/onboarding/controller.dart';
import 'package:fuelify/widgets/buttons.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class OnboardingWelcomeScreen extends ConsumerStatefulWidget {
  const OnboardingWelcomeScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<OnboardingWelcomeScreen> createState() => _OnboardingWelcomeScreenState();
}

class _OnboardingWelcomeScreenState extends ConsumerState<OnboardingWelcomeScreen> {
  //TODO make this screen a welcome to the onboarding screen

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Column(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 20.0, bottom: 60.0),
                  child: ListView(
                    children: [
                      // Custom animation widget
                      Image.asset('assets/onboarding/welcome.gif'),
                      const SizedBox(height: 12.0),
                      const Text(
                        'Welcome to Fuelify, to get started we need to collect some information to enable us to best serve you and your goals!',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 20, 
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          FullWidthOverlayButtonWidget(
            text: "Let's Do It!",
            onClicked: () {
              ref.read(onboardingNavigationProgressControllerProvider.notifier).onContinueTapped(ref);
            },
          ),
        ]
      )
    );
  }
}