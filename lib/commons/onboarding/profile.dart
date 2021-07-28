import 'package:flutter/material.dart';

import 'package:fuelify/commons/widgets.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/commons/customdropdowns.dart';

final genderOptions = [
  DropDownOption(option: 'Male', icon: Icons.male),
  DropDownOption(option: 'Female', icon: Icons.female),
  DropDownOption(option: 'Prefer not to say', icon: Icons.not_interested),
  DropDownOption(option: 'Prefer to self describe', icon: Icons.arrow_forward),
];

class ProfileInfoWidget extends StatelessWidget {
  final Profile profile;
  final formKey;
  final profileData;

  const ProfileInfoWidget({
    Key? key,
    required this.profile,
    required this.formKey,
    required this.profileData,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {

    final firstNameField = TextFormField(
      initialValue: profile.firstName != null ? profile.firstName : "",
      autofocus: false,
      onSaved: (value) => {profileData['firstname'] = value},
      decoration: buildInputDecoration("First Name", Icons.person),
    );

    final lastNameField = TextFormField(
      initialValue: profile.lastName != null ? profile.lastName : "",
      autofocus: false,
      onSaved: (value) => {profileData['lastname'] = value},
      decoration: buildInputDecoration("Last Name", Icons.person_outline_sharp),
    );

    final locationField = TextFormField(
      autofocus: false,
      onSaved: (value) => {profileData['location'] = value},
      decoration: buildInputDecoration("Location", Icons.language),
    );

    return Column(children: [
      SingleChildScrollView(
        child: Container(
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
                label("Location"),
                SizedBox(height: 10.0),
                locationField,
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 5),
                  child: Text(
                    "*Location data enables us to provide personalized recommendations for your area and more precise shopping costs",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      )
    ]);
  }
}
