import 'dart:convert' as convert;
import 'package:http/http.dart' as http;
import 'package:fuelify/dependencies/endpoints.dart';

class Network {
  
  void requestLogin(Map<String, dynamic> requestBody) async {
    // This queries the API endpoint /login about http.
    var url = Uri.parse(AppUrl.login);

    // Await the http get response, then decode the json-formatted response.
    var response = await http.post(
      url,
      headers: {'content-type': 'application/json'}, 
      body: convert.jsonEncode(requestBody)
    );

    // Check response status
    if (response.statusCode == 200) {
      var jsonResponse =
          convert.jsonDecode(response.body) as Map<String, dynamic>;
      var token = jsonResponse['token'];
      print('Success, user auth token returned: $token.');
    } else {
      print(response.body);
      print('Request failed with status: ${response.statusCode}.');
    }

  }
}
