import 'package:flutter/material.dart';
import 'package:numberpicker/numberpicker.dart';

import 'package:fuelify/dependencies/user_preferences.dart';

import 'package:fuelify/commons/buttons.dart';
import 'package:fuelify/commons/widgets.dart';

class WeightGoalsUpdate extends StatefulWidget {
  @override
  _WeightGoalsUpdateState createState() => _WeightGoalsUpdateState();
}

class _WeightGoalsUpdateState extends State<WeightGoalsUpdate> {

  Map<String, dynamic> weightGoalsData = {}; // initialize empty personal data map

  double _currentWeight = 158.5;
  double _goalWeight = 145;
  int _weeklyWeightOption = 0;//_dataOptions.ind"Maintain my current weight";

  TextEditingController _currentWeightController = TextEditingController();
  TextEditingController _goalWeightController = TextEditingController();
  TextEditingController _weeklyWeightController = TextEditingController();
  
  @override
  void initState() {
    UserProfile().getWeightGoalsData().then(initializeWeightGoalData);
    super.initState();
  }

  void initializeWeightGoalData(Map data) {
    setState(() {
      this.weightGoalsData = data as Map<String, dynamic>;
      this._currentWeight = weightGoalsData['current'] != null ? weightGoalsData['current'] : 158.5;
      this._goalWeight = weightGoalsData['goal'] != null ? weightGoalsData['goal'] : 145;
      this._weeklyWeightOption = data['weekly'] != null ? weightGoalsData['weekly'] : 0;//_dataOptions.ind"Maintain my current weight";
      this._currentWeightController = TextEditingController(text: weightGoalsData['current'] != null ? weightGoalsData['current'].toString()+' lbs': null);
      this._goalWeightController = TextEditingController(text: weightGoalsData['goal'] != null ? weightGoalsData['goal'].toString()+' lbs': null);
      this._weeklyWeightController = TextEditingController(text: weightGoalsData['weekly'] != null ? weightGoalsData['weekly'].toString(): null);
    });
  }      
  

  @override
  Widget build(BuildContext context) {
    final formKey = new GlobalKey<FormState>();
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

    var recordData = () {
      final form = formKey.currentState;

      if (form!.validate()) {
        form.save();
        UserProfile().saveWeightGoalsData(weightGoalsData);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text("Invalid Form: " + "Please Complete the form properly")));
      }
    };

    var weightCurrentField = TextFormField(
      readOnly: true,
      controller: _currentWeightController,
      decoration: buildInputDecoration("Current Weight", Icons.monitor_weight_rounded),
      onSaved: (value) => {weightGoalsData['current'] = _currentWeight},
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
      onSaved: (value) => {weightGoalsData['goal'] = _goalWeight},
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
      onSaved: (value) => {weightGoalsData['weekly'] = _weeklyWeightOption},
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
              recordData();
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
          onPressed: () => Navigator.pop(context,null),
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
          onPressed: () => Navigator.pop(context,null),
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