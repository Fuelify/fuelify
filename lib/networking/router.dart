import 'package:flutter/material.dart';
import 'package:fuelify/screens/errors/routing/screen.dart';
import 'package:fuelify/screens/onboarding/activity/screen.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:fuelify/screens/splash_screen.dart';
import 'package:fuelify/screens/login_screen.dart';
import 'package:fuelify/screens/register_screen.dart';

// Main App Pages
import 'package:fuelify/screens/main/home/screen.dart';
import 'package:fuelify/screens/main/discovery/screen.dart';
import 'package:fuelify/screens/main/food/screen.dart';
import 'package:fuelify/screens/main/plan/screen.dart';
import 'package:fuelify/screens/main/profile/screen.dart';
import 'package:fuelify/screens/main/dashboard/screen.dart';

// Onboarding Page Screens
import 'package:fuelify/screens/onboarding/screen.dart';
import 'package:fuelify/screens/onboarding/welcome/screen.dart';
import 'package:fuelify/screens/onboarding/profile/screen.dart';
import 'package:fuelify/screens/onboarding/personal/screen.dart';
import 'package:fuelify/screens/onboarding/diet/screen.dart';
import 'package:fuelify/screens/onboarding/allergens/screen.dart';
import 'package:fuelify/screens/onboarding/habits/screen.dart';

import 'package:fuelify/screens/onboarding/devices/screen.dart';
import 'package:fuelify/screens/onboarding/goals/screen.dart';
import 'package:fuelify/screens/onboarding/primary/screen.dart';
import 'package:fuelify/screens/onboarding/shopping/screen.dart';
import 'package:fuelify/screens/onboarding/submission/submission.dart';
import 'package:fuelify/screens/onboarding/weight/screen.dart';

// Define the route paths as constants
class Routes {
  static const splash = '/';
  static const login = '/login';
  static const registration = '/registration';
}

class DashboardRoutes {
  static const defaultLandingRoute = 0;
  static const List<String> route = [
    "home",
    "plan",
    "discovery",
    "food",
    "profile",
  ];
}

//TODO merge this back into a Map consisting of GoRouter items that define route name, and builder
class OnboardingRoutes {
  static const defaultLandingRoute = 0;
  static const List<String> route = [
    "onboarding/welcome",
    "onboarding/profile",
    "onboarding/personal-details",
    "onboarding/diet",
    "onboarding/allergens",
    "onboarding/eating-habits",
    "onboarding/health-goals",
    "onboarding/primary-goal",
    "onboarding/weight-goals",
    "onboarding/shopping-preferences",
    "onboarding/activity-level",
    "onboarding/device-connections",
    "onboarding/submission",
  ];
}

//TODO move to providers folder
final routerProvider = Provider<GoRouter>((ref) {
  return ApplicationRouter.router;
});


final GlobalKey<NavigatorState> _rootNavigator = GlobalKey(debugLabel: 'root');
final GlobalKey<NavigatorState> _mainShellNavigator = GlobalKey(debugLabel: 'mainShell');
final GlobalKey<NavigatorState> _onboardingShellNavigator = GlobalKey(debugLabel: 'onboardingShell');


class ApplicationRouter {
  static final router = GoRouter(
    navigatorKey: _rootNavigator,
    // Define your routes and handlers here
    routes: [
      GoRoute(
        name: 'splash',
        path: Routes.splash,
        pageBuilder: (context, state) => SplashScreen(),
      ),
      GoRoute(
        name: Routes.login.substring(1),
        path: Routes.login,
        pageBuilder: (context, state) => LoginScreen(),
      ),
      GoRoute(
        name: Routes.registration.substring(1),
        path: Routes.registration,
        pageBuilder: (context, state) => RegisterScreen(),
      ),
      ShellRoute(
        navigatorKey: _mainShellNavigator,
        builder: (context, state, child) => DashboardScreen(key: state.pageKey, child: child),
        routes: [
          GoRoute(
            name: DashboardRoutes.route[0],
            path: '/${DashboardRoutes.route[0]}',
            pageBuilder: (context, state) {
              return NoTransitionPage(
                child: HomeScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: DashboardRoutes.route[1],
            path: '/${DashboardRoutes.route[1]}',
            pageBuilder: (context, state) {
              return NoTransitionPage(
                child: PlanScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: DashboardRoutes.route[2],
            path: '/${DashboardRoutes.route[2]}',
            pageBuilder: (context, state) {
              return NoTransitionPage(
                child: DiscoveryScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: DashboardRoutes.route[3],
            path: '/${DashboardRoutes.route[3]}',
            pageBuilder: (context, state) {
              return NoTransitionPage(
                child: FoodScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: DashboardRoutes.route[4],
            path: '/${DashboardRoutes.route[4]}',
            pageBuilder: (context, state) {
              return NoTransitionPage(
                child: ProfileScreen(
                  key: state.pageKey,
                )
              );
            },
          )
        ]
      ),
      // Onboarding Flow
      ShellRoute(
        navigatorKey: _onboardingShellNavigator,
        builder: (context, state, child) => OnboardingScreen(key: state.pageKey, child: child),
        routes: [
          GoRoute(
            name: OnboardingRoutes.route[0],
            path: '/${OnboardingRoutes.route[0]}',
            pageBuilder: (context, state) {
              return NoTransitionPage(
                child: OnboardingWelcomeScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[1],
            path: '/${OnboardingRoutes.route[1]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: ProfileUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[2],
            path: '/${OnboardingRoutes.route[2]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: PersonalDetailsUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[3],
            path: '/${OnboardingRoutes.route[3]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: DietUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[4],
            path: '/${OnboardingRoutes.route[4]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: AllergensUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[5],
            path: '/${OnboardingRoutes.route[5]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: EatingHabitsUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[6],
            path: '/${OnboardingRoutes.route[6]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: HealthGoalsUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[7],
            path: '/${OnboardingRoutes.route[7]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: PrimaryGoalUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[8],
            path: '/${OnboardingRoutes.route[8]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: WeightGoalsUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[9],
            path: '/${OnboardingRoutes.route[9]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: ShoppingPreferencesUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[10],
            path: '/${OnboardingRoutes.route[10]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: ActivityLevelUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[11],
            path: '/${OnboardingRoutes.route[11]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: DeviceConnectionsUpdateScreen(
                  key: state.pageKey,
                )
              );
            },
          ),
          GoRoute(
            name: OnboardingRoutes.route[12],
            path: '/${OnboardingRoutes.route[12]}',
            pageBuilder: (context, state) {
              return MaterialPage(
                child: OnboardingSubmissionScreen(
                  key: state.pageKey,
                )
              );
            },
          )
        ]
      ),
    ],
    // handle unknown routes here
    errorBuilder: (context, state) => RouteErrorScreen(
      errorMsg: state.error.toString(),
      key: state.pageKey,
    ),
  );
}
