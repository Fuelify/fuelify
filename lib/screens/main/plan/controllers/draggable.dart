import 'package:fuelify/screens/main/plan/widgets/meal_tile.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final draggedItemProvider = StateNotifierProvider<DraggedItemNotifier, MealTile?>((ref) => DraggedItemNotifier());

class DraggedItemNotifier extends StateNotifier<MealTile?> {
  DraggedItemNotifier() : super(null);

  void startDragging(MealTile item) {
    state = item;
  }

  void stopDragging() {
    state = null;
  }
}
