import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, TokenResponse } from '../models/auth.model';
import { User } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** Current user, or null when signed out. Populated from /auth/me on app start / after login. */
  private readonly currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, request, { withCredentials: true })
      .pipe(tap((res) => this.setSession(res)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, request, { withCredentials: true })
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Re-hydrates the current user from a stored access token, e.g. on app bootstrap or page refresh. */
  loadCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/me`)
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  /** Exchanges the httpOnly refresh cookie (sent automatically) for a new access token. */
  refreshToken(): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(tap((res) => this.tokenStorage.setAccessToken(res.accessToken)));
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout(): void {
    this.tokenStorage.clear();
    this.currentUserSignal.set(null);
    // The dashboard is public, so signing out just turns the visitor into a guest.
    this.router.navigateByUrl('/dashboard');
  }

  private setSession(res: AuthResponse): void {
    this.tokenStorage.setAccessToken(res.accessToken);
    this.currentUserSignal.set(res.user);
  }
}
