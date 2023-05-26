import 'package:flutter/material.dart';

import 'package:fuelify/dependencies/user_preferences.dart';
import 'package:fuelify/screens/onboarding/controller.dart';

import 'package:fuelify/widgets/buttons.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class ActivityLevelUpdateScreen extends ConsumerStatefulWidget {
  const ActivityLevelUpdateScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ActivityLevelUpdateScreen> createState() => _ActivityLevelUpdateScreenState();
}

class _ActivityLevelUpdateScreenState extends ConsumerState<ActivityLevelUpdateScreen> {
  final List<Map<String, dynamic>> _dataOptions = [
    {
      "Title": "Sedentary",
      "Body": "Most of your day is spent sitting (e.g. desk job)",
      "ImageUrl": "assets/onboarding/sedentary-activity.jpeg",
    },
    {
      "Title": "Lightly Active",
      "Body": "Some of your day is spent standing or walking (e.g. teacher)",
      "ImageUrl": "assets/onboarding/lightlyactive-activity.jpeg",
    },
    {
      "Title": "Moderately Active",
      "Body":
          "A good part of your day is spent up and moving (e.g. food server, delivery person)",
      "ImageUrl": "assets/onboarding/moderatelyactive-activity.jpeg",
    },
    {
      "Title": "Very Active",
      "Body":
          "Most of your day is spent doing hard physical activity (e.g. construction worker)",
      "ImageUrl": "assets/onboarding/veryactive-activity.jpeg",
    }
  ];

  int? selectedOption;
  
  @override
  void initState() {
    UserProfile().getActivityData().then(initializeActivityData);
    super.initState();
  }

  void initializeActivityData(String? activity) {
    setState(() {
      this.selectedOption = activity != null ? _dataOptions.indexWhere((option) => option['Title'] == activity) : null;
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
                child: Text(
                  "Choose your daily activity level:",
                  style: TextStyle(
                    color: Colors.grey[850],
                    fontWeight: FontWeight.bold,
                    fontSize: 18.0,
                  ),
                ),
              ),
            ),
            Expanded(
              child: Center(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: _dataOptions.length,
                  itemBuilder: (context, index) {
                    return ActivityCardWidget(
                      context, 
                      index, 
                      _dataOptions[index]['Title'] ?? "Title", 
                      _dataOptions[index]['Body'], 
                      AssetImage(_dataOptions[index]['ImageUrl'] ?? "assets/perosn.jpeg"), 
                      Colors.tealAccent,
                      Colors.white,
                    );
                  }
                )
              ),
            ),
            Center(
              child: FullWidthOverlayButtonWidget(
                text: "Continue",
                onClicked: () {
                  ref.read(onboardingNavigationProgressControllerProvider.notifier).onContinueTapped(ref);
                },
              ),
            ),
          ],
        )
      )
    );
  }

  Widget ActivityCardWidget(
    BuildContext context,
    int index,
    String activityTitle, 
    String? activityBodyText, // not required
    AssetImage? activityImage, // not required
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
            print('Card selected');
            setState(() {
              selectedOption = index;
            });
          },
          child: ListTile(
            dense: true,
            leading: Image(
              image: activityImage ?? AssetImage("assets/perosn.jpeg"),
              fit: BoxFit.contain,
            ),
            title: Text(
              activityTitle,
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: activityBodyText != null ? Text(activityBodyText, style: TextStyle(fontSize: 12)) : null,
            isThreeLine: activityBodyText != null ? true : false,
          ),
        )
      );
  }
}