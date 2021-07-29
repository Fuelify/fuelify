import 'package:flutter/foundation.dart';
import 'package:fuelify/models/user.dart';

class UserProvider with ChangeNotifier {
  User _user = new User();
  Profile _profile = new Profile();

  User get user => _user;
  Profile get profile => _profile;

  void setUser(User user) {
    _user = user;
    notifyListeners();
  }
}