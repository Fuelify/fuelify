import 'package:flutter/material.dart';
import 'package:fuelify/constants.dart';
import 'package:fuelify/login_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Authorization Screen',
      theme: ThemeData(
          // This is the theme of your application.
          brightness: Brightness.dark,
          primaryColor: kPrimaryColor,
          scaffoldBackgroundColor: kBackgroundColor,
          textTheme: TextTheme(
            headline4:
                TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            button: TextStyle(color: kPrimaryColor),
            headline5:
                TextStyle(color: Colors.white, fontWeight: FontWeight.normal),
          )),
      home: WelcomeScreen(),
    );
  }
}

// Welcome Screen
class WelcomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: <Widget>[
          Expanded(
              flex: 3,
              child: Container(
                decoration: BoxDecoration(
                    image: DecorationImage(
                  image: AssetImage("assets/perosn.jpeg"),
                  fit: BoxFit.cover,
                )),
              )),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: <Widget>[
                RichText(
                    textAlign: TextAlign.center,
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: "FUELIFY YOUR LIFE",
                          style: Theme.of(context).textTheme.headline4,
                        )
                      ],
                    )),
                FittedBox(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(
                        builder: (context) {
                          return LoginScreen();
                        },
                      ));
                    },
                    child: Container(
                        margin: EdgeInsets.only(bottom: 25),
                        padding: EdgeInsets.symmetric(
                            horizontal: 26, vertical: 16),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(25),
                          color: kPrimaryColor,
                        ),
                        child: Row(children: <Widget>[
                          Text(
                            "START THE JOURNEY",
                            style: TextStyle(color: Colors.black),
                          ),
                          SizedBox(width: 10),
                          Icon(
                            Icons.arrow_forward,
                            color: Colors.black,
                          )
                        ]
                      )
                    )
                  )
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
