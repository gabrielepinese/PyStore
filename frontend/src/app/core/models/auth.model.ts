import { User } from './user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

/**
 * Shape returned by the auth microservice's /login, /register and /refresh
 * endpoints. The refresh token itself is never in this body — it's set as
 * an httpOnly cookie the browser manages, invisible to JS.
 */
export interface TokenResponse {
  accessToken: string;
  tokenType: 'bearer';
  expiresIn: number;
}

export interface AuthResponse extends TokenResponse {
  user: User;
}
