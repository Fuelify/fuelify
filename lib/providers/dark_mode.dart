import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final Future<SharedPreferences> sharedPreferences = SharedPreferences.getInstance();

class DarkNotifier extends StateNotifier<bool> {
  DarkNotifier(bool? defaultMode) : super(defaultMode ?? false);

  Future<void> loadDarkModePreference() async {
    final prefs = await sharedPreferences;
    bool darkPref = prefs.getBool('isDark') ?? false;
    state = darkPref;
  }

  Future<void> saveDarkModePreference() async {
    final prefs = await sharedPreferences;
    prefs.setBool('isDark', state);
  }

  void toggleDarkMode() {
    state = !state;
    saveDarkModePreference();
  }
}
