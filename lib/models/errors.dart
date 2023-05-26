class AuthenticationException implements Exception {
  final String message;
  final int code;

  AuthenticationException({
    this.code = 401,
    this.message = 'User is not authenticated.'
  });
}