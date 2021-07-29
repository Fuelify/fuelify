import 'package:flutter/material.dart';
import 'package:fuelify/constants.dart';

import 'package:fuelify/dependencies/user_preferences.dart';

import 'package:fuelify/commons/buttons.dart';

class EatingHabitsUpdate extends StatefulWidget {
  @override
  _EatingHabitsUpdateState createState() => _EatingHabitsUpdateState();
}

class _EatingHabitsUpdateState extends State<EatingHabitsUpdate> {
  
  final List<Map<String, dynamic>> _dataOptions1 = [
    {
      "Text": "Yes, I always check how many calories a food product has before buying or eating",
    },
    {
      "Text": "No, I eat whatever I desire regardless of the calories",
    },
  ];

  final List<Map<String, dynamic>> _dataOptions2 = [
    {
      "Text": "Yes",
    },
    {
      "Text": "No",
    },
  ];

  int? selectedOption1;
  int? selectedOption2;
  
  @override
  void initState() {
    UserProfile().getEatingData().then(initializeEatingData);
    super.initState();
  }

  void initializeEatingData(Map data) {
    setState(() {
      this.selectedOption1 = data['calorieSensitive'] != null ? _dataOptions1.indexWhere((option) => option['Text'] == data['calorieSensitive']) : null;
      this.selectedOption2 = data['choosyEater'] != null ? _dataOptions2.indexWhere((option) => option['Text'] == data['choosyEater']) : null;
    });
  }

  @override
  Widget build(BuildContext context) {

    var recordData = () {
      Map<String, dynamic> EatingData = {};
      if (selectedOption1 != null ) {
        EatingData['calorieSensitive'] =  _dataOptions1[selectedOption1 as int]['Text'];
      }
      if (selectedOption2 != null ) {
        EatingData['choosyEater'] =  _dataOptions2[selectedOption2 as int]['Text'];
      }
      UserProfile().saveEatingData(EatingData);
    };

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Eating Habits"),
        elevation: 0.1,
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Column(
            children: [
              Expanded(
                child: Container(
                  padding: EdgeInsets.only(left: 20.0, right: 20.0, top: 20.0, bottom: 60.0),
                  child: ListView(
                    children: [
                      Container(
                        width: double.infinity,
                        child: Padding(
                          padding: EdgeInsets.only(top: 20.0, bottom: 10.0, left: 4, right: 4),
                          child: Text(
                            "Would you consider yourself a calorie sensitive person?",
                            style: TextStyle(
                              color: Colors.grey[850],
                              fontWeight: FontWeight.bold,
                              fontSize: 18.0,
                            ),
                          ),
                        ),
                      ),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: _dataOptions1.length,
                        itemBuilder: (context, index) {
                          return ListSelection1Widget(
                            context, 
                            index, 
                            _dataOptions1[index]['Text'],
                            selectedColor,
                            unselectedColor,
                          );
                        }
                      ),
                      SizedBox(height: 20,),
                      Container(
                        width: double.infinity,
                        child: Padding(
                          padding: EdgeInsets.only(top: 20.0, bottom: 10.0, left: 4, right: 4),
                          child: Text(
                            "Would you consider yourself a choosy eater?",
                            style: TextStyle(
                              color: Colors.grey[850],
                              fontWeight: FontWeight.bold,
                              fontSize: 18.0,
                            ),
                          ),
                        ),
                      ),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: NeverScrollableScrollPhysics(),
                        itemCount: _dataOptions1.length,
                        itemBuilder: (context, index) {
                          return ListSelection2Widget(
                            context, 
                            index, 
                            _dataOptions2[index]['Text'],
                            selectedColor,
                            unselectedColor,
                          );
                        }
                      ),
                      
                      SizedBox(height: 30,),

                      SizedBox(height: 50,) // add sized box to get the view to scroll up past bottom button overlay gradient
                    ],
                  ),
                ),
              ),
            ],
          ),
          FullWidthOverlayButtonWidget(
            text: 'Continue',
            onClicked: () {
              recordData();
              //nextView("/onboarding/shopping-preferences");
            },
          ),
        ]
      )
    );
  }

  Widget ListSelection1Widget(
    BuildContext context,
    int index,
    String optionText,
    Color? colorSelected, // not required
    Color? colorUnselected, // not required
  ) {
    return Card(
      color: selectedOption1 == index ? colorSelected != null ? colorSelected: Colors.transparent : colorUnselected != null ? colorUnselected : Colors.transparent,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Colors.black26, width: 1),
        borderRadius: BorderRadius.circular(10.0),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(10.0),
        onTap: () {
          setState(() {
            selectedOption1 = index;
          });
        },
        child: ListTile(
          dense: true,
          title: Text(
            optionText,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: selectedOption1 == index ? colorSelected != null ? Colors.white : Colors.black : colorUnselected != null ? Colors.black : Colors.black,
            )
          ),
        ),
      )
    );
  }

  Widget ListSelection2Widget(
    BuildContext context,
    int index,
    String optionText,
    Color? colorSelected, // not required
    Color? colorUnselected, // not required
  ) {
    return Card(
      color: selectedOption2 == index ? colorSelected != null ? colorSelected: Colors.transparent : colorUnselected != null ? colorUnselected : Colors.transparent,
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Colors.black26, width: 1),
        borderRadius: BorderRadius.circular(10.0),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(10.0),
        onTap: () {
          setState(() {
            selectedOption2 = index;
          });
        },
        child: ListTile(
          dense: true,
          title: Text(
            optionText,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: selectedOption2 == index ? colorSelected != null ? Colors.white : Colors.black : colorUnselected != null ? Colors.black : Colors.black,
            )
          ),
        ),
      )
    );
  }

}