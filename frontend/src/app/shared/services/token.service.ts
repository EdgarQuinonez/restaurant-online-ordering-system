import { Injectable, signal, inject } from '@angular/core';
import { LocalStorageService } from './local-storage.service';

export interface TokenData {
  token: string;
  expiresAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly localStorageService = inject(LocalStorageService);

  private readonly TOKEN_KEY = 'auth_token';
  private readonly EXPIRY_KEY = 'token_expiry';

  private readonly token = signal<string | null>(this.getStoredToken());
  private readonly expiry = signal<number | null>(this.getStoredExpiry());

  readonly hasValidToken = signal(this.checkTokenValidity());
  readonly isExpired = signal(this.checkTokenExpiry());

  setToken(token: string, expiresIn?: number): void {
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null;

    this.token.set(token);
    this.expiry.set(expiresAt);

    this.storeToken(token);
    if (expiresAt) {
      this.storeExpiry(expiresAt);
    }

    this.hasValidToken.set(true);
    this.isExpired.set(false);
  }

  getToken(): string | null {
    return this.token();
  }

  getExpiry(): number | null {
    return this.expiry();
  }

  clearToken(): void {
    this.token.set(null);
    this.expiry.set(null);
    this.hasValidToken.set(false);
    this.isExpired.set(false);

    this.removeStoredToken();
    this.removeStoredExpiry();
  }

  validateToken(): boolean {
    const isValid = this.checkTokenValidity();
    this.hasValidToken.set(isValid);
    this.isExpired.set(!isValid);
    return isValid;
  }

  private getStoredToken(): string | null {
    return this.localStorageService.getItem<string>(this.TOKEN_KEY);
  }

  private getStoredExpiry(): number | null {
    return this.localStorageService.getItem<number>(this.EXPIRY_KEY);
  }

  private storeToken(token: string): void {
    this.localStorageService.setItem(this.TOKEN_KEY, token);
  }

  private storeExpiry(expiry: number): void {
    this.localStorageService.setItem(this.EXPIRY_KEY, expiry);
  }

  private removeStoredToken(): void {
    this.localStorageService.removeItem(this.TOKEN_KEY);
  }

  private removeStoredExpiry(): void {
    this.localStorageService.removeItem(this.EXPIRY_KEY);
  }

  private checkTokenValidity(): boolean {
    const token = this.token();
    if (!token) {
      return false;
    }

    return !this.checkTokenExpiry();
  }

  private checkTokenExpiry(): boolean {
    const expiry = this.expiry();
    if (!expiry) {
      return false; // No expiry means token doesn't expire
    }

    return Date.now() >= expiry;
  }

  // Utility method to decode token payload (if JWT)
  decodeToken<T = unknown>(): T | null {
    const token = this.token();
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }

      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded) as T;
    } catch {
      return null;
    }
  }

  // Method to get token data with expiry information
  getTokenData(): TokenData | null {
    const token = this.token();
    if (!token) {
      return null;
    }

    return {
      token,
      expiresAt: this.expiry() ?? undefined,
    };
  }

  // Method to refresh token (useful for automatic token refresh)
  refreshToken(newToken: string, expiresIn?: number): void {
    this.setToken(newToken, expiresIn);
  }

  // Method to check if token will expire soon (useful for proactive refresh)
  willExpireSoon(thresholdMs: number = 5 * 60 * 1000): boolean {
    const expiry = this.expiry();
    if (!expiry) {
      return false;
    }

    return expiry - Date.now() <= thresholdMs;
  }
}
