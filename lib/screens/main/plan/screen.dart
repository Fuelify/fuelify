import 'package:flutter/material.dart';
import 'package:fuelify/models/meal.dart';
import 'package:fuelify/screens/main/plan/controllers/calendar_navigation.dart';
import 'package:fuelify/screens/main/plan/controllers/meal_plan.dart';
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

    return Scaffold(
      appBar: const PlanScreenNavigationBarWidget(),
      body: PageView.builder(
        itemBuilder: (context, position) {
          return WeekView(position);
        },
      ),
    );
  }
}

class WeekView extends ConsumerStatefulWidget {
  final int weekOffset;

  const WeekView(this.weekOffset, {super.key});

  @override
  _WeekViewState createState() => _WeekViewState();
}
class _WeekViewState extends ConsumerState<WeekView> with SingleTickerProviderStateMixin {
  final PageController _weekViewController = PageController(initialPage: 500); // large enough to scroll in both directions
  int _pageIndex = 500;
  final PageController _dayViewController = PageController(); 

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    final tabIndex = ref.watch(planCalendarNavigationControllerProvider);

    return PageView.builder(
      controller: _weekViewController,
      onPageChanged: (index) {
        setState(() {
          if (ref.read(planCalendarNavigationControllerProvider.notifier).index == 0) {
            ref.read(planCalendarNavigationControllerProvider.notifier).setCurrentIndex(0);
            //_dayViewController.jumpToPage(6);
          } else {
            ref.read(planCalendarNavigationControllerProvider.notifier).setCurrentIndex(0);
            //_dayViewController.jumpToPage(0);
          }
          //ref.read(planCalendarNavigationControllerProvider.notifier).onItemTapped(0); // set to the monday of swippe to week by default
          _pageIndex = index;
        });
      },
      itemBuilder: (context, index) {
        DateTime firstDayOfWeek = DateTime.now().subtract(Duration(days: DateTime.now().weekday - 1)); // first day of this week
        firstDayOfWeek = firstDayOfWeek.add(Duration(days: (index - 500) * 7)); // offset by the number of weeks

        return Container(
          padding: const EdgeInsets.only(left: 10, right: 10),
            child: Column(
              children: <Widget>[
                Row(
                  children: List.generate(7, (dayindex) {
                    return Expanded(
                      child: GestureDetector(
                        onTap: () {
                          ref.read(planCalendarNavigationControllerProvider.notifier).onItemTapped(dayindex);
                          _dayViewController.jumpToPage(dayindex);
                        },
                        child: Container(
                          padding: const EdgeInsets.only(left:2.0,right:2.0,top:6,bottom:6),
                          decoration: BoxDecoration(
                            borderRadius: const BorderRadius.only(topLeft: Radius.circular(5), topRight: Radius.circular(5)),
                            color: tabIndex == dayindex ? Colors.black : Colors.white, 
                          ),
                          child: Column(
                            children: [
                              Text(
                                dayOfWeek[firstDayOfWeek.add(Duration(days: dayindex)).weekday-1],
                                style: TextStyle(
                                  fontSize: 12,
                                  color: tabIndex == dayindex ? Colors.white : Colors.black87
                                ),
                              ),
                              const SizedBox(height: 4,),
                              Text(
                                '${firstDayOfWeek.add(Duration(days: dayindex)).day}',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: tabIndex == dayindex ? Colors.white : Colors.black87
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
                    controller: _dayViewController,
                    onPageChanged: (dayindex) {
                      ref.read(planCalendarNavigationControllerProvider.notifier).onItemTapped(dayindex);
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
        return Card(
          shadowColor: Colors.black,
          child: ListTile(
            title: Text('$calendarDate ${data[index].title}'),
          ),
        );
      },
    );
  }
}