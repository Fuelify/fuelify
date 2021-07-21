import 'package:flutter/material.dart';
import 'package:numberpicker/numberpicker.dart';

import 'package:fuelify/constants.dart';

import 'package:fuelify/commons/buttons.dart';
import 'package:fuelify/commons/widgets.dart';

class WeightGoalsUpdate extends StatefulWidget {
  @override
  _WeightGoalsUpdateState createState() => _WeightGoalsUpdateState();
}

class _WeightGoalsUpdateState extends State<WeightGoalsUpdate> {
  
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

  double _currentWeight = 158.5;
  double _goalWeight = 145;
  int _weeklyWeightOption = 0;// = "Maintain my current weight";

  final TextEditingController _currentWeightController = TextEditingController();
    final TextEditingController _goalWeightController = TextEditingController();
    final TextEditingController _weeklyWeightController = TextEditingController();

  _handleCurrentWeightChange(value) {
    if (value != null) {
      setState(() => _currentWeight = value);
      _currentWeightController.text = value.toString()+' '+'lbs';
    }
  }

  _handleGoalWeightChange(value) {
    if (value != null) {
      setState(() => _goalWeight = value);
      _goalWeightController.text = value.toString()+' '+'lbs';
    }
  }

  _handleWeeklyWeightChange(value) {
    if (value != null) {
      setState(() => _weeklyWeightOption = value);
      _weeklyWeightController.text = value;
    }
  }

  @override
  Widget build(BuildContext context) {
    final formKey = new GlobalKey<FormState>();

    Map<String, dynamic> weightData = {}; // initialize empty personal data map

    var weightCurrentField = TextFormField(
      readOnly: true,
      controller: _currentWeightController,
      decoration: buildInputDecoration("Current Weight", Icons.monitor_weight_rounded),
      onSaved: (value) => {weightData['current'] = value},
      onTap: () async {
        await showDialog<double>(
          context: context,
          builder: (BuildContext context) {
            return WeightSelectionDialog(weight: _currentWeight, title: "Current Weight",);
          },
        ).then(_handleCurrentWeightChange);
      },
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter weight';
        }
        return null;
      },
    );

    var weightGoalField = TextFormField(
      readOnly: true,
      controller: _goalWeightController,
      decoration: buildInputDecoration("Goal Weight", Icons.monitor_weight_rounded),
      onSaved: (value) => {weightData['goal'] = value},
      onTap: () async {
        await showDialog<double>(
          context: context,
          builder: (BuildContext context) {
            return WeightSelectionDialog(weight: _goalWeight, title: "Goal Weight",);
          },
        ).then(_handleGoalWeightChange);
      },
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter weight';
        }
        return null;
      },
    );

    var weightWeeklyField = TextFormField(
      readOnly: true,
      controller: _weeklyWeightController,
      decoration: buildInputDecoration("Weekly Weight Goal", Icons.show_chart_rounded),
      onSaved: (value) => {weightData['goal'] = value},
      onTap: () async {
        await showDialog<int>(
          context: context,
          builder: (BuildContext context) {
            return WeeklyWeightGoalSelectionDialog(selectedOption: _weeklyWeightOption, title: "Weekly Weight Goal",);
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

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Weight Goals"),
        elevation: 0.1,
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 10),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                      child: Text(
                        "What is your current weight?",
                        style: TextStyle(
                          color: Colors.grey[850],
                          fontWeight: FontWeight.bold,
                          fontSize: 18.0,
                        ),
                      ),
                    ),
                  ),
                  weightCurrentField,
                  Container(
                    width: double.infinity,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                      child: Text(
                        "What is your goal weight?",
                        style: TextStyle(
                          color: Colors.grey[850],
                          fontWeight: FontWeight.bold,
                          fontSize: 18.0,
                        ),
                      ),
                    ),
                  ),
                  weightGoalField,
                  Container(
                    width: double.infinity,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                      child: Text(
                        "What is your weekly weight goal?",
                        style: TextStyle(
                          color: Colors.grey[850],
                          fontWeight: FontWeight.bold,
                          fontSize: 18.0,
                        ),
                      ),
                    ),
                  ),
                  weightWeeklyField,
                ],
              ),
            )
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
  
}


class WeightSelectionDialog extends StatefulWidget {
  final double weight;
  final String title;

  WeightSelectionDialog({Key? key, required this.weight, required this.title}) : super(key: key);

  @override
  _WeightSelectionDialogState createState() => new _WeightSelectionDialogState();
}

class _WeightSelectionDialogState extends State<WeightSelectionDialog> {
  late double _currentWeight;
  
  @override
  void initState() {
    super.initState();
    // Initialize current weight value
    _currentWeight = widget.weight;
  }
  
  _handleValueChanged(value) {
    if (value != null) {
      setState(() => _currentWeight = value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: Container(
        height: 200,
        child: Column(
          children: [
            DecimalNumberPicker(
              value: _currentWeight,
              minValue: 0,
              maxValue: 300,
              decimalPlaces: 1,
              onChanged: _handleValueChanged
            ),
            SizedBox(height: 20),
            Text('Weight: $_currentWeight'+' lbs'),
          ]
        )
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.pop(context,_currentWeight),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () {
            Navigator.pop(context,_currentWeight);
          },
          child: const Text('Set'),
        ),
      ],
    );
  }
}


class WeeklyWeightGoalSelectionDialog extends StatefulWidget {
  final int selectedOption;
  final String title;

  WeeklyWeightGoalSelectionDialog({Key? key, required this.selectedOption, required this.title}) : super(key: key);

  @override
  _WeeklyWeightGoalSelectionDialogState createState() => new _WeeklyWeightGoalSelectionDialogState();
}

class _WeeklyWeightGoalSelectionDialogState extends State<WeeklyWeightGoalSelectionDialog> {
  late int _selectedOption;
  
  @override
  void initState() {
    super.initState();
    // Initialize current weight value
    _selectedOption = widget.selectedOption;
  }
  
  _handleValueChanged(value) {
    if (value != null) {
      setState(() => _selectedOption = value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: Container(
        height: 200,
        child: Column(
          children: [
            DecimalNumberPicker(
              value: 158.5,
              minValue: 0,
              maxValue: 300,
              decimalPlaces: 1,
              onChanged: _handleValueChanged
            ),
          ]
        )
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.pop(context,_selectedOption),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () {
            Navigator.pop(context,_selectedOption);
          },
          child: const Text('Set'),
        ),
      ],
    );
  }
}



/*
import 'package:flutter/material.dart';
import 'package:numberpicker/numberpicker.dart';

import 'package:fuelify/constants.dart';

import 'package:fuelify/commons/buttons.dart';
import 'package:fuelify/commons/widgets.dart';

class WeightGoalsUpdate extends StatefulWidget {
  @override
  _WeightGoalsUpdateState createState() => _WeightGoalsUpdateState();
}

class _WeightGoalsUpdateState extends State<WeightGoalsUpdate> {

  double _currentWeight = 158.5;
  double _targetWeight = 145;
  String _weeklyWeight = "Maintain my current weight";
  
  late DecimalNumberPicker CurrentWeightNumberPicker;


  _handleValueChanged(value) {
    if (value != null) {
      setState(() => _currentWeight = value);
    }
  }

  _handleValueChangedExternally(value) {
    if (value != null) {
      setState(() => _currentWeight = value);
      //CurrentWeightNumberPicker.animateDecimalAndInteger(value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final formKey = new GlobalKey<FormState>();

    final TextEditingController _currentWeightController = TextEditingController();
    final TextEditingController _targetWeightController = TextEditingController();
    final TextEditingController _weeklyWeightController = TextEditingController();
    
    Map<String, dynamic> weightData = {}; // initialize empty personal data map

    CurrentWeightNumberPicker = new DecimalNumberPicker(
      value: _currentWeight,
      minValue: 0,
      maxValue: 300,
      decimalPlaces: 1,
      onChanged: _handleValueChanged,
    );

    var weightCurrentField = TextFormField(
      readOnly: true,
      controller: _currentWeightController,
      decoration: buildInputDecoration("Current Weight", Icons.monitor_weight_rounded),
      onSaved: (value) => {weightData['current'] = value},
      onTap: () async {
        await showDialog<double>(
          context: context,
          builder: (BuildContext context) {
            return AlertDialog(
              title: const Text('Current Weight'),
              content: Column(
                children: [
                  CurrentWeightNumberPicker,
                  Text('Current value: $_currentWeight'),
                ]
              ),
              actions: <Widget>[
                TextButton(
                  onPressed: () => Navigator.pop(context, 'Cancel'),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () {
                    print(_currentWeight);
                    Navigator.pop(context, 'Set');
                  },
                  child: const Text('Set'),
                ),
              ],
            );
          },
        ).then((currentWeight) {
          print(currentWeight);
          if (currentWeight != null) {
            _currentWeight = currentWeight;
            _currentWeightController.text = currentWeight.toString();
          }
        });
      },
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter date.';
        }
        return null;
      },
    );

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Weight Goals"),
        elevation: 0.1,
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 10),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                      child: Text(
                        "What is your current weight?",
                        style: TextStyle(
                          color: Colors.grey[850],
                          fontWeight: FontWeight.bold,
                          fontSize: 18.0,
                        ),
                      ),
                    ),
                  ),
                  weightCurrentField,
                  Container(
                    width: double.infinity,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                      child: Text(
                        "What is your goal weight?",
                        style: TextStyle(
                          color: Colors.grey[850],
                          fontWeight: FontWeight.bold,
                          fontSize: 18.0,
                        ),
                      ),
                    ),
                  ),
                  Container(
                    width: double.infinity,
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 20, horizontal: 4),
                      child: Text(
                        "What is your weekly weight goal?",
                        style: TextStyle(
                          color: Colors.grey[850],
                          fontWeight: FontWeight.bold,
                          fontSize: 18.0,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            )
          ),
          FullWidthOverlayButtonWidget(
            text: 'Continue',
            onClicked: () {
              nextView("/onboarding/weight-goals");
            },
          ),
        ]
      )
    );
  }
}
*/