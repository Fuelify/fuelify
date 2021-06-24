import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/models/recipe.dart';
import 'package:fuelify/data/recipes.dart';
import 'package:fuelify/commons/cards.dart';
import 'package:fuelify/providers/feedback_position.dart';

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
      onPointerMove: (pointerEvent) {
        final provider =
            Provider.of<FeedbackPositionProvider>(context, listen: false);
        provider.updatePosition(pointerEvent.localDelta.dx, pointerEvent.localDelta.dy);
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
        child: RecipeCardWidget(recipe: recipe, isRecipeInFocus: isRecipeInFocus),
        feedback: Material(
          type: MaterialType.transparency,
          child:
              RecipeCardWidget(recipe: recipe, isRecipeInFocus: isRecipeInFocus),
        ),
        childWhenDragging: Container(),
        onDragEnd: (details) => onDragEnd(details, recipe),
      ),
    );
  }

  void onDragEnd(DraggableDetails details, Recipe recipe) {
    final minimumDrag = 100;
    if (details.offset.dx > minimumDrag) {
      print('Minimum drag: ' + minimumDrag.toString());
      print('dX: ' + details.offset.dx.toString());
      recipe.isLiked = true;
      setState(() => recipes.remove(recipe));
    } else if (details.offset.dx < -minimumDrag) {
      print('Minimum drag: -' + minimumDrag.toString());
      print('dX: ' + details.offset.dx.toString());
      recipe.isDisliked = true;
      setState(() => recipes.remove(recipe));
    } else {
      print('Was not dragged far enough to categorize and thus move to next');
      print('Minimum drag: -' + minimumDrag.toString());
      print('dX: ' + details.offset.dx.toString());
      //setState(() => recipes.remove(recipe));
    }
  }
}
