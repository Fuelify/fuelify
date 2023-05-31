import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:fuelify/providers/internals/authentication/model.dart';
import 'package:fuelify/providers/internals/authentication/repository.dart';

final authenticationServiceProvider = StateNotifierProvider<AuthenticationService, AuthenticationState>((ref) => AuthenticationService(AuthenticationRepository()));

class AuthenticationService extends StateNotifier<AuthenticationState> {
  final AuthenticationRepository authenticationRepository;
  
  AuthenticationService(this.authenticationRepository) : super(AuthenticationState()) {
    checkAuthenticationStatus();
  }

  // Used on app initialization to fetch authentication state from storage
  Future<AuthenticationState> checkAuthenticationStatus() async {
    Map<String, dynamic> tokens = await authenticationRepository.readTokens();
    String? accessToken = tokens['accessToken'];
    String? refreshToken = tokens['refreshToken'];
    DateTime? expiryTime = tokens['expiryTime'];
    
    if (accessToken != null && refreshToken != null && expiryTime != null && expiryTime.isAfter(DateTime.now())) {
      state = AuthenticationState(
        isAuthenticated: true, 
        accessToken: accessToken, 
        refreshToken: refreshToken, 
        tokenExpiryTime: expiryTime
      );
    } else {
      state = AuthenticationState();
    }
    return state;
  }

  Future<void> signIn(String accessToken, String refreshToken, DateTime expiryTime) async {
    // Store the token securely
    await authenticationRepository.storeTokens(accessToken, refreshToken, expiryTime);
    // Then update the state
    state = AuthenticationState(isAuthenticated: true, accessToken: accessToken, refreshToken: refreshToken, tokenExpiryTime: expiryTime);
  }

  Future<void> signOut() async {
    // Delete the token securely
    await authenticationRepository.deleteTokens();
    // Then update the state
    state = AuthenticationState(isAuthenticated: false);
  }
}
