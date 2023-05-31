

import 'package:flutter/material.dart';
import 'package:fuelify/screens/onboarding/controller.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class PlanScreenNavigationBarWidget extends ConsumerStatefulWidget implements PreferredSizeWidget {
  const PlanScreenNavigationBarWidget({Key? key}) : super(key: key);

  @override
  ConsumerState<PlanScreenNavigationBarWidget> createState() => _PlanScreenNavigationBarWidgetState();
    
  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 8.0);
}

class _PlanScreenNavigationBarWidgetState extends ConsumerState<PlanScreenNavigationBarWidget> {

  @override
  Widget build(BuildContext context) {
    //ref.watch(planNavigationProgressControllerProvider);
  
    return AppBar(
      title: Text(
        'Week View'
      ),
      shadowColor: Colors.black,
      elevation: 0.1,
      backgroundColor: Color.fromARGB(71, 234, 234, 234),
    );
  }
}