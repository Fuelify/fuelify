import 'package:flutter/material.dart';

import 'package:fuelify/models/user.dart';

class UpgradeButtonWidget extends StatelessWidget {
  final String text;
  final VoidCallback onClicked;

  const UpgradeButtonWidget({
    Key? key,
    required this.text,
    required this.onClicked,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onClicked, 
      child: Text( text ),
      style: ElevatedButton.styleFrom(
        onPrimary: Colors.white,
        primary: Colors.blue,
        shape: StadiumBorder(),
        padding: EdgeInsets.symmetric(horizontal: 32, vertical: 12)
      )
    );
  }
}
