import 'package:flutter/material.dart';

class Discovery extends StatefulWidget {
  @override
  _DiscoveryState createState() => _DiscoveryState();
}

class _DiscoveryState extends State<Discovery> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("DISCOVERY PAGE"),
        elevation: 0.1,
      ),
      body: Column(
        children: [
          SizedBox(
            height: 100,
          ),
        ],
      ),
    );
  }
}
