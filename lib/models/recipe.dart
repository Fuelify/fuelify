class NutritionalStats {
  final String fat;
  final String protein;
  final String carbohydrates;

  NutritionalStats({
    required this.fat,
    required this.protein,
    required this.carbohydrates,
  });
}

class Recipe {
  final String title;
  final String? imageUrl;
  final String description;
  final List<String> ingredients;
  final List<String> instructions;
  final String? prepTime;
  final String? cookTime;
  final NutritionalStats nutritionalStats;
  final int? timesCooked;
  final int? likes;

  Recipe({
    required this.title,
    this.imageUrl,
    required this.description,
    required this.ingredients,
    required this.instructions,
    this.prepTime,
    this.cookTime,
    required this.nutritionalStats,
    this.timesCooked,
    this.likes,
  });
}