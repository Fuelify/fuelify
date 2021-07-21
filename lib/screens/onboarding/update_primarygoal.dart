import 'package:flutter/material.dart';
import 'package:fuelify/constants.dart';

import 'package:fuelify/commons/buttons.dart';

class PrimaryGoalUpdate extends StatefulWidget {
  @override
  _PrimaryGoalUpdateState createState() => _PrimaryGoalUpdateState();
}

class _PrimaryGoalUpdateState extends State<PrimaryGoalUpdate> {
  
  final List<Map<String, dynamic>> _dataOptions = [
    {
      "Text": "To lose weight",
    },
    {
      "Text": "To eat healthier",
    },
    {
      "Text": "To get more fit",
    },
    {
      "Text": "To maintain weight and support my training",
    },
    {
      "Text": "To build more muscle",
    },
    {
      "Text": "To gain weight",
    },
  ];

  int? selectedOption;

  @override
  Widget build(BuildContext context) {

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Health Goals"),
        elevation: 0.1,
      ),
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: 10),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                child: Text(
                  "What is your primary goal?",
                  style: TextStyle(
                    color: Colors.grey[850],
                    fontWeight: FontWeight.bold,
                    fontSize: 18.0,
                  ),
                ),
              ),
            ),
            Expanded(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _dataOptions.length,
                itemBuilder: (context, index) {
                  return ListSelectionWidget(
                    context, 
                    index, 
                    _dataOptions[index]['Text'],
                    selectedColor,
                    unselectedColor,
                  );
                }
              )
            ),
            Center(
              child: FullWidthButtonWidget(
                text: 'Continue',
                onClicked: () {
                  nextView("/onboarding/weight-goals");
                },
              ),
            ),
          ],
        )
      )
    );
  }

  Widget ListSelectionWidget(
    BuildContext context,
    int index,
    String optionText,
    Color? colorSelected, // not required
    Color? colorUnselected, // not required
  ) {
    return Card(
      color: selectedOption == index ? colorSelected != null ? colorSelected: Colors.transparent : colorUnselected != null ? colorUnselected : Colors.transparent,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: Colors.black26, width: 1),
          borderRadius: BorderRadius.circular(10.0),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(10.0),
          onTap: () {
            setState(() {
              selectedOption = index;
            });
          },
          child: ListTile(
            dense: true,
            title: Text(
              optionText,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: selectedOption == index ? colorSelected != null ? Colors.white : Colors.black : colorUnselected != null ? Colors.black : Colors.black,
              )
            ),
          ),
        )
      );
  }
}