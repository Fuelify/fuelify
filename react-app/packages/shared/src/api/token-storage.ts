// Ported from: lib/providers/internals/authentication/repository.dart
// Platform-agnostic token storage interface.
// Web: use localStorage or secure cookies
// Mobile: use expo-secure-store or react-native-keychain

export interface TokenData {
  accessToken: string | null;
  refreshToken: string | null;
  expiryTime: Date | null;
}

export interface TokenStorage {
  storeTokens(accessToken: string, refreshToken: string, expiryTime: Date): Promise<void>;
  readTokens(): Promise<TokenData>;
  deleteTokens(): Promise<void>;
}

// In-memory fallback (for SSR or testing)
export class MemoryTokenStorage implements TokenStorage {
  private tokens: TokenData = { accessToken: null, refreshToken: null, expiryTime: null };

  async storeTokens(accessToken: string, refreshToken: string, expiryTime: Date): Promise<void> {
    this.tokens = { accessToken, refreshToken, expiryTime };
  }

  async readTokens(): Promise<TokenData> {
    return { ...this.tokens };
  }

  async deleteTokens(): Promise<void> {
    this.tokens = { accessToken: null, refreshToken: null, expiryTime: null };
  }
}

// localStorage-based storage for web
export class WebTokenStorage implements TokenStorage {
  async storeTokens(accessToken: string, refreshToken: string, expiryTime: Date): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('token_expiry', expiryTime.toISOString());
  }

  async readTokens(): Promise<TokenData> {
    if (typeof window === 'undefined') {
      return { accessToken: null, refreshToken: null, expiryTime: null };
    }
    const accessToken = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const expiryStr = localStorage.getItem('token_expiry');
    const expiryTime = expiryStr ? new Date(expiryStr) : null;
    return { accessToken, refreshToken, expiryTime };
  }

  async deleteTokens(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiry');
  }
}
