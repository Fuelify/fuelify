import 'package:flutter/material.dart';

import 'package:fuelify/screens/dashboard.dart';
import 'package:fuelify/screens/discovery.dart';
import 'package:fuelify/screens/login.dart';
import 'package:fuelify/screens/register.dart';
import 'package:fuelify/screens/welcome.dart';

import 'package:fuelify/providers/auth.dart';
import 'package:fuelify/providers/user_provider.dart';
import 'package:fuelify/providers/feedback_position.dart';
import 'package:fuelify/providers/dark_notifier.dart';

import 'package:fuelify/dependencies/shared_preferences.dart';
import 'package:provider/provider.dart';

import 'models/user.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    Future<User> getUserData() => UserPreferences().getUser();

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => DarkNotifier()),
        ChangeNotifierProvider(create: (_) => FeedbackPositionProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => UserProvider()),
      ],
      child: MaterialApp(
          title: 'Fuelify App',
          theme: ThemeData(
            brightness: Provider.of<DarkNotifier>(context).isDark
                ? Brightness.dark
                : Brightness.light,
            canvasColor: Theme.of(context).brightness == Brightness.dark ||
                    Provider.of<DarkNotifier>(context).isDark
                ? Colors.black45
                : Colors.white,
            primarySwatch: Colors.blue,
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
            '/dashboard': (context) => DashBoard(),
            '/discovery': (context) => Discovery(),
            '/login': (context) => Login(),
            '/register': (context) => Register(),
          }),
    );
  }
}
