/*
  USER RESTful API Service Provider
*/

import 'package:dio/dio.dart';
import 'package:fuelify/models/errors.dart';
import 'package:fuelify/providers/externals/userapi/endpoints.dart';
import 'package:fuelify/providers/externals/userapi/model.dart';
import 'package:fuelify/providers/internals/authentication/model.dart';
import 'package:fuelify/providers/internals/authentication/repository.dart';
import 'package:fuelify/providers/internals/authentication/service.dart';


class UserAPI {
  Dio dio = Dio();
  final authenticationServiceProvider = AuthenticationService(AuthenticationRepository());

  UserAPI() {
    // Interceptor for injecting user access token in event where endpoint requires it (as defined in requiresAuthentication property)
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (options.extra["requiresAuthentication"] == true) {
            // Check authentication status
            AuthenticationState authenticationState = await authenticationServiceProvider.checkAuthenticationStatus();
            if (authenticationState.isAuthenticated) {
              // Inject access token
              String accessToken = authenticationState.accessToken;
              options.headers['Authorization'] = 'Bearer $accessToken';
              // Proceed with the request
              return handler.next(options);
            } else {
              // Cancel the request, throw authentication error
              handler.reject(DioError(
                requestOptions: options,
                error: AuthenticationException().code,
              ));
            }
          } else { // no need to add access token to header of request
            // Proceed with the request
            return handler.next(options);
          }
        },
      ),
    );
  }

  // Generic utility request method for constructing request based on ApiEndpoint and (optionally) data provided
  Future<Response> request({
    required ApiEndpoint endpoint,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? data,
  }) async {
    Options options = Options(
      method: endpoint.method,
      extra: {
        "requiresAuthentication": endpoint.requiresAuthentication,
      },
    );

    final response = await dio.request(
      endpoint.url,
      queryParameters: queryParameters,
      options: options,
      data: data,
    );

    return response;
  }

  /*   =========================================================================================================  */

  // [POST] Login user
  Future<Response> login(Map<String, String> credentials) async {
    /*
      credentials = {
        "email": "user@fuelify.com",
        "password": "Fuelify1!",
        "provider": "FUELIFY"
      }
    */
    
    final response = await request(
      endpoint: UserApiEndpoints.login,
      data: credentials
    );
    
    if (response.statusCode == 200) {
      return response;
    } else {
      throw Exception('Failed to login user');
    }
  }

  // [POST] Logout user
  Future<Response> logout(Map<String, String> credentials) async {
    /*
      credentials = {
        "email": "user@fuelify.com",
        "password": "Fuelify1!",
        "provider": "FUELIFY"
      }
    */
    final response = await request(
      endpoint: UserApiEndpoints.logout,
      data: credentials
    );

    if (response.statusCode == 200) {
      return response;
    } else {
      throw Exception('Failed to login user');
    }
  }

  // [GET] User
  Future<Response> getUser() async {
    final response = await request(
      endpoint: UserApiEndpoints.getUser
    );
    if (response.statusCode == 200) {
      return response.data;
    } else {
      throw Exception('Failed to get user');
    }
  }

  // [GET] User
  Future<Response> getMealPlan(String startDate, String endDate) async {
    final response = await request(
      endpoint: UserApiEndpoints.getMealPlan,
      queryParameters: {
        'start': startDate, 
        'end': endDate
      }
    );
    if (response.statusCode == 200) {
      return response;
    } else {
      throw Exception('Failed to get meal plan');
    }
  }

  // .... add more endpoints here

}
