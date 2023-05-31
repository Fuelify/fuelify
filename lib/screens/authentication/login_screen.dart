import 'package:flutter/material.dart';
import 'package:fuelify/providers/authentication.dart';
import 'package:fuelify/providers/externals/userapi/repository.dart';
import 'package:fuelify/utils/validators.dart';
import 'package:fuelify/widgets/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class LoginScreen extends MaterialPage {
  LoginScreen() : super(child: _LoginScreen());
}

class _LoginScreen extends ConsumerStatefulWidget {

  @override
  ConsumerState<_LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<_LoginScreen> {
  final formKey = GlobalKey<FormState>();

  UserAPI userApi = UserAPI();

  String? _username, _password;
  
  @override
  Widget build(BuildContext context) {

    AuthenticationStatus autheticationStatus = ref.watch(authenticationControllerProvider);

    final usernameField = TextFormField(
      initialValue: "ethan@fuelify.com", //TODO REMOVE
      autofocus: false,
      //validator: validateEmail,
      validator: (value) =>
          validateEmail(value) != "Success" ? validateEmail(value) : null,
      onSaved: (value) => _username = value,
      decoration: buildInputDecoration("Email", Icons.email),
    );

    final passwordField = TextFormField(
      initialValue: "123", //TODO REMOVE
      autofocus: false,
      obscureText: true,
      validator: (value) => value!.isEmpty ? "Please enter password" : null,
      onSaved: (value) => _password = value,
      decoration: buildInputDecoration("Password", Icons.lock),
    );

    var loading = Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: const <Widget>[
        CircularProgressIndicator(),
        Text(" Authenticating ... Please wait")
      ],
    );

    final forgotLabel = Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: <Widget>[
        TextButton(
          child: const Text("Forgot password?",
              style: TextStyle(fontWeight: FontWeight.w300)),
          onPressed: () {
//            Navigator.pushReplacementNamed(context, '/reset-password');
          },
        ),
        TextButton(
          child: const Text("Sign up", style: TextStyle(fontWeight: FontWeight.w300)),
          onPressed: () {
            Navigator.pushReplacementNamed(context, '/register');
          },
        ),
      ],
    );

    doLogin() async {
      final form = formKey.currentState;

      form!.save();

      if (form.validate()) {
        print('logging in');
        var loginResponse = await userApi.login(
          {"email": _username ?? "", "password": _password ?? "", "provider": "FUELIFY"}
        );
        print(loginResponse);
        //final Future<Map<String, dynamic>> successfulMessage = ref.read(authenticationControllerProvider.notifier).login(_username ?? "", _password ?? "");
        Map<String,dynamic> responseData = loginResponse.data;
        if (responseData['statusCode'] == 200) {
          //User user = response['user'];
          //Provider.of<UserProvider>(context, listen: false).setUser(user); // set without triggering consumers to rebuild
          // Check user onboarding state to determine if onboarding needs to be displayed to user
          /*if (user.states.containsKey("Onboarded")) {
            if(user.states['Onboarded'] == true) { // go to home page
              context.goNamed('home');
            } else { // go to onboarding
              context.goNamed('onboarding');
              Navigator.pushReplacementNamed(context, '/onboarding/profile');
            }
          } else {
            Navigator.pushReplacementNamed(context, '/onboarding/profile');
          }*/
          if (responseData['data']['states']['Onboarded'] == true) {
            context.goNamed('home');
          } else {
            context.goNamed('onboarding/welcome');
          }
          
        } else {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text("Failed Login: ${responseData['message']}")));
        }
        
      } else {
        print(_username);
        print(_password);
        print("form is invalid");
      }
      
    }

    return SafeArea(
      child: Scaffold(
        body: SingleChildScrollView(
          child: Container(
            padding: const EdgeInsets.all(40.0),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 100.0),
                  label("Email"),
                  const SizedBox(height: 5.0),
                  usernameField,
                  const SizedBox(height: 20.0),
                  label("Password"),
                  const SizedBox(height: 5.0),
                  passwordField,
                  const SizedBox(height: 20.0),
                  autheticationStatus == AuthenticationStatus.authenticating
                      ? loading
                      : longButtons("Login", doLogin),
                  const SizedBox(height: 5.0),
                  forgotLabel
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}