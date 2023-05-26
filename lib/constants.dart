import 'package:flutter/material.dart';

/*
  General App Data
*/

const bool debug = true;
const String debugEnterRoute = 'plan'; // enter route following splash screen; allows for reaching desired screen faster while developing


/*
  Theme Data
*/

const kBackgroundColor = Color(0xFF202020);
const kPrimaryColor = Color(0xFFFFBD73);
const primaryThemeColor = Colors.grey;

/*
  Onboarding Question Options
*/

var selectedColor = Colors.teal.shade300;
const unselectedColor = Colors.white;

var UnitOptions = [
  "Imperial",
  "Metric"
];

int getIndexOfOptionList(String selectedOption) {
  int optionIndex = 0;
  for (String text in UnitOptions) {
    if (text == selectedOption) {
      return optionIndex;
    }
    optionIndex++;
  }
  return optionIndex;
}