import 'package:flutter/material.dart';
import 'package:fuelify/constants.dart';

import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:fuelify/screens/onboarding/controller.dart';

import 'package:fuelify/widgets/buttons.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class HealthGoalsUpdateScreen extends ConsumerStatefulWidget {
  const HealthGoalsUpdateScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<HealthGoalsUpdateScreen> createState() => _HealthGoalsUpdateScreenState();
}

class _HealthGoalsUpdateScreenState extends ConsumerState<HealthGoalsUpdateScreen> {
  
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

  List selectedOptions = [];
  
  @override
  void initState() {
    UserProfile().getGoalsData().then(initializeGoalsData);
    super.initState();
  }

  void initializeGoalsData(List<dynamic> goals) {
    setState(() {
      List<int> options = [];
      for (String x in goals) {
        options.add(_dataOptions.indexWhere((option) => option['Text'] == x));
      }
      this.selectedOptions = options;
    });
  }


  @override
  Widget build(BuildContext context) {

    return Scaffold(
      body: Padding(
        padding: EdgeInsets.symmetric(horizontal: 10),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "What are your health goals?",
                      style: TextStyle(
                        color: Colors.grey[850],
                        fontWeight: FontWeight.bold,
                        fontSize: 18.0,
                      ),
                    ),
                    SizedBox(height: 5,),
                    Text(
                      "Choose all that apply",
                      style: TextStyle(
                        color: Colors.grey,
                        fontWeight: FontWeight.normal,
                        fontSize: 14.0,
                      ),
                    ),
                  ]
                )
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
              child: FullWidthOverlayButtonWidget(
                text: "Continue",
                onClicked: () {
                  /*List<String> options = [];
                  for (int option in selectedOptions) {
                    options.add(_dataOptions[option]['Text']);
                  }
                  UserProfile().saveGoalsData(options);*/
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
      color: selectedOptions.contains(index) ? colorSelected != null ? colorSelected: Colors.transparent : colorUnselected != null ? colorUnselected : Colors.transparent,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: Colors.black26, width: 1),
          borderRadius: BorderRadius.circular(10.0),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(10.0),
          onTap: () {
            setState(() {
              if (selectedOptions.contains(index)) { // already selected so unselect by removing from list
                selectedOptions.remove(index);
              } else { // not yet selected so add to selected list
                selectedOptions.add(index);
              }
            });
          },
          child: ListTile(
            dense: true,
            title: Text(
              optionText,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: selectedOptions.contains(index) ? colorSelected != null ? Colors.white : Colors.black : colorUnselected != null ? Colors.black : Colors.black,
              ),
            ),
          ),
        )
      );
  }
}