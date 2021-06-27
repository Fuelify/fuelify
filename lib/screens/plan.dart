import 'package:flutter/material.dart';
import 'package:fuelify/commons/navigationbars.dart';

class PlanPage extends StatefulWidget {
  @override
  _PlanPageState createState() => _PlanPageState();
}

class _PlanPageState extends State<PlanPage> {
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
