import 'package:flutter/material.dart';
import 'package:fuelify/models/meal.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_day.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_day_navigation.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_week.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_week_navigation.dart';
import 'package:fuelify/screens/main/plan/controllers/meal_plan.dart';
import 'package:fuelify/screens/main/plan/widgets/meal_tile.dart';
import 'package:fuelify/screens/main/plan/widgets/plan_navigation_bar.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

final dayOfWeek = [
  'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
];

class PlanScreen extends ConsumerStatefulWidget {
  
  const PlanScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends ConsumerState<PlanScreen> {

  @override
  Widget build(BuildContext context) {

    // Preload meal plan data from server
    ref.read(mealPlanProvider.notifier).preloadData();

    return const Scaffold(
      appBar: PlanScreenNavigationBarWidget(),
      body: WeekView()
    );
  }
}

class WeekView extends ConsumerStatefulWidget {

  const WeekView({super.key});

  @override
  _WeekViewState createState() => _WeekViewState();
}

class _WeekViewState extends ConsumerState<WeekView> with SingleTickerProviderStateMixin {
  final PageController _weekViewController = PageController(initialPage: 500); // large enough to scroll in both directions
  
  final PageController _dayViewController = PageController(); 

  @override
  void initState() {
    super.initState();
    ref.read(weekViewProvider.notifier).controller = _weekViewController;
  }

  @override
  Widget build(BuildContext context) {

    final weekViewController = ref.watch(weekViewControllerProvider);
    final dayViewController = ref.watch(dayViewControllerProvider);

    final weekPageIndex = ref.watch(weekViewProvider);
    final dayPageIndex = ref.watch(dayViewProvider);

    return PageView.builder(
      controller: weekViewController,
      onPageChanged: (index) {
        ref.read(weekViewProvider.notifier).setPage(index);
        setState(() {
          
          if (ref.read(dayViewProvider.notifier).day == 0) {
            ref.read(dayViewProvider.notifier).setPage(0);
          } else {
            ref.read(dayViewProvider.notifier).setPage(0);
          }
        });
      },
      itemBuilder: (context, index) {
        DateTime firstDayOfWeek = DateTime.now().subtract(Duration(days: DateTime.now().weekday - 1)); // first day of this week
        firstDayOfWeek = firstDayOfWeek.add(Duration(days: (index - 500) * 7)); // offset by the number of weeks

        return Container(
          padding: const EdgeInsets.only(left: 10, right: 10),
          color: Colors.white,
          child: Column(
            children: <Widget>[
              Row(
                children: List.generate(7, (dayindex) {
                  return Expanded(
                    child: GestureDetector(
                      onTap: () {
                        ref.read(dayViewProvider.notifier).setPage(dayindex);
                        dayViewController.jumpToPage(dayindex);
                      },
                      child: Container(
                        padding: const EdgeInsets.only(left:2.0,right:2.0,top:6,bottom:6),
                        decoration: BoxDecoration(
                          borderRadius: const BorderRadius.only(topLeft: Radius.circular(5), topRight: Radius.circular(5)),
                          color: dayPageIndex == dayindex ? Colors.black : dayindex == DateTime.now().weekday-1 && weekPageIndex == 500 ? const Color.fromARGB(255, 220, 220, 220) : Colors.white, 
                        ),
                        child: Column(
                          children: [
                            Text(
                              dayOfWeek[firstDayOfWeek.add(Duration(days: dayindex)).weekday-1],
                              style: TextStyle(
                                fontSize: 12,
                                color: dayPageIndex == dayindex ? Colors.white : Colors.black87
                              ),
                            ),
                            const SizedBox(height: 4,),
                            Text(
                              '${firstDayOfWeek.add(Duration(days: dayindex)).day}',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: dayPageIndex == dayindex ? Colors.white : Colors.black87
                              ),
                            ),
                          ],
                        )
                      )
                    ),
                  );
                  }
                )
              ),
              Expanded(
                child: PageView(
                  controller: dayViewController,
                  onPageChanged: (dayindex) {
                    ref.read(dayViewProvider.notifier).setPage(dayindex);
                  },
                  children: List.generate(7, (index) {
                    return DayView(DateFormat('yyyy-MM-dd').format(firstDayOfWeek.add(Duration(days: index))));
                  }),
                ),
              ),
            ],
          )
        );
      }
    );
  }

  @override
  void dispose() {
  _weekViewController.dispose();
  _dayViewController.dispose();
    super.dispose();
  }
}

class DayView extends ConsumerWidget {
  final String calendarDate;

  const DayView(this.calendarDate, {super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mealPlan = ref.watch(mealPlanProvider);

    if (!mealPlan.containsKey(calendarDate)) {
      // Data for this date has not been preloaded
      // Display loading spinner, error message, etc.
      return const Text('Data not available');
    }

  List<Meal> data = mealPlan[calendarDate] as List<Meal>;

    // Display data
    return ListView.builder(
      itemCount: data.length,
      itemBuilder: (context, index) {
        final mealTile = MealTile(
          meal: data[index], 
          onTap: () => print('push to recipe view expanded (maybe bottom sheet?)'),
          onLongPress: () => print('pop whole card into movable object that can be moved to different day'),
        );

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Draggable<MealTile>(
            data: mealTile,
            childWhenDragging: Container(),
            feedback: SizedBox(
                width: MediaQuery.of(context).size.width * 0.95, // Set the desired width
                height: MediaQuery.of(context).size.width * 0.95 / (16/7), // Set the desired height
                child: mealTile
              ),
            child: mealTile
          )
        );
      },
    );
  }
}