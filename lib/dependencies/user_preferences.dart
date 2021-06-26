import 'package:fuelify/models/user.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';

class UserPreferences {
  Future<bool> saveUser(User user) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    prefs.setInt("userId", user.userId);
    prefs.setString("name", user.name);
    prefs.setString("email", user.email);
    prefs.setString("phone", user.phone);
    prefs.setString("type", user.type);
    prefs.setString("token", user.token);
    prefs.setString("refreshToken", user.refreshToken);

    return true;
  }

  Future<User> getUser() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    int userId = prefs.getInt("userId") ?? 0;
    String name = prefs.getString("name") ?? "";
    String email = prefs.getString("email") ?? "";
    String phone = prefs.getString("phone") ?? "";
    String type = prefs.getString("type") ?? "";
    String token = prefs.getString("token") ?? "";
    String refreshToken = prefs.getString("refreshToken") ?? "";

    return User(
        userId: userId,
        name: name,
        email: email,
        phone: phone,
        type: type,
        token: token,
        refreshToken: refreshToken);
  }

  void removeUser() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    prefs.remove("name");
    prefs.remove("email");
    prefs.remove("phone");
    prefs.remove("type");
    prefs.remove("token");
  }

  Future<String> getToken() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String token = prefs.getString("token") ?? "";
    return token;
  }
}
