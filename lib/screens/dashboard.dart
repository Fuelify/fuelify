import 'package:flutter/material.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user_provider.dart';
import 'package:fuelify/providers/auth.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/commons/widgets.dart';

class DashBoard extends StatefulWidget {
  @override
  _DashBoardState createState() => _DashBoardState();
}

class _DashBoardState extends State<DashBoard> {
  @override
  Widget build(BuildContext context) {
    User user = Provider.of<UserProvider>(context).user;
    AuthProvider auth = Provider.of<AuthProvider>(context);

    var requestTokenTest = () async {
      final Map<String, dynamic> requestMessage = await auth.tokentest();

      print(requestMessage);

    };

    var navigateToDiscovery = () async {
      Navigator.pushReplacementNamed(context, '/discovery');
    };

    return Scaffold(
      appBar: AppBar(
        title: Text("DASHBOARD PAGE"),
        elevation: 0.1,
      ),
      body: Column(
        children: [
          SizedBox(
            height: 50,
          ),
          Center(child: Text(user.email)),
          SizedBox(height: 50),
          ElevatedButton(
              onPressed: () {
                Navigator.pushReplacementNamed(context, '/login');
              },
              child: Text("Logout")),
          SizedBox(height: 25),
          longButtons("Check Token Validation", requestTokenTest),
          SizedBox(height: 35),
          longButtons(
            "Go to Discovery Page", 
            navigateToDiscovery
          )
        ],
      ),
    );
  }
}
