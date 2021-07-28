import 'package:flutter/material.dart';

import 'package:fuelify/constants.dart';

import 'package:fuelify/screens/home.dart';
import 'package:fuelify/screens/plan.dart';
import 'package:fuelify/screens/discovery.dart';
import 'package:fuelify/screens/food.dart';
import 'package:fuelify/screens/profile.dart';
import 'package:fuelify/screens/login.dart';
import 'package:fuelify/screens/register.dart';
//import 'package:fuelify/screens/welcome.dart';
import 'package:fuelify/screens/onboarding/update_profile.dart';
import 'package:fuelify/screens/onboarding/update_personal.dart';
import 'package:fuelify/screens/onboarding/update_diet.dart';
import 'package:fuelify/screens/onboarding/update_activity.dart';
import 'package:fuelify/screens/onboarding/update_devices.dart';
import 'package:fuelify/screens/onboarding/update_goals.dart';
import 'package:fuelify/screens/onboarding/update_primarygoal.dart';
import 'package:fuelify/screens/onboarding/update_weightgoals.dart';
import 'package:fuelify/screens/onboarding/update_shopping.dart';

import 'package:fuelify/providers/navigation_bar.dart';
import 'package:fuelify/providers/authentication.dart';
import 'package:fuelify/providers/user.dart';
import 'package:fuelify/providers/networking.dart';
import 'package:fuelify/providers/feedback_position.dart';
import 'package:fuelify/providers/dark_mode.dart';
import 'package:fuelify/providers/food.dart';

import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:provider/provider.dart';

import 'models/user.dart';

void main() {
  runApp(MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => DarkNotifier()),
      ChangeNotifierProvider(create: (_) => DiscoverFoodsProvider()),
      ChangeNotifierProvider(create: (_) => FeedbackPositionProvider()),
      ChangeNotifierProvider(create: (_) => AuthenticationProvider()),
      ChangeNotifierProvider(create: (_) => NetworkProvider()),
      ChangeNotifierProvider(create: (_) => UserProvider()),
      ChangeNotifierProvider(create: (_) => BottomNavigationBarProvider()),
    ],
    child: MyApp(),
  ));
}

class MyApp extends StatelessWidget {
  // This widget is the root of the mobile application
  @override
  Widget build(BuildContext context) {
    Future<User> getUserData() => UserProfile().getUser();

    return MaterialApp(
      title: 'Fuelify',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Provider.of<DarkNotifier>(context).isDark
            ? Brightness.dark
            : Brightness.light,
        canvasColor: Theme.of(context).brightness == Brightness.dark ||
                Provider.of<DarkNotifier>(context).isDark
            ? Colors.black45
            : Colors.white,
        primaryColor: primaryThemeColor.shade100,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: FutureBuilder(
          future: getUserData(),
          builder: (context, snapshot) {
            switch (snapshot.connectionState) {
              case ConnectionState.none:
              case ConnectionState.waiting:
                return CircularProgressIndicator();
              default:
                if (snapshot.hasError)
                  return Text('Error: ${snapshot.error}');
                else if (!snapshot.hasData)
                  return Login();
                else
                  UserProfile().removeUser();
                return Login();
            }
          }),
      routes: {
        '/home': (context) => HomePage(),
        '/plan': (context) => PlanPage(),
        '/discovery': (context) => DiscoveryPage(),
        '/food': (context) => FoodPage(),
        '/profile': (context) => ProfilePage(),
        '/login': (context) => Login(),
        '/register': (context) => Register(),
        '/onboarding/profile': (context) => ProfileUpdate(),
        '/onboarding/personal-details': (context) => PersonalDetailsUpdate(),
        '/onboarding/diet': (context) => DietUpdate(),
        '/onboarding/activity-level': (context) => ActivityLevelUpdate(),
        '/onboarding/device-connections': (context) => DeviceConnectionsUpdate(),
        '/onboarding/health-goals': (context) => HealthGoalsUpdate(),
        '/onboarding/health-primary': (context) => PrimaryGoalUpdate(),
        '/onboarding/weight-goals': (context) => WeightGoalsUpdate(),
        '/onboarding/shopping-preferences': (context) => ShoppingPreferencesUpdate(),
      }
    );
  }
}
