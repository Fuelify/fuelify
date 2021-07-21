import 'package:flutter/material.dart';
import 'package:fuelify/constants.dart';

import 'package:fuelify/commons/buttons.dart';

class ShoppingPreferencesUpdate extends StatefulWidget {
  @override
  _ShoppingPreferencesUpdateState createState() => _ShoppingPreferencesUpdateState();
}

class _ShoppingPreferencesUpdateState extends State<ShoppingPreferencesUpdate> {
  
  final List<Map<String, dynamic>> _dataOptions1 = [
    {
      "Text": "Yes, not only do I hunt for bargains, I go to multiple stores to get the best deals",
    },
    {
      "Text": "Yes, I hunt for the bargains",
    },
    {
      "Text": "No, I buy nothing but brand name products and at which ever store is most convenient",
    },
  ];

  final List<Map<String, dynamic>> _dataOptions2 = [
    {
      "Text": "Yes",
    },
    {
      "Text": "Sometimes",
    },
    {
      "Text": "No",
    },
  ];

  int? selectedOption1;
  int? selectedOption2;
  double _currentSliderValue = 50;

  @override
  Widget build(BuildContext context) {

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Shopping Preferences"),
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
                            "Are you a price sensitive shopper?",
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
                          padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Do food prices impact your typical diet / meal planning for the week?",
                                style: TextStyle(
                                  color: Colors.grey[850],
                                  fontWeight: FontWeight.bold,
                                  fontSize: 18.0,
                                ),
                              ),
                              SizedBox(height: 5,),
                              Text(
                                "Includes: sales, discounts, bulk deals, season",
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
                      SizedBox(height: 20,),
                      Container(
                        width: double.infinity,
                        child: Padding(
                          padding: EdgeInsets.only(top: 20.0, bottom: 20.0, left: 4, right: 4),
                          child: Text(
                            "What is your weekly grocery budget?",
                            style: TextStyle(
                              color: Colors.grey[850],
                              fontWeight: FontWeight.bold,
                              fontSize: 18.0,
                            ),
                          ),
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.symmetric(vertical: 25.0),
                        child: Slider(
                          value: _currentSliderValue,
                          min: 0,
                          max: 100,
                          divisions: 20,
                          label: "\$ "+_currentSliderValue.round().toString()+"/week",
                          onChanged: (double value) {
                            setState(() {
                              _currentSliderValue = value;
                            });
                          },
                          activeColor: Colors.teal,
                          inactiveColor: Colors.teal[100],
                        ),
                      ),
                      Text(
                        "Budget: \$ "+_currentSliderValue.round().toString()+"/week",
                        textAlign: TextAlign.center,
                        style: TextStyle(),
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
              nextView("/onboarding/shopping-preferences");
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