import 'dart:convert';
import 'dart:async';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/models/onboarding.dart';
import 'package:shared_preferences/shared_preferences.dart';


class UserProfile {
  Future<bool> saveUser(User user) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    prefs.setString("id", user.id);
    prefs.setString("name", user.name);
    prefs.setString("email", user.email);
    prefs.setString("phone", user.phone);
    prefs.setString("image", user.image);
    prefs.setString("type", user.type);
    prefs.setString("token", user.token);
    prefs.setString("refreshToken", user.refreshToken);

    return true;
  }

  Future<bool> saveOnboarding(Onboarding onboarding) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    prefs.setString("personal", onboarding.personal.toString());
    prefs.setString("diet", onboarding.diet.toString());
    prefs.setString("devices", onboarding.devices.toString());

    return true;
  }

  Future<bool> saveProfileData(Map<String, dynamic> profileData) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("profile", profileData.toString());
    return true;
  }
  
  Future<Map> getProfileData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? profile = prefs.getString("profile");
    final Map<String,dynamic> profileData;
    if (profile != null) {
      profileData = jsonDecode(profile);
    } else {
      profileData = {};
    }
    return profileData;
  }

  Future<bool> savePersonalData(Map<String, dynamic> personalData) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("personal", json.encode(personalData));
    return true;
  }
  
  Future<Map> getPersonalData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? personal = prefs.getString("personal");
    final Map<String,dynamic> personalData;
    if (personal != null) {
      personalData = jsonDecode(personal);
    } else {
      personalData = {};
    }
    return personalData;
  }
  
  Future<String?> getDietData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? diet = prefs.getString("diet");
    return diet;
  }

  Future<bool> saveDietData(String diet) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("diet", diet);
    return true;
  }
  
  Future<String?> getActivityData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? activity = prefs.getString("activity");
    return activity;
  }

  Future<bool> saveActivityData(String activity) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("activity", activity);
    return true;
  }
  
  Future<List<dynamic>> getGoalsData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? goals = prefs.getString("healthgoals");
    final List<dynamic> healthgoals;
    if (goals != null) {
      healthgoals = json.decode(goals);
    } else {
      healthgoals = [];
    }
    return healthgoals;
  }

  Future<bool> saveGoalsData(List<String> goalsData) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("healthgoals", json.encode(goalsData));
    return true;
  }
  
  Future<String?> getPrimaryGoalData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? goal = prefs.getString("primarygoal");
    return goal;
  }

  Future<bool> savePrimaryGoalData(String goal) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("primarygoal", goal);
    return true;
  }

  Future<bool> saveWeightGoalsData(Map<String, dynamic> weightGoalsData) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("weightgoals", json.encode(weightGoalsData));
    return true;
  }
  
  Future<Map> getWeightGoalsData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? weightGoals = prefs.getString("weightgoals");
    final Map<String,dynamic> weightGoalsData;
    if (weightGoals != null) {
      weightGoalsData = jsonDecode(weightGoals);
    } else {
      weightGoalsData = {};
    }
    return weightGoalsData;
  }

  Future<bool> saveShoppingData(Map<String, dynamic> shoppingData) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("shopping", json.encode(shoppingData));
    return true;
  }
  
  Future<Map> getShoppingData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? shopping = prefs.getString("shopping");
    final Map<String,dynamic> shoppingData;
    if (shopping != null) {
      shoppingData = jsonDecode(shopping);
    } else {
      shoppingData = {};
    }
    return shoppingData;
  }

  Future<bool> saveEatingData(Map<String, dynamic> eatingData) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString("eating", json.encode(eatingData));
    return true;
  }
  
  Future<Map> getEatingData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String? eating = prefs.getString("eating");
    final Map<String,dynamic> eatingData;
    if (eating != null) {
      eatingData = jsonDecode(eating);
    } else {
      eatingData = {};
    }
    return eatingData;
  }

  Future<User> getUser() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    String id = prefs.getString("id") ?? "";
    String name = prefs.getString("name") ?? "";
    String email = prefs.getString("email") ?? "";
    String phone = prefs.getString("phone") ?? "";
    String image = prefs.getString("image") ?? "";
    String type = prefs.getString("type") ?? "";
    String token = prefs.getString("token") ?? "";
    String refreshToken = prefs.getString("refreshToken") ?? "";

    return User(
        id: id,
        name: name,
        email: email,
        phone: phone,
        image: image,
        type: type,
        token: token,
        refreshToken: refreshToken);
  }

  Future<String> getUserPersonalData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    String personal = prefs.getString("personal") ?? "";
    
    return personal;
  }

  void removeUser() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();

    prefs.remove("name");
    prefs.remove("email");
    prefs.remove("phone");
    prefs.remove("image");
    prefs.remove("type");
    prefs.remove("token");
  }

  Future<String> getToken() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    String token = prefs.getString("token") ?? "";
    return token;
  }
}
