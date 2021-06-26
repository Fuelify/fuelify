import 'package:flutter/material.dart';

enum SwipingDirection { left, right, up, down, none }

class FeedbackPositionProvider extends ChangeNotifier {
  double _dx = 0.0;
  double _dy = 0.0;
  SwipingDirection _swipingDirection = SwipingDirection.none;

  SwipingDirection get swipingDirection => _swipingDirection;
  double get dx => _dx;
  double get dy => _dy;

  //FeedbackPositionProvider() {
  //  _swipingDirection = SwipingDirection.none;
  //}

  void resetPosition() {
    _dx = 0.0;
    _dy = 0.0;
    _swipingDirection = SwipingDirection.none;
    notifyListeners();
  }

  void updatePosition(double changeInX, double changeInY) {
    _dx = _dx + changeInX;
    _dy = _dy + changeInY;
    print('Drag dX: ' + _dx.toString());
    print('Drag dY: ' + _dy.toString());
    if (_dx.abs() > _dy.abs()) {
      // feedback in x direction dominates
      if (_dx > 0) {
        _swipingDirection = SwipingDirection.right;
        print('Swiping Right');
      } else if (_dx < 0) {
        _swipingDirection = SwipingDirection.left;
        print('Swiping Left');
      } else {
        _swipingDirection = SwipingDirection.none;
      }
    } else {
      // feedback in y direction dominates
      if (_dy > 0) {
        _swipingDirection = SwipingDirection.down;
        print('Swiping Down');
      } else if (_dy < 0) {
        _swipingDirection = SwipingDirection.up;
        print('Swiping Up');
      } else {
        _swipingDirection = SwipingDirection.none;
      }
    }
    notifyListeners();
  }
}
