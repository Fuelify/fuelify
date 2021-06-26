import 'package:flutter/material.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';
import 'package:provider/provider.dart';

class Welcome extends StatelessWidget {
  // Delcare a field that holds the User object
  final user;

  Welcome({Key? key, required this.user}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Provider.of<UserProvider>(context).setUser(user);

    return Scaffold(
      body: Container(
        child: Center(
          child: Text("WELCOME PAGE"),
        ),
      ),
    );
  }
}