import 'package:flutter/cupertino.dart';
/*
  Food Data Class
*/
class Food {
  final String name;
  final String designation;
  final int userFavorites;
  final int age;
  final String imgUrl;
  final String location;
  final String bio;
  bool isLiked;
  bool isFavorited;
  bool isDisliked;

  Food({
    required this.designation,
    required this.userFavorites,
    required this.name,
    required this.age,
    required this.imgUrl,
    required this.location,
    required this.bio,
    this.isLiked = false,
    this.isDisliked = false,
    this.isFavorited = false,
  });
}