import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
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
        title: const Text('Profile'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Profile Screen'),
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
