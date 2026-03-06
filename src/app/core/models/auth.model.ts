export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
}

export interface AuthToken {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}
