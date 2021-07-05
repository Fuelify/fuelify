import 'package:flutter/material.dart';

import 'package:fuelify/models/user.dart';

class ProfilePhotoWidget extends StatelessWidget {
  final User user;
  final VoidCallback onClicked;

  const ProfilePhotoWidget({
    Key? key,
    required this.user,
    required this.onClicked,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: EdgeInsets.only(top: 15.0),
        child: Stack(
          children: [buildImage(user, onClicked), buildEditIcon()],
        ),
      ),
    );
  }
}

Widget buildImage(user, onClicked) {
  return ClipOval(
      child: Material(
          color: Colors.transparent,
          child: Ink.image(
            image: user.image == null ? AssetImage("assets/perosn.jpeg") : AssetImage("assets/perosn.jpeg"),//NetworkImage(user.image),
            fit: BoxFit.cover,
            width: 128,
            height: 128,
            child: InkWell(
              onTap: onClicked,
            ),
          )));
}

Widget buildEditIcon() {
  return Positioned(
    bottom: 0,
    right: 0,
    child: buildCircle(
      color: Colors.white,
      all: 2,
      child: buildCircle(
        color: Colors.blue,
        all: 8,
        child: Icon(
            Icons.add_a_photo,
            color: Colors.white,
            size: 20,
        ),
      ),
    ),
  );
}

Widget buildCircle({
  required Widget child,
  required double all,
  required Color color,
}) =>
    ClipOval(
      child: Container(
        child: child,
        color: color,
        padding: EdgeInsets.all(all),
      ),
    );
