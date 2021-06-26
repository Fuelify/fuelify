import 'package:flutter/foundation.dart';
import 'package:fuelify/models/food.dart';
import 'package:fuelify/data/foods.dart';

class DiscoverFoodsProvider with ChangeNotifier {
  List<Food> _foods = dummyFoods;

  List<Food> get foods => _foods;

  void setFoods(List<Food> foods) {
    _foods = foods;

    notifyListeners();
  }

  void addFoods(List<Food> foods) {
    /*var newFoodList = _foods;
    for (final food in foods) {
      newFoodList.add(food);
    }*/
    //_foods = newFoodList;
    _foods = foods;

    notifyListeners();
  }
}
