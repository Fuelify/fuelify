import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:fuelify/commons/widgets.dart';
import 'package:fuelify/models/user.dart';

class ProfileInfoWidget extends StatelessWidget {
  final User user;

  const ProfileInfoWidget({
    Key? key,
    required this.user,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final formKey = new GlobalKey<FormState>();

    final TextEditingController _dateController = TextEditingController();

    DateTime _selectedDate = DateTime.utc(1990, 1, 1);

    String? _firstname, _lastname, _location, _birthday, _gender;

    final firstNameField = TextFormField(
      autofocus: false,
      onSaved: (value) => _firstname = value,
      decoration: buildInputDecoration("First Name", Icons.person),
    );

    final lastNameField = TextFormField(
      autofocus: false,
      onSaved: (value) => _lastname = value,
      decoration: buildInputDecoration("Last Name", Icons.person_outline_sharp),
    );

    final locationField = TextFormField(
      autofocus: false,
      onSaved: (value) => _location = value,
      decoration: buildInputDecoration("Location", Icons.location_on),
    );

    final birthdayField = TextFormField(
      readOnly: true,
      controller: _dateController,
      decoration: buildInputDecoration("Location", Icons.calendar_today),
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

    /*final birthdayField = TextFormField(
      autofocus: false,
      onSaved: (value) => _birthday = value,
      decoration: buildInputDecoration("Location", Icons.calendar_today),
    );*/

    final genderField = TextFormField(
      autofocus: false,
      onSaved: (value) => _gender = value,
      decoration: buildInputDecoration("Location", Icons.male),
    );

    /*
    return SafeArea(
      child: Scaffold(
        body: SingleChildScrollView(
          */
    return SingleChildScrollView(
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
    );
  }
}
