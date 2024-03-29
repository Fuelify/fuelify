import 'package:flutter/material.dart';
import 'package:fuelify/constants.dart';

import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:fuelify/screens/onboarding/controller.dart';

import 'package:fuelify/widgets/buttons.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class PrimaryGoalUpdateScreen extends ConsumerStatefulWidget {
  const PrimaryGoalUpdateScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<PrimaryGoalUpdateScreen> createState() => _PrimaryGoalUpdateScreenState();
}

class _PrimaryGoalUpdateScreenState extends ConsumerState<PrimaryGoalUpdateScreen> {
  
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
  void initState() {
    UserProfile().getPrimaryGoalData().then(initializePrimaryGoalData);
    super.initState();
  }

  void initializePrimaryGoalData(String? goal) {
    setState(() {
      this.selectedOption = goal != null ? _dataOptions.indexWhere((option) => option['Text'] == goal) : null;
    });
  }


  @override
  Widget build(BuildContext context) {

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
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
                  if (selectedOption != null) {
                    UserProfile().savePrimaryGoalData(_dataOptions[selectedOption as int]['Text']);
                  }
                  ref.read(onboardingNavigationProgressControllerProvider.notifier).onContinueTapped(ref);
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