import 'dart:convert';

import 'package:fuelify/models/meal.dart';
import 'package:fuelify/providers/externals/userapi/repository.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

final mealPlanProvider = StateNotifierProvider<MealPlanController, Map<String, List<Meal>>>((ref) {
  return MealPlanController();
});

class MealPlanController extends StateNotifier<Map<String, List<Meal>>> {
  MealPlanController() : super({});

  UserAPI userApi = UserAPI();

  Future<void> preloadData() async {

    Map<String, List<Meal>> mealPlan = {};

    // Find current week date and fetch data for two week prior to this week and two week into future
    DateTime firstDayOfCurrentWeek = DateTime.now().subtract(Duration(days: DateTime.now().weekday - 1)); // first day of this week
    DateTime start = firstDayOfCurrentWeek.subtract(const Duration(days: 14));
    DateTime end = firstDayOfCurrentWeek.add(const Duration(days: 20));

    // Fetch data from api and convert into digestible format for showing in UI
    final response = await userApi.getMealPlan(DateFormat('yyyy-MM-dd').format(start), DateFormat('yyyy-MM-dd').format(end));
    
    // Convert response.data to Map<String, dynamic>
    Map<String, dynamic> dataMap = response.data['data'];

    mealPlan = dataMap.map((key, value) {
      return MapEntry(key, (value as List<dynamic>).map((v) => Meal.fromJSON(v)).toList());
    });
    
    // Save data to Hive
      // ...

    state = mealPlan;
  }

  moveMeal(Meal meal, DateTime moveTo) {
    print(meal.date);
    print(moveTo);

    // Update meal date
    
    // Update state holding meal plan data
    
    state = state;
    
  }


}