import { Injectable } from '@angular/core';

/**
 * Holds the access token in memory only — never localStorage/sessionStorage,
 * so it can't be read by an XSS payload that persists across reloads. The
 * refresh token never reaches the client as JS-visible data at all: it's an
 * httpOnly cookie the browser sends automatically to /auth/refresh.
 *
 * Trade-off: a hard page reload loses the in-memory access token, so the app
 * has to call /auth/refresh (cookie-authenticated) to get a new one.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private accessToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  clear(): void {
    this.accessToken = null;
  }
}
