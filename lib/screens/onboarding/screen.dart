import 'package:flutter/material.dart';
import 'package:fuelify/screens/onboarding/widgets/progress_bar.dart';


class OnboardingScreen extends StatefulWidget {
  final Widget child;
  const OnboardingScreen({required this.child, Key? key}) : super(key: key);

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const OnboardingProgressBarWidget(),
      body: widget.child,
    );
  }
}