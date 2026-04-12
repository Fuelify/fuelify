// API client — DynamoDB-backed endpoints only (auth & user settings)
// Meal plans, recipes, and food data are handled by Supabase repositories.

import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ApiEndpoint } from './endpoints';
import type { TokenStorage } from './token-storage';

export class ApiClient {
  private client: AxiosInstance;
  private tokenStorage: TokenStorage;

  constructor(tokenStorage: TokenStorage) {
    this.tokenStorage = tokenStorage;
    this.client = axios.create();

    // Interceptor: inject bearer token for authenticated endpoints
    this.client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const requiresAuth = config.headers?.['X-Requires-Auth'] === 'true';
      delete config.headers['X-Requires-Auth'];

      if (requiresAuth) {
        const tokens = await this.tokenStorage.readTokens();
        if (tokens.accessToken && tokens.expiryTime && tokens.expiryTime > new Date()) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        } else {
          return Promise.reject(new Error('AuthenticationException: Token expired or missing'));
        }
      }

      return config;
    });
  }

  // Generic request method
  async request<T = unknown>(options: {
    endpoint: ApiEndpoint;
    queryParams?: Record<string, string>;
    data?: Record<string, unknown>;
  }): Promise<AxiosResponse<T>> {
    const { endpoint, queryParams, data } = options;

    return this.client.request<T>({
      url: endpoint.url,
      method: endpoint.method,
      params: queryParams,
      data,
      headers: {
        'X-Requires-Auth': String(endpoint.requiresAuthentication),
      },
    });
  }

  // === DynamoDB-backed methods (auth & user settings) ===

  async login(credentials: { email: string; password: string; provider?: string }): Promise<AxiosResponse> {
    const { Endpoints } = await import('./endpoints');
    const response = await this.request({
      endpoint: Endpoints.login,
      data: { ...credentials, provider: credentials.provider ?? 'FUELIFY' },
    });
    if (response.status !== 200) throw new Error('Failed to login user');
    return response;
  }

  async logout(): Promise<AxiosResponse> {
    const { Endpoints } = await import('./endpoints');
    const response = await this.request({ endpoint: Endpoints.logout });
    if (response.status !== 200) throw new Error('Failed to logout user');
    return response;
  }

  async getUser(): Promise<AxiosResponse> {
    const { Endpoints } = await import('./endpoints');
    const response = await this.request({ endpoint: Endpoints.getUser });
    if (response.status !== 200) throw new Error('Failed to get user');
    return response;
  }

  async updateProfile(profileData: Record<string, unknown>): Promise<AxiosResponse> {
    const { Endpoints } = await import('./endpoints');
    return this.request({ endpoint: Endpoints.updateProfile, data: profileData });
  }

  async updateOnboardingState(stateData: Record<string, unknown>): Promise<AxiosResponse> {
    const { Endpoints } = await import('./endpoints');
    return this.request({ endpoint: Endpoints.updateOnboardingState, data: stateData });
  }
}
