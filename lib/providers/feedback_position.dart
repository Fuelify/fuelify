import 'package:flutter/material.dart';

enum SwipingDirection { left, right, up, down, none }

class FeedbackPositionProvider extends ChangeNotifier {
  double _dx = 0.0;
  double _dy = 0.0;
  SwipingDirection _swipingDirection = SwipingDirection.none;

  SwipingDirection get swipingDirection => _swipingDirection;
  double get dx => _dx;
  double get dy => _dy;

  FeedbackPositionProvider() {
    _swipingDirection = SwipingDirection.none;
    _dx = 0.0;
    _dy = 0.0;
  }

  void resetPosition() {
    _dx = 0.0;
    _dy = 0.0;
    _swipingDirection = SwipingDirection.none;
    notifyListeners();
  }

  void updatePosition(double changeInX, double changeInY) {
    _dx = _dx + changeInX;
    _dy = _dy + changeInY;
    if (_dx.abs() > _dy.abs()) {
      // feedback in x direction dominates
      if (_dx > 0) {
        _swipingDirection = SwipingDirection.right;
      } else if (_dx < 0) {
        _swipingDirection = SwipingDirection.left;
      } else {
        _swipingDirection = SwipingDirection.none;
      }
    } else {
      // feedback in y direction dominates
      if (_dy > 0) {
        _swipingDirection = SwipingDirection.down;
      } else if (_dy < 0) {
        _swipingDirection = SwipingDirection.up;
      } else {
        _swipingDirection = SwipingDirection.none;
      }
    }
    notifyListeners();
  }
}
