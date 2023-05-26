class Meal {
  final String id;
  final String title;
  final String description;
  /*final String imageUrl;
  final List<String> ingredients;
  final List<String> steps;
  final DateTime date;*/
  
  Meal({
    required this.id,
    required this.title,
    required this.description,
    //required this.imageUrl,
    //required this.ingredients,
    //required this.steps,
    //required this.date,
  });

  // Factory method to create a Meal from a Map
  factory Meal.fromJSON(Map<String, dynamic> map) {
    return Meal(
      id: map['id'],
      title: map['title'],
      description: map['description'],
      /*imageUrl: map['imageUrl'],
      ingredients: List<String>.from(map['ingredients']),
      steps: List<String>.from(map['steps']),
      date: DateTime.parse(map['date']),*/
    );
  }

  // Method to convert a Meal to a Map
  Map<String, dynamic> toJSON() {
    return {
      'id': id,
      'title': title,
      'description': description,
      /*'imageUrl': imageUrl,
      'ingredients': ingredients,
      'steps': steps,
      'date': date.toIso8601String(),*/
    };
  }
}
