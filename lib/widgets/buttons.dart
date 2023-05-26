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
      padding: const EdgeInsets.only(
        left: 20.0,
        right: 20.0,
        bottom: 40.0,
        top: 20.0
      ), 
      child: SizedBox(
        height: 50, //height of button
        width: double.infinity, //width of button equal to parent widget
        child: ElevatedButton(
          onPressed: onClicked, 
          child: Text( text ),
          style: ElevatedButton.styleFrom(
            onPrimary: Colors.white,
            primary: Colors.black,
            shape: const StadiumBorder(),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12)
          )
        )
      )
    );
      
  }
}


class FullWidthOverlayButtonWidget extends StatelessWidget {
  final String text;
  final VoidCallback onClicked;

  const FullWidthOverlayButtonWidget({
    Key? key,
    required this.text,
    required this.onClicked,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: 0,
      left: 0,
      bottom: 0,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.only(
            bottom: 40.0,
            top: 20.0
          ), 
          child: Container( 
            decoration: const BoxDecoration(
              //borderRadius: BorderRadius.circular(10),
              //boxShadow: [
              //  BoxShadow(color: Colors.black12, spreadRadius: 0.5),
              //],
              gradient: LinearGradient(
                colors: [Colors.white10, Colors.white],
                begin: Alignment.topCenter,
                stops: [0, 0.5],
                end: Alignment.bottomCenter,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: SizedBox(
                height: 50, //height of button
                width: double.infinity, //width of button equal to parent widget
                child: ElevatedButton(
                  onPressed: onClicked,
                  /*style: ElevatedButton.styleFrom(
                    foregroundColor: Colors.white, 
                    backgroundColor: Colors.black,
                    shape: const StadiumBorder(),
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12)
                  ),*/
                  child: Text( text )
                )
              )
            )
          )
        ),
      ),
    ); 
  }
}
