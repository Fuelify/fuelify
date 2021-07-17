import 'package:flutter/material.dart';
//import 'package:fuelify/commons/cards.dart';

import 'package:fuelify/commons/buttons.dart';

class ActivityLevelUpdate extends StatefulWidget {
  @override
  _ActivityLevelUpdateState createState() => _ActivityLevelUpdateState();
}

class _ActivityLevelUpdateState extends State<ActivityLevelUpdate> {
  
  final List<Map<String, dynamic>> _dataOptions = [
    {
      "Title": "Sedentary",
      "Body": "Most of your day is spent sitting (e.g. desk job)",
      "ImageUrl": "assets/garmin_watch.jpeg",
      "isSelected": false,
    },
    {
      "Title": "Lightly Active",
      "Body": "Some of your day is spent standing or walking (e.g. teacher)",
      "ImageUrl": "assets/fitbit_watch.png",
      "isSelected": false,
    },
    {
      "Title": "Moderately Active",
      "Body":
          "A good part of your day is spent up and moving (e.g. food server, delivery person)",
      "ImageUrl": "assets/apple_watch.png",
      "isSelected": false,
    },
    {
      "Title": "Very Active",
      "Body":
          "Most of your day is spent doing hard physical activity (e.g. construction worker)",
      "ImageUrl": "assets/apple_watch.png",
      "isSelected": false,
    }
  ];

  int? selectedOption;

  @override
  Widget build(BuildContext context) {

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Activity Level"),
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
              child: FullWidthButtonWidget(
                text: 'Continue',
                onClicked: () {
                  nextView("/onboarding/device-connections");
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