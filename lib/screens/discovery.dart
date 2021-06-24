import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/models/recipe.dart';
import 'package:fuelify/data/recipes.dart';
import 'package:fuelify/commons/cards.dart';
import 'package:fuelify/providers/feedback_position.dart';
import 'package:fuelify/providers/networking.dart';


class Discovery extends StatefulWidget {
  @override
  _DiscoveryState createState() => _DiscoveryState();
}

class _DiscoveryState extends State<Discovery> {
  final List<Recipe> recipes = dummyRecipes;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("DISCOVERY PAGE"),
        elevation: 0.1,
      ),
      body: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          children: [
            recipes.isEmpty
                ? Text(
                    'One moment while we learn from your selections and rebuild your individual recommendation model...',
                    textAlign: TextAlign.center,
                  )
                : Stack(children: recipes.map(buildRecipe).toList()),
            Expanded(child: Container()),
            //BottomButtonsWidget()
          ],
        ),
      ),
    );
  }

  Widget buildRecipe(Recipe recipe) {
    final recipeIndex = recipes.indexOf(recipe);
    final isRecipeInFocus = recipeIndex == recipes.length - 1;

    return Listener(
      // replace this with a GestureDetector
      onPointerMove: (pointerEvent) {
        final provider =
            Provider.of<FeedbackPositionProvider>(context, listen: false);
        provider.updatePosition(
            pointerEvent.localDelta.dx, pointerEvent.localDelta.dy);
      },
      onPointerCancel: (_) {
        final provider =
            Provider.of<FeedbackPositionProvider>(context, listen: false);
        provider.resetPosition();
      },
      onPointerUp: (_) {
        final provider =
            Provider.of<FeedbackPositionProvider>(context, listen: false);
        provider.resetPosition();
      },
      child: Draggable(
        child:
            RecipeCardWidget(recipe: recipe, isRecipeInFocus: isRecipeInFocus),
        feedback: Material(
          type: MaterialType.transparency,
          child: RecipeCardWidget(
              recipe: recipe, isRecipeInFocus: isRecipeInFocus),
        ),
        childWhenDragging: Container(),
        onDragEnd: (details) => onDragEnd(details, recipe),
      ),
    );
  }

  // onDragEnd Action
  void onDragEnd(DraggableDetails details, Recipe recipe) {
    
    NetworkProvider network = Provider.of<NetworkProvider>(context);

    final minimumDrag = 100;

    print(details.offset.dx.abs());
    print(details.offset.dy.abs());
    if (details.offset.dx.abs() > details.offset.dy.abs()) {
      // Drag in x direction dominates y
      if (details.offset.dx > minimumDrag) {
        print('Recipe Liked');
        recipe.isLiked = true;
        setState(() => recipes.remove(recipe));
      } else if (details.offset.dx < -minimumDrag) {
        print('Recipe Disliked');
        recipe.isDisliked = true;
        setState(() => recipes.remove(recipe));
      } else {
        print('Was not dragged far enough to categorize');
        //setState(() => recipes.remove(recipe));
      }
    } else {
      // Drag in y direction dominates x
      if (details.offset.dy > minimumDrag) {
        print(details.offset.dy);
        print('Was not dragged far enough to categorize');
        //setState(() => recipes.remove(recipe));
      } else if (details.offset.dy < -minimumDrag) {
        print('Recipe Favorited');
        recipe.isFavorited = true;
        setState(() => recipes.remove(recipe));
      } else {
        print('Was not dragged far enough to categorize');
        //setState(() => recipes.remove(recipe));
      }
    }

    // Check if another lot of recipes need to be fetched from API
    if (recipes.length <= 2) {
      print('Send request to API for additional recipes');
      // async load and concat to recipes list
      final Future<Map<String, dynamic>> successfulMessage = network.fetchRecipes();
      successfulMessage.then((response) {
          if (response['status']) {
            print('Fetched recipes successfully!');
            recipes.addAll(response['recipes']);
          } else {
            print('Error occurred while fetching recipes');
          }
        });
    } else {
      print('Error occurred while fetching recipes');
    }
  }
}
