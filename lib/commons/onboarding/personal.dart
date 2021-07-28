import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:numberpicker/numberpicker.dart';

import 'package:fuelify/commons/widgets.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/commons/customdropdowns.dart';

final genderOptions = [
  DropDownOption(option: 'Male', icon: Icons.male),
  DropDownOption(option: 'Female', icon: Icons.female),
  DropDownOption(option: 'Prefer not to say', icon: Icons.not_interested),
  DropDownOption(option: 'Prefer to self describe', icon: Icons.arrow_forward),
];
  
final List<Map<String, dynamic>> _dataOptions = [
  {
    "Title": "Metric",
    "Body": "g, kg, kJ, km, mps, C"
  },
  {
    "Title": "Imperial",
    "Body": "lbs, cals, ft, miles, fps, F"
  },
];

class PersonalInfoWidget extends StatelessWidget {
  final User user;
  final formKey;
  final personalData;

  const PersonalInfoWidget({
    Key? key,
    required this.user,
    required this.formKey,
    required this.personalData,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {

    final TextEditingController _heightController = TextEditingController();
    final TextEditingController _dateController = TextEditingController();
    final TextEditingController _unitsController = TextEditingController();

    double _height = personalData['height'] != null ? personalData['height'] : 5.5;
    DateTime _selectedDate = personalData['birthdate'] != null ? DateTime.utc(personalData['birthdate'].split("-")[0], personalData['birthdate'].split("-")[1], personalData['birthdate'].split("-")[2]) : DateTime.utc(1990, 1, 1);
    int _selectedUnitsOption = 0;
      
    _handleHeightChange(value) {
      if (value != null) {
        //setState(() => _height = value);
        _heightController.text = value.toString()+' '+'feet';
      }
    }

    _handleUnitSelectionChange(value) {
      if (value != null) {
        //setState(() => _selectedUnitsOption = value);
        _unitsController.text = _dataOptions[value]['Title'];
      }
    }

    var heightField = TextFormField(
      readOnly: true,
      controller: _heightController,
      decoration: buildInputDecoration("Current Weight", Icons.height_rounded),
      onSaved: (value) => {personalData['height'] = _height},
      onTap: () async {
        await showDialog<double>(
          context: context,
          builder: (BuildContext context) {
            return HeightSelectionDialog(value: _height, title: "Height",attribute: 'Height',);
          },
        ).then(_handleHeightChange);
      },
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter weight';
        }
        return null;
      },
    );

    final birthdayField = TextFormField(
      readOnly: true,
      controller: _dateController,
      decoration: buildInputDecoration("Location", Icons.calendar_today),
      onSaved: (value) => {personalData['birthdate'] = value},
      onTap: () async {
        await showDatePicker(
          context: context,
          initialDate: _selectedDate,
          firstDate: DateTime.utc(1900, 1, 1),
          lastDate: DateTime.now(),
          initialDatePickerMode: DatePickerMode.year,
          helpText: 'Select Date of Birth', // Title
          errorFormatText: 'Enter valid date',
          fieldLabelText: 'Enter date',
          fieldHintText: 'Month/Date/Year',
        ).then((selectedDate) {
          if (selectedDate != null) {
            _selectedDate = selectedDate;
            _dateController.text =
                DateFormat('yyyy-MM-dd').format(selectedDate);
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

    final genderField = CustomDropdown<int>(
      child: Text(
        "",
      ),
      onChange: (int value, int index) => {
        print(genderOptions[index].option),
        personalData['gender'] = genderOptions[index].option,
      },
      onSaved: (int value, int index) => {
        personalData['gender'] = genderOptions[index].option,
      },
      dropdownButtonStyle: DropdownButtonStyle(
        mainAxisAlignment: MainAxisAlignment.start,
        //width: 170,
        height: 40,
        elevation: 1,
        backgroundColor: Colors.white,
        primaryColor: Colors.black87,
      ),
      dropdownStyle: DropdownStyle(
        borderRadius: BorderRadius.circular(8),
        elevation: 6,
        padding: EdgeInsets.all(5),
      ),
      items: genderOptions
          .asMap()
          .entries
          .map(
            (item) => DropDownItem<int>(
              value: item.key + 1,
              text: item.value.option,
              iconData: item.value.icon,
              isSelected: false,
            ),
          )
          .toList(),
    );

    
    final unitsField = TextFormField(
      readOnly: true,
      controller: _unitsController,
      decoration: buildInputDecoration("Units", Icons.square_foot),
      onSaved: (value) => {personalData['units'] = value},
      onTap: () async {
        await showDialog<int>(
          context: context,
          builder: (BuildContext context) {
            return UnitSelectionDialog(
              value: _selectedUnitsOption,
              title: "Preferred Units",
              dataOptions: _dataOptions,
              );
          },
        ).then(_handleUnitSelectionChange);
      },
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter unit preference';
        }
        return null;
      },
    );
    

    return Column(children: [
      SingleChildScrollView(
        child: Container(
          child: Form(
            key: formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                label('Preferred Units'),
                SizedBox(height: 10.0),
                unitsField,
                SizedBox(height: 15.0),
                label('Height'),
                SizedBox(height: 10.0),
                heightField,
                SizedBox(height: 15.0),
                label("Birth Date"),
                SizedBox(height: 10.0),
                birthdayField,
                SizedBox(height: 15.0),
                label("Gender"),
                SizedBox(height: 10.0),
                genderField,
                SizedBox(height: 15.0),
              ],
            ),
          ),
        ),
      )
    ]);
  }
}



class HeightSelectionDialog extends StatefulWidget {
  final double value;
  final String title;
  final String attribute;

  HeightSelectionDialog({Key? key, required this.value, required this.title, required this.attribute}) : super(key: key);

  @override
  _HeightSelectionDialogState createState() => new _HeightSelectionDialogState();
}

class _HeightSelectionDialogState extends State<HeightSelectionDialog> {
  late double _currentValue;
  
  @override
  void initState() {
    super.initState();
    // Initialize current weight value
    _currentValue = widget.value;
  }
  
  _handleValueChanged(value) {
    if (value != null) {
      setState(() => _currentValue = value);
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
              value: _currentValue,
              minValue: 0,
              maxValue: 300,
              decimalPlaces: 1,
              onChanged: _handleValueChanged
            ),
            SizedBox(height: 20),
            Text(widget.attribute+': $_currentValue'+' feet'),
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
            Navigator.pop(context,_currentValue);
          },
          child: const Text('Set'),
        ),
      ],
    );
  }
}


class UnitSelectionDialog extends StatefulWidget {
  final int value;
  final String title;
  final List<Map<String, dynamic>> dataOptions;

  UnitSelectionDialog({Key? key, required this.value, required this.title, required this.dataOptions}) : super(key: key);

  @override
  _UnitSelectionDialogState createState() => new _UnitSelectionDialogState();
}

class _UnitSelectionDialogState extends State<UnitSelectionDialog> {
  late int _currentValue;
  
  @override
  void initState() {
    super.initState();
    // Initialize current weight value
    _currentValue = widget.value;
  }

  List<Widget> createRadioList() {
    List<Widget> widgets = [];
    for (int i = 0; i < widget.dataOptions.length; i++) {
      print(i);
      print(widget.dataOptions[i]);
      widgets.add(
        RadioListTile(
          value: i,
          groupValue: _currentValue,
          title: Text(
            widget.dataOptions[i]['Title'],
            style: TextStyle(
              color: Colors.black,
            ),
          ),
          onChanged: _handleValueChanged,
          selected: i == _currentValue,
          activeColor: Colors.black,
        ),
      );
    }
    return widgets;
  }
  
  _handleValueChanged(value) {
    if (value != null) {
      setState(() => _currentValue = value);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: Container(
        height: 115,
        child: Column(
          children: createRadioList(),
        )
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.pop(context,null),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () {
            Navigator.pop(context,_currentValue);
          },
          child: const Text('Set'),
        ),
      ],
    );
  }
}