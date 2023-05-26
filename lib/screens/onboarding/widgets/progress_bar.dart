

import 'package:flutter/material.dart';
import 'package:fuelify/screens/onboarding/controller.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class OnboardingProgressBarWidget extends ConsumerStatefulWidget implements PreferredSizeWidget {
  const OnboardingProgressBarWidget({Key? key}) : super(key: key);

  @override
  ConsumerState<OnboardingProgressBarWidget> createState() => _OnboardingProgressBarWidgetState();
    
  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 4.0);
}

class _OnboardingProgressBarWidgetState extends ConsumerState<OnboardingProgressBarWidget> {

  @override
  Widget build(BuildContext context) {
    ref.watch(onboardingNavigationProgressControllerProvider);

    final title = ref.read(onboardingNavigationProgressControllerProvider.notifier).title;
    final progress = ref.read(onboardingNavigationProgressControllerProvider.notifier).progress;
  
    return AppBar(
      title: Text(
        title
      ),
      leading: ref.read(onboardingNavigationProgressControllerProvider) == 0 ? 
        null : 
        InkWell(
          onTap: () {
            ref.read(onboardingNavigationProgressControllerProvider.notifier).onBackTapped(ref);
          },
          child: const Icon(
            Icons.arrow_back_rounded,
            color: Colors.black54,
          ),
        ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(4.0), // here specify the height of your AppBar.
        child: LinearProgressIndicator(
          value: progress, // progress state is reflected here
        ),
      ),
    );
  }
}