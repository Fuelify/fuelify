import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class FoodScreen extends StatefulWidget {
  const FoodScreen({Key? key}) : super(key: key);

  @override
  State<FoodScreen> createState() => _FoodScreenState();
}

class _FoodScreenState extends State<FoodScreen> {
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
        title: const Text('Food'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Food Screen'),
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
