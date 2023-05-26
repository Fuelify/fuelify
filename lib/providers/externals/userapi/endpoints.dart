import 'package:fuelify/providers/externals/userapi/model.dart';

class UserApiEndpoints {
  static const String _baseURL = 'http://10.0.2.2:3000'; //'http://localhost:3000'; 
  static const String _apiVersion = '/api/v1';

  static ApiEndpoint get login => ApiEndpoint(
    url: '$_baseURL$_apiVersion/user/login',
    method: 'POST',
    description: '[POST] User request to login with provided credentials',
    requiresAuthentication: false,
  );

  static ApiEndpoint get logout => ApiEndpoint(
    url: '$_baseURL$_apiVersion/user/logout',
    method: 'POST',
    description: '[POST] User request to logout',
    requiresAuthentication: true,
  );

  static ApiEndpoint get getUser => ApiEndpoint(
    url: '$_baseURL$_apiVersion/user',
    method: 'GET',
    description: '[GET] User account data',
    requiresAuthentication: true,
  );

  static ApiEndpoint get getMealPlan => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan',
    method: 'GET',
    description: '[GET] User meal plan for a date range',
    //requiresAuthentication: true,
  );

  static ApiEndpoint get getDayMealPlan => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan/day',
    method: 'GET',
    description: '[GET] User meal plan for a specific date',
    requiresAuthentication: true,
  );

  static ApiEndpoint get deleteMeal => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan/meal',
    method: 'DELETE',
    description: '[DELETE] Meal from plan',
    requiresAuthentication: true,
  );

  static ApiEndpoint get addMeal => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan/meal',
    method: 'PUT',
    description: '[PUT] Add meal to plan',
    requiresAuthentication: true,
  );

  static ApiEndpoint get getMeal => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan/meal',
    method: 'GET',
    description: '[GET] Get plan meal details',
    requiresAuthentication: true,
  );

  static ApiEndpoint get updateMeal => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan/meal/update',
    method: 'POST',
    description: '[POST] Update meal in calendar',
    requiresAuthentication: true,
  );

  static ApiEndpoint get moveMeal => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan/meal/move',
    method: 'POST',
    description: '[POST] Move meal in calendar',
    requiresAuthentication: true,
  );

  static ApiEndpoint get addMealFeedback => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan/meal/feedback',
    method: 'PUT',
    description: '[PUT] Add feedback to meal',
    requiresAuthentication: true,
  );

  static ApiEndpoint get deleteMealFeedback => ApiEndpoint(
    url: '$_baseURL$_apiVersion/plan/meal/feedback',
    method: 'DELETE',
    description: '[DELETE] Delete feedback from meal',
    requiresAuthentication: true,
  );

  static ApiEndpoint get getRecipe => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe',
    method: 'GET',
    description: '[GET] Recipe details',
    requiresAuthentication: true,
  );

  static ApiEndpoint get addRecipe => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe',
    method: 'PUT',
    description: '[PUT] Add a new recipe',
    requiresAuthentication: true,
  );

  static ApiEndpoint get classifyRecipe => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe/classification',
    method: 'PUT',
    description: '[PUT] Recipe classification (discovery - like, dislike, favorite)',
    requiresAuthentication: true,
  );

  static ApiEndpoint get addRecipeToFavorites => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe/classification/update',
    method: 'POST',
    description: '[POST] Recipe classification update',
    requiresAuthentication: true,
  );

  static ApiEndpoint get getClassifiedRecipes => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe/classification',
    method: 'GET',
    description: '[GET] Get classified recipes (provide query parameter to get individually - liked|disliked|favorited or collectively)',
    requiresAuthentication: true,
  );

  static ApiEndpoint get deleteRecipe => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe',
    method: 'DELETE',
    description: '[DELETE] Delete a recipe (only deletes from personal collection not from database)',
    requiresAuthentication: true,
  );

  static ApiEndpoint get getReceipes => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe/search',
    method: 'GET',
    description: '[GET] Search recipes according to filtering criteria',
    requiresAuthentication: true,
  );

  static ApiEndpoint get getSimilarRecipes => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe/similar',
    method: 'GET',
    description: '[GET] Similar recipes to provided recipe',
    requiresAuthentication: true,
  );

  static ApiEndpoint get addRecipeReview => ApiEndpoint(
    url: '$_baseURL$_apiVersion/recipe/review',
    method: 'PUT',
    description: '[PUT] Add review on recipe',
    requiresAuthentication: true,
  );
}

