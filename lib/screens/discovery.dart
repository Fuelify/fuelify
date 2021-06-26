import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/models/food.dart';
import 'package:fuelify/data/foods.dart';
import 'package:fuelify/commons/cards.dart';
import 'package:fuelify/providers/feedback_position.dart';
import 'package:fuelify/providers/networking.dart';

class Discovery extends StatefulWidget {
  @override
  _DiscoveryState createState() => _DiscoveryState();
}

class _DiscoveryState extends State<Discovery> {
  final List<Food> foods = dummyFoods;

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
            foods.isEmpty
                ? Text(
                    'One moment while we learn from your selections and rebuild your individual recommendation model...',
                    textAlign: TextAlign.center,
                  )
                : Stack(children: foods.map(buildFood).toList()),
            Expanded(child: Container()),
            //BottomButtonsWidget()
          ],
        ),
      ),
    );
  }

  Widget buildFood(Food food) {
    final foodIndex = foods.indexOf(food);
    final isFoodInFocus = foodIndex == foods.length - 1;

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
        print('dX before reset: ' + provider.dx.toString());
        // Fire on pointer drag end event
        onDragEnd(food);
      },
      child: Draggable(
        child: FoodCardWidget(food: food, isFoodInFocus: isFoodInFocus),
        feedback: Material(
          type: MaterialType.transparency,
          child: FoodCardWidget(food: food, isFoodInFocus: isFoodInFocus),
        ),
        childWhenDragging: Container(),
        //onDragEnd: (details) => onDragEnd(details, food),
      ),
    );
  }

  // onDragEnd Action
  void onDragEnd(Food food) {
    NetworkProvider network =
        Provider.of<NetworkProvider>(context, listen: false);
    final provider =
        Provider.of<FeedbackPositionProvider>(context, listen: false);

    print('------');
    print(provider.swipingDirection);

    final minimumDrag = 100;

    if (provider.dx.abs() > provider.dy.abs()) {
      // Drag in x direction dominates y
      if (provider.dx > minimumDrag) {
        print('Food Liked');
        food.isLiked = true;
        setState(() => foods.remove(food));
      } else if (provider.dx < -minimumDrag) {
        print('Food Disliked');
        food.isDisliked = true;
        setState(() => foods.remove(food));
      } else {
        print('Was not dragged far enough to categorize');
        //setState(() => foods.remove(food));
      }
    } else {
      // Drag in y direction dominates x
      if (provider.dy > minimumDrag) {
        print(provider.dy);
        print('Was not dragged far enough to categorize');
        //setState(() => foods.remove(food));
      } else if (provider.dy < -minimumDrag) {
        print('Food Favorited');
        food.isFavorited = true;
        setState(() => foods.remove(food));
      } else {
        print('Was not dragged far enough to categorize');
        //setState(() => foods.remove(food));
      }
    }

    // Reset provider feedback position to home position (0,0)
    provider.resetPosition();

    // Check if another lot of foods need to be fetched from API
    if (foods.length <= 2) {
      print('Send request to API for additional foods');
      // Async load and concat to foods list
      final Future<Map<String, dynamic>> successfulResponse =
          network.fetchFoods();
      successfulResponse.then((response) {
        print(response);
        /*if (response['status']) {
          print('Fetched foods successfully!');
          foods.addAll(response['foods']);
        } else {
          print('Error occurred while fetching foods');
        }*/
      });
    } else {
      print('Sufficient foods remain in the list');
    }
  }
}
