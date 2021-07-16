import 'package:flutter/material.dart';
import 'package:fuelify/commons/cards.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/commons/onboarding/profile.dart';
import 'package:fuelify/commons/buttons.dart';

class DeviceConnectionsUpdate extends StatefulWidget {
  @override
  _DeviceConnectionsUpdateState createState() =>
      _DeviceConnectionsUpdateState();
}

class _DeviceConnectionsUpdateState extends State<DeviceConnectionsUpdate> {
  @override
  Widget build(BuildContext context) {
    User user = Provider.of<UserProvider>(context).user;

    double deviceCardHeight = 175;
    double deviceCardWidth = MediaQuery.of(context).size.width / 3;
    
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
              "Choose your activity level:",
              style: TextStyle(
                color: Colors.grey[850],
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
              "Connect your activity tracker",
              style: TextStyle(
                color: Colors.grey[850],
                fontWeight: FontWeight.bold,
                fontSize: 18.0,
              ),
            ),
          ),
          Container(
              height: deviceCardHeight,
              width: double.infinity,
              //color: Colors.cyan,
              child: GridView.count(
                physics: NeverScrollableScrollPhysics(),
                primary: false,
                padding: const EdgeInsets.all(20),
                childAspectRatio: (deviceCardWidth / deviceCardHeight),
                crossAxisSpacing: 20,
                mainAxisSpacing: 20,
                crossAxisCount: 3,
                children: <Widget>[
                  DeviceCardWidget(
                      deviceLogo: AssetImage("assets/garmin_logo.png"),
                      deviceImage: AssetImage("assets/garmin_watch.jpeg")),
                  DeviceCardWidget(
                      deviceLogo: AssetImage("assets/fitbit_logo.png"),
                      deviceImage: AssetImage("assets/fitbit_watch.png")),
                  DeviceCardWidget(
                      deviceLogo: AssetImage("assets/apple_logo.png"),
                      deviceImage: AssetImage("assets/apple_watch.png")),
                ],
              )),
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
