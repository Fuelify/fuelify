  
import 'package:flutter/material.dart';
import 'package:fuelify/models/meal.dart';

class MealTile extends StatelessWidget {
  final Meal meal;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;

  const MealTile({
    Key? key,
    required this.meal,
    required this.onTap,
    this.onLongPress,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
  
    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress, 
      child: Card(
        shadowColor: Colors.black,
        child: AspectRatio(
          aspectRatio: 16 / 7, // modify this value to fit your needsRow(
          child: Row(
            children: [
              // Image
              ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(10.0),
                  bottomLeft: Radius.circular(10.0),
                ),
                child: Container(
                  height: double.infinity,
                  width: MediaQuery.of(context).size.width * 0.4, // 40% of screen width
                  child: meal.recipe.imageUrl == null || meal.recipe.imageUrl!.isEmpty
                      ? const Icon(Icons.error)
                      : Image.network(meal.recipe.imageUrl!,fit:BoxFit.cover),
                )
              ),
              // Meal Information
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(8.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(meal.recipe.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      Row(
                        children: [
                          Text('Cook: ${meal.recipe.cookTime}'),
                          Text('Prep: ${meal.recipe.prepTime}'),
                        ],
                      ),
                      /*Row(
                        children: [
                          Text('Cooked: ${meal.recipe.timesCooked}'),
                          Text('Likes: ${meal.recipe.likes}'),
                        ],
                      ),*/
                      Row(
                        children: [
                          if(meal.recipe.nutritionalStats.fat != null)
                            Text('F: ${meal.recipe.nutritionalStats.fat}'),
                          Text('P: ${meal.recipe.nutritionalStats.protein}'),
                          Text('C: ${meal.recipe.nutritionalStats.carbohydrates}'),
                        ],
                      ),
                      Row(
                        children: [
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              minimumSize: Size.zero, // Set this
                              padding: EdgeInsets.all(5), // and this
                            ),
                            icon: const Icon(
                              Icons.swap_horizontal_circle_rounded,
                              size: 20
                            ),
                            onPressed: () => {print('Clicked swap recipe')}, 
                            label: const Text('Swap')
                          )
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ]
          )
        )
      )
    );
  }
}