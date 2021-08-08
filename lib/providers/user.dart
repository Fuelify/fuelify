import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/dependencies/endpoints.dart';

enum UserStatus {
  NotOnboarded,
  OnboardingNotSaved,
  Onboarded,
}

class UserProvider with ChangeNotifier {
  User _user = new User();
  Profile _profile = new Profile();
  UserStatus _onboardingStatus = UserStatus.NotOnboarded;

  User get user => _user;
  Profile get profile => _profile;
  UserStatus get onboardingStatus => _onboardingStatus;

  void setUser(User user) {
    _user = user;
    notifyListeners();
  }
  
  Future<Map<String, dynamic>> updateProfile(Map<String,dynamic> profile) async {
    var result;

    var url = Uri.parse(AppUrl.userUpdateProfile);

    // Add user id to profile object
    profile['ID'] = _user.id;

    Response response = await post(
      url,
      body: json.encode(profile),
      headers: {'content-type': 'application/json', 'Authorization': _user.token},
    );

    if (response.statusCode == 200) {

      _onboardingStatus = UserStatus.Onboarded;
      notifyListeners();
      result = {
        'status': true,
        'statusCode': response.statusCode,
        'message': 'Successful'
      };

    } else {

      _onboardingStatus = UserStatus.OnboardingNotSaved;
      notifyListeners();
      result = {
        'status': false,
        'statusCode': response.statusCode,
        'message': json.decode(response.body)['error']
      };

    }
    return result;
  }
}