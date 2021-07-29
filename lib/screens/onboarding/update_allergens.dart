import 'package:flutter/material.dart';

import 'package:fuelify/dependencies/user_preferences.dart';

import 'package:fuelify/commons/buttons.dart';

final List<Map<String, dynamic>> _dataOptions = [
  {
    "Text": "Dairy (Lactose)",
  },
  {
    "Text": "Gluten",
  },
  {
    "Text": "Peanuts",
  },
  {
    "Text": "Tree Nuts",
  },
  {
    "Text": "Soy",
  },
  {
    "Text": "Seasame",
  },
  {
    "Text": "Eggs",
  },
  {
    "Text": "Crustaceans",
  },
  {
    "Text": "Fish",
  },
  {
    "Text": "Other",
  },
];

class AllergensUpdate extends StatefulWidget {
  @override
  _AllergensUpdateState createState() => _AllergensUpdateState();
}

class _AllergensUpdateState extends State<AllergensUpdate> {

  List<int> _selectedOptions = [];
  
  @override
  void initState() {
    UserProfile().getAllergensData().then(initializeAllergensData);
    super.initState();
  }

  void initializeAllergensData(List data) {
    setState(() {
      List<int> optionsSelected = [];
      for (var opt in data) {
        optionsSelected.add(_dataOptions.indexWhere((option) => option['Text'] == opt));
      }
      this._selectedOptions = optionsSelected;
    });
  }

  // Replace this and the need to pass the selected options state as well as onchanged function with ChangeNotifier setup
  void _handleChange(List<int> newSelection) {
    setState(() {
      _selectedOptions = newSelection;
    });
  }

  @override
  Widget build(BuildContext context) {
    
    var recordData = () {
      List<String> allergenData = [];
      for (var index in _selectedOptions) {
        allergenData.add(_dataOptions[index]['Text']);
      }
      print(allergenData);
      UserProfile().saveAllergensData(allergenData);
    };

    /*
    TextFormField(
      readOnly: true,
      controller: _weeklyWeightController,
      decoration: buildInputDecoration("Weekly Weight Goal", Icons.show_chart_rounded),
      onSaved: (value) {
        weightGoalsData['weekly'] = _dataOptions[_weeklyWeightOption]['Text'];
      },
      onTap: () async {
        await showDialog<int>(
          context: context,
          builder: (BuildContext context) {
            return WeeklyWeightGoalSelectionDialog(
              value: _weeklyWeightOption, 
              title: "Weekly Weight Goal",
              dataOptions: _dataOptions,
            );
          },
        ).then(_handleWeeklyWeightChange);
      },
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please select weekly weight goal';
        }
        return null;
      },
    );
    */

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Food Allergens"),
        elevation: 0.1,
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                    child: Text(
                      "Please specify your allergens",
                      style: TextStyle(
                        color: Colors.grey[850],
                        fontWeight: FontWeight.bold,
                        fontSize: 18.0,
                      ),
                    ),
                  ),
                ),
                AllergenSelections(selectedOptions: _selectedOptions, dataOptions: _dataOptions, onChanged: _handleChange),
              ],
            ),
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
  
}


class AllergenSelections extends StatelessWidget {
  final List<int> selectedOptions;
  final List<Map<String, dynamic>> dataOptions;
  final ValueChanged<List<int>> onChanged;

  AllergenSelections({Key? key, required this.selectedOptions, required this.dataOptions, required this.onChanged}) : super(key: key);
  
  List<Widget> createCheckBoxList1(options,n) {
    print(options);
    List<Widget> widgets = [];
    for (int i = 0; i < n; i++) {
      widgets.add(
        CheckboxListTile(
          title: Text(
            options[i]['Text'],
            style: TextStyle(
              color: Colors.black,
            ),
          ),
          value: selectedOptions.contains(i),
          onChanged: (bool? value) {
            if (value != null) {
              if (selectedOptions.contains(i)) { // uncheck by removing from list
                selectedOptions.remove(i);
              } else { // check by adding to list
                selectedOptions.add(i);
              }
            }
            onChanged(selectedOptions);
          },
          activeColor: Colors.black,
          checkColor: Colors.black,
          contentPadding: EdgeInsets.only(left:10),
          controlAffinity: ListTileControlAffinity.leading,
        ),
      );
    }
    return widgets;
  }

  List<Widget> createCheckBoxList2(options,n) {
    print(options);
    List<Widget> widgets = [];
    for (int i = n; i < options.length; i++) {
      widgets.add(
        CheckboxListTile(
          title: Text(
            options[i]['Text'],
            style: TextStyle(
              color: Colors.black,
            ),
          ),
          value: selectedOptions.contains(i),
          onChanged: (bool? value) {
            if (value != null) {
              if (selectedOptions.contains(i)) { // uncheck by removing from list
                selectedOptions.remove(i);
              } else { // check by adding to list
                selectedOptions.add(i);
              }
            }
            onChanged(selectedOptions);
          },
          activeColor: Colors.black,
          checkColor: Colors.black,
          contentPadding: EdgeInsets.only(right:10),
          controlAffinity: ListTileControlAffinity.leading,
        ),
      );
    }
    return widgets;
  }
  
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              children: createCheckBoxList1(dataOptions,5),
            ),
          ),
          Expanded(
            child: Column(
              children: createCheckBoxList2(dataOptions,5),
            ),
          ),
        ],
      ),
    );
  }
}

/*
class AllergenSelections extends StatefulWidget {

  AllergenSelections({Key? key, required this.selectedOptions, required this.dataOptions, required this.onChanged}) : super(key: key);

  @override
  _AllergenSelectionsState createState() => new _AllergenSelectionsState();
}

class _AllergenSelectionsState extends State<AllergenSelections> {
  late List _selectedOptions;
  
  @override
  void initState() {
    super.initState();
    // Initialize list of selected options
    _selectedOptions = widget.selectedOptions;
  }
  
  List<Widget> createCheckBoxList1(options,n) {
    print(options);
    List<Widget> widgets = [];
    for (int i = 0; i < n; i++) {
      widgets.add(
        CheckboxListTile(
          title: Text(
            options[i]['Text'],
            style: TextStyle(
              color: Colors.black,
            ),
          ),
          value: _selectedOptions.contains(i),
          onChanged: (bool? value) {
            widget.onChanged();
            if (value != null) {
              setState(() {
                print(value);
                if (_selectedOptions.contains(i)) { // uncheck by removing from list
                  _selectedOptions.remove(i);
                } else { // check by adding to list
                  _selectedOptions.add(i);
                }
              });
            }
          },
          activeColor: Colors.black,
          checkColor: Colors.black,
          controlAffinity: ListTileControlAffinity.leading,
        ),
      );
    }
    return widgets;
  }

  List<Widget> createCheckBoxList2(options,n) {
    print(options);
    List<Widget> widgets = [];
    for (int i = n; i < options.length; i++) {
      widgets.add(
        CheckboxListTile(
          title: Text(
            options[i]['Text'],
            style: TextStyle(
              color: Colors.black,
            ),
          ),
          value: _selectedOptions.contains(i),
          onChanged: (bool? value) {
            if (value != null) {
              setState(() {
                print(value);
                if (_selectedOptions.contains(i)) { // uncheck by removing from list
                  _selectedOptions.remove(i);
                } else { // check by adding to list
                  _selectedOptions.add(i);
                }
              });
            }
          },
          activeColor: Colors.black,
          checkColor: Colors.black,
          controlAffinity: ListTileControlAffinity.leading,
        ),
      );
    }
    return widgets;
  }
  
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              children: createCheckBoxList1(widget.dataOptions,5),
            ),
          ),
          Expanded(
            child: Column(
              children: createCheckBoxList2(widget.dataOptions,5),
            ),
          ),
        ],
      ),
    );
  }
}
*/