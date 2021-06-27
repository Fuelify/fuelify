import 'package:flutter/material.dart';

import 'package:fuelify/screens/home.dart';
import 'package:fuelify/screens/discovery.dart';
import 'package:fuelify/screens/login.dart';
import 'package:fuelify/screens/register.dart';
import 'package:fuelify/screens/welcome.dart';

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
    Future<User> getUserData() => UserPreferences().getUser();

    return MaterialApp(
      title: 'Fuelify App',
      theme: ThemeData(
        brightness: Provider.of<DarkNotifier>(context).isDark
            ? Brightness.dark
            : Brightness.light,
        canvasColor: Theme.of(context).brightness == Brightness.dark ||
                Provider.of<DarkNotifier>(context).isDark
            ? Colors.black45
            : Colors.white,
        primarySwatch: Colors.blueGrey,
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
                  UserPreferences().removeUser();
                return Login();
            }
          }),
      routes: {
        '/home': (context) => HomePage(),
        '/discovery': (context) => Discovery(),
        '/login': (context) => Login(),
        '/register': (context) => Register(),
      }
    );
  }
}
