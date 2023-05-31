import 'package:flutter/material.dart';
import 'package:fuelify/providers/dark_mode.dart';
import 'package:fuelify/networking/router.dart';
import 'package:fuelify/screens/errors/requests/screen.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';


final darkModeProvider = StateNotifierProvider<DarkNotifier, bool>(
    (ref) => DarkNotifier(false)..loadDarkModePreference());

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  //Initialize RevenueCat
  //await Purchases.setup(Platform.environment['REVENUECAT_API_KEY']);

  runApp(
    const ProviderScope(
      child: ErrorBoundary(
        child: Fuelify()
      ),
    )
  );
}

  // This widget is the root of the mobile application
class Fuelify extends ConsumerWidget {
  const Fuelify({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    var themeData = ref.watch(darkModeProvider)
      ? ThemeData.dark(useMaterial3: true)
      : ThemeData(
        useMaterial3: true,
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.black,
            foregroundColor: Colors.white
          )
        )
      );

    return MaterialApp.router(
        title: 'Fuelify',
        theme: themeData ,
        debugShowCheckedModeBanner: false,
        routerConfig: ApplicationRouter.router,
      );
    }
}