import 'package:flutter/material.dart';
import 'package:fuelify/commons/cards.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/commons/onboarding/profile.dart';
import 'package:fuelify/commons/buttons.dart';

class DeviceConnectionsUpdate extends StatefulWidget {
  @override
  _DeviceConnectionsUpdateState createState() => _DeviceConnectionsUpdateState();
}

class _DeviceConnectionsUpdateState extends State<DeviceConnectionsUpdate> {
  @override
  Widget build(BuildContext context) {
    User user = Provider.of<UserProvider>(context).user;

    var nextView = (routeName) {
      Navigator.pushNamed(context, routeName);
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("Device Connections"),
        elevation: 0.1,
      ),
      body: ListView(
        children: [
          Padding(
            padding: EdgeInsets.symmetric(vertical: 20.0, horizontal: 20.0),
            child: Text(
              "Activity Level",
              style: TextStyle(
                color: Colors.grey,
                fontWeight: FontWeight.bold,
                fontSize: 18.0,
              ),
            ),
          ),
          SizedBox(
            height: 24,
          ),
          Padding(
            padding: EdgeInsets.symmetric(vertical: 0.0, horizontal: 20.0),
            child: Text(
              "Connect Your Activity Tracker",
              style: TextStyle(
                color: Colors.grey,
                fontWeight: FontWeight.bold,
                fontSize: 18.0,
              ),
            ),
          ),
          Container(
            height: 200,
            width: double.infinity,
            child: GridView.count(
              primary: false,
              padding: const EdgeInsets.all(20),
              crossAxisSpacing: 20,
              mainAxisSpacing: 0,
              crossAxisCount: 3,
              children: <Widget>[
                DeviceCardWidget(device: "Garmin"),
                DeviceCardWidget(device: "Fitbit"),
                DeviceCardWidget(device: "Apple"),
              ],
            )
          ),
          Center(
            child: FullWidthButtonWidget(
              text: 'Continue',
              onClicked: () {
                nextView("/onboarding/device-connections");
              },
            ),
          ),
        ],
      ),
    );
  }
}
