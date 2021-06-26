import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/dependencies/endpoints.dart';
import 'package:fuelify/dependencies/user_preferences.dart';

class NetworkProvider with ChangeNotifier {
  /*
    FETCH ADDITIONAL FOODS
  */

  Future<Map<String, dynamic>> fetchFoods() async {
    var result;

    notifyListeners();

    var token = await UserPreferences()
        .getToken(); // retrieves logged in users auth token
    var url = Uri.parse(AppUrl.fetchFoods);

    Response response = await get(
      url,
      headers: {'content-type': 'application/json', 'Authorization': token},
    );
    
    if (response.statusCode == 200) {
      final responseData = jsonDecode(response.body) as Map<String, dynamic>;
      
      notifyListeners();

      result = responseData;
    } else {
      notifyListeners();
      result = {'Message': 'Failed fetch additional foods to showcase'};
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
