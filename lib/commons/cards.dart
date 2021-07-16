import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/models/food.dart';
import 'package:fuelify/providers/feedback_position.dart';
import 'package:fuelify/models/user.dart';

class FoodCardWidget extends StatelessWidget {
  final Food food;
  final bool isFoodInFocus;

  const FoodCardWidget({
    required this.food,
    required this.isFoodInFocus,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<FeedbackPositionProvider>(context);
    final swipingDirection = provider.swipingDirection;
    final size = MediaQuery.of(context).size;

    return GestureDetector(
      onTap: () {
        print('Food Card Tapped');
      },
      child: Container(
        height: size.height * 0.79,
        width: size.width * 0.95,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          image: DecorationImage(
            image: AssetImage(food.imgUrl),
            fit: BoxFit.cover,
          ),
        ),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            boxShadow: [
              BoxShadow(color: Colors.black12, spreadRadius: 0.5),
            ],
            gradient: LinearGradient(
              colors: [Colors.black12, Colors.black87],
              begin: Alignment.center,
              stops: [0.4, 1],
              end: Alignment.bottomCenter,
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                right: 10,
                left: 10,
                bottom: 10,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    buildFoodInfo(food: food),
                    Padding(
                      padding: EdgeInsets.only(bottom: 16, right: 8),
                      child: Icon(Icons.info, color: Colors.white),
                    )
                  ],
                ),
              ),
              //if (isUserInFocus) buildLikeBadge(swipingDirection)
            ],
          ),
        ),
      ),
    );
  }

  Widget buildFoodInfo({required Food food}) => Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${food.name}, ${food.name}',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            SizedBox(height: 8),
            Text(
              food.designation,
              style: TextStyle(color: Colors.white),
            ),
            SizedBox(height: 4),
            Text(
              '${food.userFavorites} Favorites',
              style: TextStyle(color: Colors.white),
            )
          ],
        ),
      );
}

class DeviceCardWidget extends StatelessWidget {
  final deviceLogo;
  final deviceImage;

  const DeviceCardWidget({
    Key? key,
    this.deviceLogo,
    this.deviceImage,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        print(
            'Device card tapped, pushNamed navigate to device connection view');
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(color: Colors.black38, spreadRadius: 0.5, blurRadius: 2.5),
          ],
          color: Colors.white,
        ),
        child: Column(
          children: [
            Flexible(
              flex: 7,
              child: Container(
                padding: EdgeInsets.only(left: 10, right: 10, top: 18, bottom: 10),
                child: Image(
                  image: deviceImage ?? AssetImage("assets/perosn.jpeg"),
                  fit: BoxFit.contain,
                )
              )
            ),
            Flexible(
              flex: 2,
              child: Container(
                padding: EdgeInsets.only(left: 10, right: 10, top: 0, bottom: 10),
                child: Image(
                  image: deviceLogo,
                  fit: BoxFit.contain
                ),
              )
            )
            /*Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(color: Colors.black12, spreadRadius: 0.5),
                ],
                gradient: LinearGradient(
                  colors: [Colors.transparent, Colors.black87],
                  begin: Alignment.center,
                  stops: [0.5, 1],
                  end: Alignment.bottomCenter,
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: 10,
                    left: 10,
                    bottom: 5,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          width: 75,
                          padding: EdgeInsets.only(bottom: 5, right: 8),
                          child: Image(
                            image: deviceLogo,
                            fit: BoxFit.contain
                          ),
                        )
                      ],
                    ),
                  ),
                ],
              ),
            ),*/
          ]
        )
      ),
    );
  }
}
