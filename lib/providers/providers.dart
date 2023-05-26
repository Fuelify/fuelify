import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fuelify/providers/authentication.dart';
import 'package:fuelify/providers/dark_mode.dart';
import 'package:fuelify/providers/feedback_position.dart';
import 'package:fuelify/providers/food.dart';
import 'package:fuelify/providers/navigation_bar.dart';
import 'package:fuelify/providers/networking.dart';
import 'package:fuelify/providers/user.dart';

final darkPrefsProvider = StateNotifierProvider<DarkNotifier, bool>(
    (ref) => DarkNotifier(false)..loadDarkModePreference());

/*class Providers {
  static final providers = [
    darkPrefsProvider,
    StateNotifierProvider<DiscoverFoodsProvider, DiscoverFoodsState>(create: (_) => DiscoverFoodsProvider()),
    StateNotifierProvider<FeedbackPositionProvider, FeedbackPositionState>(create: (_) => FeedbackPositionProvider()),
    StateNotifierProvider<AuthenticationProvider, AuthenticationState>(create: (_) => AuthenticationProvider()),
    StateNotifierProvider<NetworkProvider, NetworkState>(create: (_) => NetworkProvider()),
    StateNotifierProvider<UserProvider, UserState>(create: (_) => UserProvider()),
    StateNotifierProvider<BottomNavigationBarProvider, BottomNavigationBarState>(create: (_) => BottomNavigationBarProvider()),
  ];
}*/
