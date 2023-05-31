
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthenticationRepository {
  final FlutterSecureStorage secureStorage = const FlutterSecureStorage();

  Future<void> storeTokens(String accessToken, String refreshToken, DateTime expiryTime) async {
    await secureStorage.write(key: 'auth_token', value: accessToken);
    await secureStorage.write(key: 'refresh_token', value: refreshToken);
    await secureStorage.write(key: 'token_expiry', value: expiryTime.toIso8601String());
  }

  Future<Map<String, dynamic>> readTokens() async {
    String? accessToken = await secureStorage.read(key: 'auth_token');
    String? refreshToken = await secureStorage.read(key: 'refresh_token');
    String? expiryTimeString = await secureStorage.read(key: 'token_expiry');
    DateTime? expiryTime = expiryTimeString != null ? DateTime.tryParse(expiryTimeString) : null;
    
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'expiryTime': expiryTime
    };
  }

  Future<void> deleteTokens() async {
    await secureStorage.delete(key: 'auth_token');
    await secureStorage.delete(key: 'refresh_token');
    await secureStorage.delete(key: 'token_expiry');
  }
}
