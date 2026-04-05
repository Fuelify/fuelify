// Ported from: lib/models/errors.dart

export class AuthenticationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationException';
  }
}
