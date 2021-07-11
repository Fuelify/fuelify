import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:fuelify/commons/widgets.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/commons/customdropdowns.dart';
import 'package:fuelify/commons/buttons.dart';

final genderOptions = [
  DropDownOption(option: 'Male', icon: Icons.male),
  DropDownOption(option: 'Female', icon: Icons.female),
  DropDownOption(option: 'Prefer not to say', icon: Icons.not_interested),
  DropDownOption(option: 'Prefer to self describe', icon: Icons.arrow_forward),
];

class ProfileInfoWidget extends StatelessWidget {
  final User user;
  final buttonText, buttonRoute;

  const ProfileInfoWidget({
    Key? key,
    required this.user,
    this.buttonText,
    this.buttonRoute,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final formKey = new GlobalKey<FormState>();

    final TextEditingController _dateController = TextEditingController();

    DateTime _selectedDate = DateTime.utc(1990, 1, 1);

    Map<String, dynamic> personalData =
        {}; // initialize empty personal data map

    final firstNameField = TextFormField(
      autofocus: false,
      onSaved: (value) => {personalData['firstname'] = value},
      decoration: buildInputDecoration("First Name", Icons.person),
    );

    final lastNameField = TextFormField(
      autofocus: false,
      onSaved: (value) => {personalData['lastname'] = value},
      decoration: buildInputDecoration("Last Name", Icons.person_outline_sharp),
    );

    final locationField = TextFormField(
      autofocus: false,
      onSaved: (value) => {personalData['location'] = value},
      decoration: buildInputDecoration("Location", Icons.location_on),
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

    var recordData = () {
      final form = formKey.currentState;

      if (form!.validate()) {
        form.save();
        print(personalData);

      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text("Invalid Form: " + "Please Complete the form properly")));
      }
    };
    
    final nextView = (routeName) {
      print(routeName);
      Navigator.pushNamed(context, routeName);
    };

    /*
    return SafeArea(
      child: Scaffold(
        body: SingleChildScrollView(
          */
    return Column(children: [
      SingleChildScrollView(
        child: Container(
          padding: EdgeInsets.all(40.0),
          child: Form(
            key: formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                label("First Name"),
                SizedBox(height: 10.0),
                firstNameField,
                SizedBox(height: 15.0),
                label("Last Name"),
                SizedBox(height: 10.0),
                lastNameField,
                SizedBox(height: 15.0),
                label("Gender"),
                SizedBox(height: 10.0),
                genderField,
                SizedBox(height: 15.0),
                label("Birth Date"),
                SizedBox(height: 10.0),
                birthdayField,
                SizedBox(height: 15.0),
                label("Location"),
                SizedBox(height: 10.0),
                locationField,
                SizedBox(height: 15.0),
              ],
            ),
          ),
        ),
      ),
      Center(
        child: FullWidthButtonWidget(
          text: buttonText,
          onClicked: () {
            recordData();
            nextView(buttonRoute);
          },
        ),
      )
    ]);
  }
}
