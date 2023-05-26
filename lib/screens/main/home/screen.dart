import 'package:flutter/material.dart';
import 'package:fuelify/models/user.dart';
import 'package:fuelify/providers/user.dart';
import 'package:fuelify/providers/authentication.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:fuelify/widgets/widgets.dart';
import 'package:fuelify/widgets/navigationbars.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    //User user = Provider.of<UserProvider>(context).user;
    //AuthenticationProvider auth = Provider.of<AuthenticationProvider>(context);
    //final navbar = context.read(navbarProvider);

    /*var requestTokenTest = () async {
      final Map<String, dynamic> requestMessage = await auth.tokentest();
      print(requestMessage);
    };*/

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Home Screen'),
            ElevatedButton.icon(
              onPressed: () {
                GoRouter.of(context).push('/login');
              }, 
              icon: const Icon(Icons.next_plan), 
              label: const Text('Product Detail'),
            )
          ],
        ),
      )
    );
  }
}
