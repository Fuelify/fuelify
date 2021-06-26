import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/dependencies/endpoints.dart';
import 'package:fuelify/dependencies/user_preferences.dart';

enum Status {
  NotLoggedIn,
  NotRegistered,
  LoggedIn,
  Registered,
  Authenticating,
  Registering,
  LoggedOut
}

class AuthenticationProvider with ChangeNotifier {
  Status _loggedInStatus = Status.NotLoggedIn;
  Status _registeredInStatus = Status.NotRegistered;

  Status get loggedInStatus => _loggedInStatus;
  Status get registeredInStatus => _registeredInStatus;

  Future<Map<String, dynamic>> login(String email, String password) async {
    var result;

    final Map<String, dynamic> loginData = {
      'email': email,
      'password': password
    };

    _loggedInStatus = Status.Authenticating;
    notifyListeners();

    var url = Uri.parse(AppUrl.login);
    
    Response response = await post(
      url,
      body: json.encode(loginData),
      headers: {'content-type': 'application/json'},
    );

    if (response.statusCode == 200) {
      //final Map<String, dynamic> responseData = json.decode(response.body);
      final responseData = jsonDecode(response.body) as Map<String, dynamic>;
      
      var userData = responseData['data'];

      User authUser = User.fromJson(userData);

      UserPreferences().saveUser(authUser);

      _loggedInStatus = Status.LoggedIn;
      notifyListeners();

      result = {'status': true, 'message': 'Successful', 'user': authUser};
    } else {
      _loggedInStatus = Status.NotLoggedIn;
      notifyListeners();
      result = {
        'status': false,
        'message': json.decode(response.body)['error']
      };
    }
    return result;
  }

  /*
    REGISTER USER
  */

  Future<Map<String, dynamic>> register(
      String email, String password, String passwordConfirmation) async {
    final Map<String, dynamic> registrationData = {
      'user': {
        'email': email,
        'password': password,
        'password_confirmation': passwordConfirmation
      }
    };

    _registeredInStatus = Status.Registering;
    notifyListeners();

    var url = Uri.parse(AppUrl.register);

    return await post(url,
            body: json.encode(registrationData),
            headers: {'content-type': 'application/json'})
        .then(onValue)
        .catchError(onError);
  }

  /*
    VERIFY AUTHENTICATION TOKEN IS VALID
  */

  Future<Map<String, dynamic>> tokentest() async {
    var result;

    notifyListeners();

    var token = await UserPreferences()
        .getToken(); // retrieves logged in users auth token
    var url = Uri.parse(AppUrl.testToken);
    
    Response response = await get(
      url,
      headers: {'content-type': 'application/json', 'Authorization': token},
    );
    
    if (response.statusCode == 200) {
      //final Map<String, dynamic> responseData = json.decode(response.body);
      final responseData = jsonDecode(response.body) as Map<String, dynamic>;

      notifyListeners();

      result = responseData;
    } else {
      notifyListeners();
      result = {'Message': 'Failed to send token validation with success'};
    }
    return result;
  }

  static Future<Map<String, dynamic>> onValue(Response response) async {
    var result;
    final Map<String, dynamic> responseData = json.decode(response.body);

    if (response.statusCode == 200) {
      var userData = responseData['data'];

      User authUser = User.fromJson(userData);

      UserPreferences().saveUser(authUser);
      result = {
        'status': true,
        'message': 'Successfully registered',
        'data': authUser
      };
    } else {
      result = {
        'status': false,
        'message': 'Registration failed',
        'data': responseData
      };
    }

    return result;
  }

  static onError(error) {
    print("the error is $error.detail");
    return {'status': false, 'message': 'Unsuccessful Request', 'data': error};
  }
}
