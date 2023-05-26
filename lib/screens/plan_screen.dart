import 'package:flutter/material.dart';
import 'package:fuelify/widgets/navigationbars.dart';

class PlanScreen extends MaterialPage {
  PlanScreen() : super(child: _PlanScreen());
}

class _PlanScreen extends StatefulWidget {
  @override
  _PlanScreenState createState() => _PlanScreenState();
}

class _PlanScreenState extends State<_PlanScreen> {
  @override
  Widget build(BuildContext context) {

    return Scaffold(
        appBar: AppBar(
          title: Text("Plan"),
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
