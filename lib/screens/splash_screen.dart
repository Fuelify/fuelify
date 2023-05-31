import 'package:flutter/material.dart';
import 'package:fuelify/constants.dart';
import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:go_router/go_router.dart';


class SplashScreen extends MaterialPage {
  SplashScreen() : super(child: _SplashScreen());
}

class _SplashScreen extends StatefulWidget {
  @override
  _SplashScreenState createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  Future<void> navigateToScreen(BuildContext context) async {
    try {
      if (debug) {
        context.goNamed(debugEnterRoute);

      } else { 
        final user = await UserProfile().getUser();
        
        // ignore: unnecessary_null_comparison
        if (user.authentication.token != '') {
          context.goNamed('plan');
        } else {
          context.goNamed('login');
        }
      }
    } catch (e) {
      print(e);
      // Show an error message if there's an error while fetching user data
      showDialog(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: const Text('Error'),
            content: const Text('Failed to load user data. Please check your internet connection and try again.'),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  // Navigate to login screen if there's an error while fetching user data
                  context.go('/home');
                },
                child: const Text('OK'),
              ),
            ],
          );
        },
      );
    }
  }

  @override
  void initState() {
    super.initState();

    // Define an animation controller with a duration of 2 seconds
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    // Define an animation that goes from 0.0 to 1.0
    _animation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(_animationController);
    

    // Start the animation
    _animationController.forward().then((_) {
      // Animation completed, navigate to appropriate screen
      navigateToScreen(context);
    });

  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _animation,
      child: Container(
        color: Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Custom animation widget
              Image.asset('assets/splash_animation.gif'),
              const SizedBox(height: 16.0),
              const Text(
                'Welcome to Fuelify',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 18.0,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      )
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
}