import 'package:fuelify/models/recipe.dart';

class Meal {
  final String id;
  final DateTime date;
  final Recipe recipe;
  
  Meal({
    required this.id,
    required this.date,
    required this.recipe,
  });

  // Factory method to create a Meal from a Map
  factory Meal.fromJSON(Map<String, dynamic> map) {
    return Meal(
      id: map['id'],
      date: DateTime.parse(map['date']),
      recipe: Recipe(
        title: map['recipe'] != null ? map['recipe']['title'] : 'Recipe ${map['id']}', 
        imageUrl: map['recipe'] != null ? map['recipe']['imageUrl'] : 'https://img.freepik.com/free-photo/chicken-wings-barbecue-sweetly-sour-sauce-picnic-summer-menu-tasty-food-top-view-flat-lay_2829-6471.jpg?w=1480&t=st=1685316887~exp=1685317487~hmac=c0ba33339237cf2ec3012137693a7aa1f2b3b217c235530355ff7b979dacddc8',
        description: map['recipe'] != null ? map['recipe']['title'] : 'Description of recipe',
        ingredients: map['recipe'] != null ? map['recipe']['title'] : [],
        instructions: map['recipe'] != null ? map['recipe']['title'] : [],
        prepTime: map['recipe'] != null ? map['recipe']['prepTime'] : null,
        cookTime: map['recipe'] != null ? map['recipe']['cookTime'] : null,
        nutritionalStats: NutritionalStats(
          fat: map['recipe'] != null ? map['recipe']['nutritionalStats']['fat'] : 'N/A', 
          protein: map['recipe'] != null ? map['recipe']['nutritionalStats']['protein'] : 'N/A',
          carbohydrates: map['recipe'] != null ? map['recipe']['nutritionalStats']['carbohydrates'] : 'N/A', 
        )
      )
    );
  }

  // Method to convert a Meal to a Map
  Map<String, dynamic> toJSON() {
    return {
      'id': id,
    };
  }
}