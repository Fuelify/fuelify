import 'package:flutter/material.dart';
import 'package:fuelify/commons/navigationbars.dart';

class FoodPage extends StatefulWidget {
  @override
  _FoodPageState createState() => _FoodPageState();
}

class _FoodPageState extends State<FoodPage> {
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
