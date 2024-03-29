import 'package:flutter/material.dart';
import 'package:fuelify/screens/onboarding/controller.dart';
import 'package:fuelify/widgets/cards.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:provider/provider.dart';

import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';

import 'package:fuelify/widgets/buttons.dart';

class DeviceConnectionsUpdateScreen extends ConsumerStatefulWidget {
  const DeviceConnectionsUpdateScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<DeviceConnectionsUpdateScreen> createState() => _DeviceConnectionsUpdateScreenState();
}

class _DeviceConnectionsUpdateScreenState extends ConsumerState<DeviceConnectionsUpdateScreen> {
  @override
  Widget build(BuildContext context) {
    //User user = Provider.of<UserProvider>(context).user;

    double deviceCardHeight = 175;
    double deviceCardWidth = MediaQuery.of(context).size.width / 3;

    return Scaffold(
      body: Column(
        children: [
          Container(
            width: double.infinity,
            child: Padding(
              padding: EdgeInsets.only(left: 20.0, right: 20.0, top: 20.0),
              child: Text(
                "Connect your activity tracker",
                style: TextStyle(
                  color: Colors.grey[850],
                  fontWeight: FontWeight.bold,
                  fontSize: 18.0,
                ),
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
            )
          ),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 5),
            child: Text(
              "*Currently we only offer the ability to connect to these devices; however, we are continually looking to offer our users more connections options.",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12),
            ),
          ),
          Spacer(),
          Center(
            child: FullWidthOverlayButtonWidget(
              text: "Continue",
              onClicked: () {
                ref.read(onboardingNavigationProgressControllerProvider.notifier).onContinueTapped(ref);
              },
            ),
          ),
        ],
      ),
    );
  }
}
