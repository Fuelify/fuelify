import 'package:flutter/material.dart';

import 'package:fuelify/models/user.dart';


Widget buildName(User user) {
  return Column(
    children: [
      Text(
        user.name,
        style: TextStyle(
          color: Colors.black,
          fontWeight: FontWeight.bold,
          fontSize: 24,
        ),
      ),
      Text(
        user.email,
        style: TextStyle(
          color: Colors.grey
        )
      )
    ]
  );
}