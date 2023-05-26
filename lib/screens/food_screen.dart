import 'package:flutter/material.dart';
import 'package:fuelify/widgets/navigationbars.dart';

class FoodScreen extends MaterialPage {
  FoodScreen() : super(child: _FoodScreen());
}

class _FoodScreen extends StatefulWidget {
  @override
  _FoodScreenState createState() => _FoodScreenState();
}

class _FoodScreenState extends State<_FoodScreen> {
  @override
  Widget build(BuildContext context) {

    return Scaffold(
        appBar: AppBar(
          title: Text("Food"),
          elevation: 0.1,
        ),
        body: Column(
          children: [
            SizedBox(
              height: 50,
            ),
          ],
        ),
        bottomNavigationBar: BottomNavigationBarWidget());
  }
}
