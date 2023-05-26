class AuthenticationState {
  final bool isAuthenticated;
  final String accessToken;
  final String refreshToken;
  final DateTime tokenExpiryTime;

  AuthenticationState({
    this.isAuthenticated = false,
    this.accessToken = '',
    this.refreshToken = '',
    DateTime? tokenExpiryTime,
  }) : tokenExpiryTime = tokenExpiryTime ?? DateTime.now();
}