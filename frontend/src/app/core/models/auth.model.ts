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

/** Shape returned by the auth microservice's /token and /refresh endpoints. */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  expiresIn: number;
}

export interface AuthResponse extends TokenResponse {
  user: User;
}
