import 'package:flutter/material.dart';
import 'package:fuelify/models/errors.dart';
import 'package:fuelify/networking/router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class ErrorBoundary extends ConsumerWidget {
  final Widget child;

   const ErrorBoundary({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return LayoutBuilder(
      builder: (context, constraints) {
        try {
          return child;
        } on AuthenticationException {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            // Use your router provider to redirect to login page
            final router = ref.read(routerProvider);
            router.goNamed('login');
          });
          return Container();  // Or show an error widget
        }
      },
    );
  }
}
