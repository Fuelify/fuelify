import 'package:flutter/material.dart';

class FullWidthButtonWidget extends StatelessWidget {
  final String text;
  final VoidCallback onClicked;

  const FullWidthButtonWidget({
    Key? key,
    required this.text,
    required this.onClicked,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: 40.0,
      ), 
      child: SizedBox(
        height: 50, //height of button
        width: double.infinity, //width of button equal to parent widget
        child: ElevatedButton(
          onPressed: onClicked, 
          child: Text( text ),
          style: ElevatedButton.styleFrom(
            onPrimary: Colors.white,
            primary: Colors.blue,
            shape: StadiumBorder(),
            padding: EdgeInsets.symmetric(horizontal: 32, vertical: 12)
          )
        )
      )
    );
      
  }
}
